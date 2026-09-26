-- Simplified schema for standard PostgreSQL (no PostGIS, no TimescaleDB)

-- Camera registry
CREATE TABLE IF NOT EXISTS cameras (
    camera_id      TEXT PRIMARY KEY,
    lat            DOUBLE PRECISION NOT NULL,
    lon            DOUBLE PRECISION NOT NULL,
    zone           TEXT,
    direction      TEXT,
    status         TEXT DEFAULT 'online',
    stream_url     TEXT,
    installed_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cameras_zone ON cameras (zone);
CREATE INDEX IF NOT EXISTS idx_cameras_status ON cameras (status);

-- Plate sightings
CREATE TABLE IF NOT EXISTS plate_sightings (
    id             BIGSERIAL PRIMARY KEY,
    plate_text     TEXT NOT NULL,
    normalized_plate TEXT,
    camera_id      TEXT REFERENCES cameras(camera_id),
    confidence     REAL,
    snapshot_url   TEXT,
    bbox           JSONB,
    ts             TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plate_sightings_plate_text ON plate_sightings (plate_text);
CREATE INDEX IF NOT EXISTS idx_plate_sightings_camera_id ON plate_sightings (camera_id);
CREATE INDEX IF NOT EXISTS idx_plate_sightings_ts ON plate_sightings (ts DESC);
CREATE INDEX IF NOT EXISTS idx_plate_sightings_normalized_plate ON plate_sightings (normalized_plate);
CREATE INDEX IF NOT EXISTS idx_plate_sightings_plate_ts ON plate_sightings (plate_text, ts);
CREATE INDEX IF NOT EXISTS idx_plate_sightings_camera_ts ON plate_sightings (camera_id, ts);

-- Blacklist
CREATE TABLE IF NOT EXISTS blacklist (
    plate_text  TEXT PRIMARY KEY,
    normalized_plate TEXT,
    reason      TEXT,
    added_by    TEXT,
    added_at    TIMESTAMPTZ DEFAULT now(),
    expires_at  TIMESTAMPTZ,
    is_active   BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_blacklist_normalized ON blacklist (normalized_plate);
CREATE INDEX IF NOT EXISTS idx_blacklist_active ON blacklist (is_active);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
    id           BIGSERIAL PRIMARY KEY,
    plate_text   TEXT,
    camera_id    TEXT REFERENCES cameras(camera_id),
    alert_type   TEXT,
    severity     TEXT,
    status       TEXT DEFAULT 'new',
    details      JSONB,
    created_at   TIMESTAMPTZ DEFAULT now(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at  TIMESTAMPTZ,
    resolved_by  TEXT,
    note         TEXT
);

CREATE INDEX IF NOT EXISTS idx_alerts_plate_text ON alerts (plate_text);
CREATE INDEX IF NOT EXISTS idx_alerts_camera_id ON alerts (camera_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts (status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts (severity);

-- Users & roles
CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    name       TEXT,
    email      TEXT UNIQUE,
    password_hash TEXT,
    role       TEXT,
    is_active  BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Camera metrics
CREATE TABLE IF NOT EXISTS camera_metrics (
    id           BIGSERIAL PRIMARY KEY,
    camera_id    TEXT REFERENCES cameras(camera_id),
    metric_type  TEXT,
    value        REAL,
    ts           TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_camera_metrics_camera_type_ts ON camera_metrics (camera_id, metric_type, ts);

-- Analytics tables (pre-computed for dashboard performance)
CREATE TABLE IF NOT EXISTS analytics_density (
    id            BIGSERIAL PRIMARY KEY,
    camera_id     TEXT REFERENCES cameras(camera_id),
    zone          TEXT,
    vehicle_count INTEGER,
    bucket_start  TIMESTAMPTZ NOT NULL,
    bucket_end    TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_density_camera_bucket ON analytics_density (camera_id, bucket_start);
CREATE INDEX IF NOT EXISTS idx_analytics_density_zone_bucket ON analytics_density (zone, bucket_start);

CREATE TABLE IF NOT EXISTS analytics_od_matrix (
    id              BIGSERIAL PRIMARY KEY,
    origin_camera   TEXT REFERENCES cameras(camera_id),
    origin_zone     TEXT,
    dest_camera     TEXT REFERENCES cameras(camera_id),
    dest_zone       TEXT,
    vehicle_count   INTEGER,
    bucket_start    TIMESTAMPTZ NOT NULL,
    bucket_end      TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_od_origin_bucket ON analytics_od_matrix (origin_camera, bucket_start);
CREATE INDEX IF NOT EXISTS idx_analytics_od_dest_bucket ON analytics_od_matrix (dest_camera, bucket_start);

CREATE TABLE IF NOT EXISTS analytics_congestion (
    id              BIGSERIAL PRIMARY KEY,
    camera_id       TEXT REFERENCES cameras(camera_id),
    zone            TEXT,
    density_score   REAL,
    avg_speed       REAL,
    congestion_level TEXT,
    z_score         REAL,
    bucket_start    TIMESTAMPTZ NOT NULL,
    bucket_end      TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_congestion_camera_bucket ON analytics_congestion (camera_id, bucket_start);

CREATE TABLE IF NOT EXISTS analytics_heatmap (
    id            BIGSERIAL PRIMARY KEY,
    h3_index      TEXT,
    vehicle_count INTEGER,
    bucket_start  TIMESTAMPTZ NOT NULL,
    bucket_end    TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_heatmap_h3_bucket ON analytics_heatmap (h3_index, bucket_start);

-- Insert demo cameras (Ahmedabad/Anand area coordinates)
INSERT INTO cameras (camera_id, lat, lon, zone, direction, status, stream_url) VALUES
('CAM001', 23.0225, 72.5714, 'Zone-A', 'Northbound', 'online', 'simulated'),
('CAM002', 23.0300, 72.5800, 'Zone-A', 'Southbound', 'online', 'simulated'),
('CAM003', 23.0400, 72.5900, 'Zone-B', 'Eastbound', 'online', 'simulated'),
('CAM004', 23.0500, 72.6000, 'Zone-B', 'Westbound', 'online', 'simulated'),
('CAM005', 23.0600, 72.6100, 'Zone-C', 'Northbound', 'online', 'simulated'),
('CAM006', 23.0700, 72.6200, 'Zone-C', 'Southbound', 'online', 'simulated'),
('CAM007', 23.0800, 72.6300, 'Zone-D', 'Eastbound', 'online', 'simulated'),
('CAM008', 23.0900, 72.6400, 'Zone-D', 'Westbound', 'online', 'simulated'),
('CAM009', 23.1000, 72.6500, 'Zone-E', 'Northbound', 'online', 'simulated'),
('CAM010', 23.1100, 72.6600, 'Zone-E', 'Southbound', 'online', 'simulated'),
('CAM011', 23.1200, 72.6700, 'Zone-F', 'Eastbound', 'online', 'simulated'),
('CAM012', 23.1300, 72.6800, 'Zone-F', 'Westbound', 'online', 'simulated')
ON CONFLICT (camera_id) DO NOTHING;

-- Insert demo blacklist plates
INSERT INTO blacklist (plate_text, normalized_plate, reason, added_by) VALUES
('GJ01AB1234', 'GJ01AB1234', 'Stolen Vehicle', 'admin'),
('MH12CD5678', 'MH12CD5678', 'Wanted Vehicle', 'admin'),
('DL09EF9012', 'DL09EF9012', 'Under Investigation', 'admin'),
('KA05GH3456', 'KA05GH3456', 'Suspicious Activity', 'admin')
ON CONFLICT (plate_text) DO NOTHING;

-- Insert demo user (password: admin123)
INSERT INTO users (name, email, password_hash, role) VALUES
('Admin User', 'admin@anpr.local', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S', 'admin')
ON CONFLICT (email) DO NOTHING;