//! Idempotent mesh packet ingestion.
//!
//! The ingestion pipeline:
//! 1. Decode base64 → raw CBOR bytes
//! 2. Validate size (before parsing)
//! 3. Deserialize CBOR → MeshPacketV1
//! 4. Validate structure (version, TTL, expiry, field lengths)
//! 5. Verify Ed25519 signature
//! 6. Check dedup cache (packet_id already seen?)
//! 7. Persist packet + create incident if applicable
//! 8. Return per-packet results
//!
//! Duplicate packet_ids produce a `Duplicate` result (200 OK), not an
//! error — this is idempotent ingestion per project spec.

use base64::Engine;
use chrono::{DateTime, TimeZone, Utc};
use disaster_mesh_protocol::{
    validate_packet, verify_packet_signature, MeshPacketV1,
};
use disaster_mesh_protocol::validation::validate_packet_size;
use sqlx::PgPool;
use tracing::{debug, warn};
use uuid::Uuid;

use crate::error::AppError;
use crate::models::packet::{IngestResult, IngestStatus};

/// Process a batch of base64-encoded CBOR packets from a gateway.
pub async fn ingest_packets(
    db: &PgPool,
    gateway_id: &str,
    packets_b64: &[String],
    max_packet_size: usize,
) -> Result<Vec<IngestResult>, AppError> {
    let mut results = Vec::with_capacity(packets_b64.len());

    for packet_b64 in packets_b64 {
        let result = ingest_single_packet(db, gateway_id, packet_b64, max_packet_size).await;
        results.push(result);
    }

    Ok(results)
}

/// Ingest a single packet through the full pipeline.
async fn ingest_single_packet(
    db: &PgPool,
    gateway_id: &str,
    packet_b64: &str,
    max_packet_size: usize,
) -> IngestResult {
    // Step 1: Decode base64
    let raw_cbor = match base64::engine::general_purpose::STANDARD.decode(packet_b64) {
        Ok(bytes) => bytes,
        Err(e) => {
            return IngestResult {
                packet_id: String::new(),
                status: IngestStatus::Rejected,
                incident_id: None,
                error: Some(format!("base64 decode failed: {e}")),
            };
        }
    };

    // Step 2: Validate size before parsing
    if raw_cbor.len() > max_packet_size {
        return IngestResult {
            packet_id: String::new(),
            status: IngestStatus::Rejected,
            incident_id: None,
            error: Some(format!(
                "packet size {} exceeds maximum {}",
                raw_cbor.len(),
                max_packet_size
            )),
        };
    }
    if let Err(e) = validate_packet_size(&raw_cbor) {
        return IngestResult {
            packet_id: String::new(),
            status: IngestStatus::Rejected,
            incident_id: None,
            error: Some(e.to_string()),
        };
    }

    // Step 3: Deserialize CBOR
    let packet = match MeshPacketV1::from_cbor(&raw_cbor) {
        Ok(p) => p,
        Err(e) => {
            return IngestResult {
                packet_id: String::new(),
                status: IngestStatus::Rejected,
                incident_id: None,
                error: Some(format!("CBOR decode failed: {e}")),
            };
        }
    };

    let packet_id_hex = hex::encode(&packet.packet_id);

    // Step 4: Validate structure
    if let Err(errors) = validate_packet(&packet) {
        let error_msgs: Vec<String> = errors.iter().map(|e| e.to_string()).collect();
        warn!(
            packet_id = %packet_id_hex,
            errors = ?error_msgs,
            "packet validation failed"
        );
        return IngestResult {
            packet_id: packet_id_hex,
            status: IngestStatus::Rejected,
            incident_id: None,
            error: Some(format!("validation failed: {}", error_msgs.join("; "))),
        };
    }

    // Step 5: Verify signature
    let signature_valid = verify_packet_signature(&packet).is_ok();
    if !signature_valid {
        warn!(packet_id = %packet_id_hex, "signature verification failed");
        // We still persist the packet for audit, but mark it as invalid
    }

    // Step 6: Check dedup cache
    let already_seen = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM dedup_cache WHERE packet_id = $1)"
    )
    .bind(&packet.packet_id)
    .fetch_one(db)
    .await
    .unwrap_or(false);

    if already_seen {
        debug!(packet_id = %packet_id_hex, "duplicate packet — idempotent skip");
        return IngestResult {
            packet_id: packet_id_hex,
            status: IngestStatus::Duplicate,
            incident_id: None,
            error: None,
        };
    }

    // Step 7: Persist within a transaction
    let mut tx = match db.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            return IngestResult {
                packet_id: packet_id_hex,
                status: IngestStatus::Rejected,
                incident_id: None,
                error: Some(format!("transaction failed: {e}")),
            };
        }
    };

    // Insert into dedup cache
    if let Err(e) = sqlx::query(
        "INSERT INTO dedup_cache (packet_id, gateway_id) VALUES ($1, $2) ON CONFLICT DO NOTHING"
    )
    .bind(&packet.packet_id)
    .bind(gateway_id)
    .execute(&mut *tx)
    .await
    {
        warn!(packet_id = %packet_id_hex, error = %e, "dedup cache insert failed");
    }

    // Create incident if this is an SOS or issue report with a valid signature
    let incident_id = if packet.message_type.creates_incident() && signature_valid {
        match create_incident_from_packet(&mut tx, &packet).await {
            Ok(id) => Some(id),
            Err(e) => {
                warn!(packet_id = %packet_id_hex, error = %e, "incident creation failed");
                None
            }
        }
    } else {
        None
    };

    // Convert timestamps
    let pkt_created = timestamp_to_datetime(packet.created_at);
    let pkt_expires = timestamp_to_datetime(packet.expires_at);

    // Insert packet record
    let insert_result = sqlx::query(
        r#"
        INSERT INTO packets (
            packet_id, protocol_version, origin_id, destination_scope,
            message_type, priority, ttl, hop_count, payload_kind,
            payload_encrypted, signature, signature_valid,
            packet_created_at, packet_expires_at, gateway_id,
            raw_cbor, incident_id
        ) VALUES (
            $1, $2, $3, $4, $5::message_type_enum, $6::priority_level,
            $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        )
        ON CONFLICT (packet_id) DO NOTHING
        "#,
    )
    .bind(&packet.packet_id)
    .bind(packet.version as i16)
    .bind(&packet.origin_id)
    .bind(packet.destination_scope as u8 as i16)
    .bind(packet.message_type.as_db_str())
    .bind(packet.priority.as_db_str())
    .bind(packet.ttl as i16)
    .bind(packet.hop_count as i16)
    .bind(packet.payload_kind as u8 as i16)
    .bind(&packet.payload)
    .bind(&packet.auth_tag)
    .bind(signature_valid)
    .bind(pkt_created)
    .bind(pkt_expires)
    .bind(gateway_id)
    .bind(&raw_cbor)
    .bind(incident_id)
    .execute(&mut *tx)
    .await;

    match insert_result {
        Ok(_) => {
            if let Err(e) = tx.commit().await {
                return IngestResult {
                    packet_id: packet_id_hex,
                    status: IngestStatus::Rejected,
                    incident_id: None,
                    error: Some(format!("commit failed: {e}")),
                };
            }
            debug!(
                packet_id = %packet_id_hex,
                signature_valid,
                incident_id = ?incident_id,
                "packet ingested successfully"
            );
            IngestResult {
                packet_id: packet_id_hex,
                status: IngestStatus::Accepted,
                incident_id,
                error: None,
            }
        }
        Err(e) => {
            let _ = tx.rollback().await;
            IngestResult {
                packet_id: packet_id_hex,
                status: IngestStatus::Rejected,
                incident_id: None,
                error: Some(format!("persistence failed: {e}")),
            }
        }
    }
}

/// Create an incident from an SOS or issue-report packet.
async fn create_incident_from_packet(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    packet: &MeshPacketV1,
) -> Result<Uuid, AppError> {
    let incident_id: Uuid = sqlx::query_scalar(
        r#"
        INSERT INTO incidents (origin_id, message_type, priority)
        VALUES ($1, $2::message_type_enum, $3::priority_level)
        RETURNING id
        "#,
    )
    .bind(&packet.origin_id)
    .bind(packet.message_type.as_db_str())
    .bind(packet.priority.as_db_str())
    .fetch_one(&mut **tx)
    .await?;

    Ok(incident_id)
}

/// Convert a Unix timestamp (seconds) to a chrono DateTime.
fn timestamp_to_datetime(ts: u64) -> DateTime<Utc> {
    Utc.timestamp_opt(ts as i64, 0)
        .single()
        .unwrap_or_else(Utc::now)
}
