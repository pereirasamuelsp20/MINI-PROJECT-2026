-- Disaster Mesh Backend — Initial Schema
-- Requires PostgreSQL 16+ with PostGIS 3.4+

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE incident_status AS ENUM (
    'pending',       -- received, awaiting operator verification
    'verified',      -- operator confirmed real incident
    'dispatched',    -- responder assigned
    'in_progress',   -- responder en route or on scene
    'resolved',      -- incident resolved
    'rejected',      -- operator rejected (false report, duplicate, etc.)
    'expired'        -- auto-expired without operator action
);

CREATE TYPE message_type_enum AS ENUM (
    'sos',
    'sos_ack',
    'issue_report',
    'status_update',
    'gateway_receipt',
    'location_update'
);

CREATE TYPE priority_level AS ENUM (
    'critical',
    'high',
    'normal',
    'low'
);

CREATE TYPE dispatch_status AS ENUM (
    'assigned',
    'accepted',
    'en_route',
    'on_scene',
    'completed',
    'cancelled'
);

CREATE TYPE user_role AS ENUM (
    'admin',
    'operator',
    'responder'
);

-- ============================================================
-- TABLES (ordered to satisfy foreign-key dependencies)
-- ============================================================

-- Operators, responders, admins
-- No PII beyond operational minimum per privacy rules.
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username        VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(512) NOT NULL,
    role            user_role NOT NULL DEFAULT 'operator',
    display_name    VARCHAR(255),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Gateway authentication keys
-- key_hash is HMAC-SHA256 of the plaintext key; plaintext is never stored.
CREATE TABLE api_keys (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_hash        VARCHAR(512) NOT NULL UNIQUE,
    gateway_id      VARCHAR(255) UNIQUE NOT NULL,
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_used_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ
);

-- Incidents (SOS / issue reports) — created first so packets can reference
CREATE TABLE incidents (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    origin_id           BYTEA NOT NULL,            -- pseudonymous mesh origin
    message_type        message_type_enum NOT NULL,
    priority            priority_level NOT NULL DEFAULT 'normal',
    status              incident_status NOT NULL DEFAULT 'pending',
    title               VARCHAR(500),
    description         TEXT,
    verified_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at         TIMESTAMPTZ,
    resolved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ingested mesh packets (idempotent store, keyed on mesh packet_id)
-- raw_cbor retained for audit; payload_encrypted is never decrypted by relays.
CREATE TABLE packets (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    packet_id           BYTEA UNIQUE NOT NULL,     -- mesh-layer idempotency key
    protocol_version    SMALLINT NOT NULL,
    origin_id           BYTEA NOT NULL,
    destination_scope   SMALLINT NOT NULL,
    message_type        message_type_enum NOT NULL,
    priority            priority_level NOT NULL,
    ttl                 SMALLINT NOT NULL,
    hop_count           SMALLINT NOT NULL,
    payload_kind        SMALLINT NOT NULL,
    payload_encrypted   BYTEA NOT NULL,
    signature           BYTEA NOT NULL,
    signature_valid     BOOLEAN NOT NULL,
    packet_created_at   TIMESTAMPTZ NOT NULL,
    packet_expires_at   TIMESTAMPTZ NOT NULL,
    ingested_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    gateway_id          VARCHAR(255),
    raw_cbor            BYTEA NOT NULL,
    incident_id         UUID REFERENCES incidents(id) ON DELETE SET NULL
);

-- Back-reference: which packet originated this incident
ALTER TABLE incidents
    ADD COLUMN source_packet_id UUID REFERENCES packets(id) ON DELETE SET NULL;

-- Incident locations with uncertainty metadata
-- geom is auto-computed from lat/lon via trigger (see below).
CREATE TABLE incident_locations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id         UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    latitude            DOUBLE PRECISION NOT NULL,
    longitude           DOUBLE PRECISION NOT NULL,
    accuracy_meters     DOUBLE PRECISION NOT NULL,   -- uncertainty radius
    altitude_meters     DOUBLE PRECISION,
    source              VARCHAR(50) NOT NULL
                        CHECK (source IN ('gps', 'network', 'ble_estimate', 'manual', 'unknown')),
    geom                GEOMETRY(Point, 4326),
    captured_at         TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Responder dispatch assignments
CREATE TABLE dispatches (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id         UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    responder_id        UUID NOT NULL REFERENCES users(id),
    status              dispatch_status NOT NULL DEFAULT 'assigned',
    notes               TEXT,
    assigned_by         UUID NOT NULL REFERENCES users(id),
    assigned_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at         TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Immutable audit trail
-- metadata must NEVER contain payloads, tokens, private keys, or precise locations.
CREATE TABLE audit_log (
    id                  BIGSERIAL PRIMARY KEY,
    occurred_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id            UUID,
    actor_type          VARCHAR(50) NOT NULL,        -- 'user', 'gateway', 'system'
    action              VARCHAR(100) NOT NULL,
    resource_type       VARCHAR(100) NOT NULL,
    resource_id         VARCHAR(255),
    metadata            JSONB,
    ip_address          INET
);

-- Server-side deduplication window for ingestion
CREATE TABLE dedup_cache (
    packet_id           BYTEA PRIMARY KEY,
    first_seen_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    gateway_id          VARCHAR(255)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_packets_origin           ON packets(origin_id);
CREATE INDEX idx_packets_message_type     ON packets(message_type);
CREATE INDEX idx_packets_ingested_at      ON packets(ingested_at);
CREATE INDEX idx_packets_expires_at       ON packets(packet_expires_at);
CREATE INDEX idx_packets_incident         ON packets(incident_id);

CREATE INDEX idx_incidents_status         ON incidents(status);
CREATE INDEX idx_incidents_priority       ON incidents(priority);
CREATE INDEX idx_incidents_created_at     ON incidents(created_at);
CREATE INDEX idx_incidents_origin         ON incidents(origin_id);

CREATE INDEX idx_locations_incident       ON incident_locations(incident_id);
CREATE INDEX idx_locations_geom           ON incident_locations USING GIST(geom);

CREATE INDEX idx_dispatches_incident      ON dispatches(incident_id);
CREATE INDEX idx_dispatches_responder     ON dispatches(responder_id);
CREATE INDEX idx_dispatches_status        ON dispatches(status);

CREATE INDEX idx_audit_occurred_at        ON audit_log(occurred_at);
CREATE INDEX idx_audit_actor              ON audit_log(actor_id);
CREATE INDEX idx_audit_resource           ON audit_log(resource_type, resource_id);

CREATE INDEX idx_dedup_first_seen         ON dedup_cache(first_seen_at);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-compute PostGIS geometry from lat/lon on insert/update
CREATE OR REPLACE FUNCTION compute_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_location_geom
    BEFORE INSERT OR UPDATE ON incident_locations
    FOR EACH ROW EXECUTE FUNCTION compute_geom();

-- Auto-update updated_at timestamp on row modification
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_incidents_updated
    BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_dispatches_updated
    BEFORE UPDATE ON dispatches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
