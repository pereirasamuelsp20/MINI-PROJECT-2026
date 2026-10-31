# ── Stage 1: Build ──────────────────────────────────────────
FROM rust:1.82-slim-bookworm AS builder

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends pkg-config libssl-dev && \
    rm -rf /var/lib/apt/lists/*

# Copy manifests first for Docker layer caching of dependencies
COPY Cargo.toml ./
COPY crates/protocol/Cargo.toml crates/protocol/
COPY crates/server/Cargo.toml crates/server/

# Create minimal source stubs so `cargo build` downloads + compiles deps
RUN mkdir -p crates/protocol/src crates/server/src && \
    echo "pub fn _stub() {}" > crates/protocol/src/lib.rs && \
    echo "fn main() { println!(\"stub\"); }" > crates/server/src/main.rs

RUN cargo build --release 2>/dev/null || true

# Now copy real source and rebuild (only changed sources recompile)
COPY crates/ crates/
COPY migrations/ migrations/

# Touch source files to invalidate the stub cache
RUN touch crates/protocol/src/lib.rs crates/server/src/main.rs
RUN cargo build --release

# ── Stage 2: Runtime ────────────────────────────────────────
FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates libssl3 && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd --gid 1001 mesh && \
    useradd --uid 1001 --gid mesh --shell /bin/false mesh

COPY --from=builder /app/target/release/disaster-mesh-server /usr/local/bin/
COPY --from=builder /app/migrations /app/migrations

USER mesh
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["/usr/local/bin/disaster-mesh-server", "--health-check"] || exit 1

CMD ["disaster-mesh-server"]
