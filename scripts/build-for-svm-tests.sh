# Build and run tests with the test-admin feature enabled so admin checks are relaxed in tests.
ANCHOR_FEATURES="--features test-admin"

anchor build -- --features test-admin
cargo build-sbf --manifest-path=./Cargo.toml --sbf-out-dir=target/deploy --features test-admin