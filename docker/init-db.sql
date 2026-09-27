-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Camera registry
CREATE TABLE cameras (
    camera_id      TEXT PRIMARY KEY,
    location       GEOGRAPHY(Point, 4326),
    zone           TEXT,
    direction      TEXT,
    status         TEXT DEFAULT 'online',
    stream_url     TEXT,
    installed_at   TIMESTAMPTZ DEFAULT now()
);

-- Create index on location for spatial queries
CREATE INDEX idx_cameras_location ON cameras USING GIST (location);

-- Plate sightings (hypertable - time-series)
CREATE TABLE plate_sightings (
    id             BIGSERIAL,
    plate_text     TEXT NOT NULL,
    normalized_plate TEXT,
    camera_id      TEXT REFERENCES cameras(camera_id),
    confidence     REAL,
    snapshot_url   TEXT,
    bbox           JSONB,
    ts             TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (id, ts)
);

-- Convert to hypertable
SELECT create_hypertable('plate_sightings', 'ts', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

-- Create indexes for common queries
CREATE INDEX idx_plate_sightings_plate_text ON plate_sightings (plate_text);
CREATE INDEX idx_plate_sightings_camera_id ON plate_sightings (camera_id);
CREATE INDEX idx_plate_sightings_ts ON plate_sightings (ts DESC);
CREATE INDEX idx_plate_sightings_normalized_plate ON plate_sightings (normalized_plate);

-- Blacklist
CREATE TABLE blacklist (
    plate_text  TEXT PRIMARY KEY,
    normalized_plate TEXT,
    reason      TEXT,
    added_by    TEXT,
    added_at    TIMESTAMPTZ DEFAULT now(),
    expires_at  TIMESTAMPTZ,
    is_active   BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_blacklist_normalized ON blacklist (normalized_plate);

-- Alerts
CREATE TABLE alerts (
    id           BIGSERIAL PRIMARY KEY,
    plate_text   TEXT,
    camera_id    TEXT REFERENCES cameras(camera_id),
    alert_type   TEXT,       -- blacklist_hit / anomaly / system
    severity     TEXT,       -- low/medium/high/critical
    status       TEXT DEFAULT 'new',  -- new/acknowledged/resolved
    details      JSONB,
    created_at   TIMESTAMPTZ DEFAULT now(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at  TIMESTAMPTZ,
    resolved_by  TEXT,
    note         TEXT
);

CREATE INDEX idx_alerts_plate_text ON alerts (plate_text);
CREATE INDEX idx_alerts_camera_id ON alerts (camera_id);
CREATE INDEX idx_alerts_created_at ON alerts (created_at DESC);
CREATE INDEX idx_alerts_status ON alerts (status);
CREATE INDEX idx_alerts_severity ON alerts (severity);

-- Users & roles
CREATE TABLE users (
    id         SERIAL PRIMARY KEY,
    name       TEXT,
    email      TEXT UNIQUE,
    password_hash TEXT,
    role       TEXT,   -- admin/analyst/officer/auditor
    is_active  BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Camera health/metrics
CREATE TABLE camera_metrics (
    id           BIGSERIAL,
    camera_id    TEXT REFERENCES cameras(camera_id),
    metric_type  TEXT,  -- ocr_accuracy, uptime, latency, etc.
    value        REAL,
    ts           TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (id, ts)
);

SELECT create_hypertable('camera_metrics', 'ts', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

-- Analytics aggregations (pre-computed for dashboard performance)
CREATE TABLE analytics_density (
    id            BIGSERIAL,
    camera_id     TEXT REFERENCES cameras(camera_id),
    zone          TEXT,
    vehicle_count INTEGER,
    bucket_start  TIMESTAMPTZ NOT NULL,
    bucket_end    TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (id, bucket_start)
);

SELECT create_hypertable('analytics_density', 'bucket_start', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

CREATE INDEX idx_analytics_density_camera ON analytics_density (camera_id, bucket_start DESC);

CREATE TABLE analytics_od_matrix (
    id              BIGSERIAL,
    origin_camera   TEXT REFERENCES cameras(camera_id),
    origin_zone     TEXT,
    dest_camera     TEXT REFERENCES cameras(camera_id),
    dest_zone       TEXT,
    vehicle_count   INTEGER,
    bucket_start    TIMESTAMPTZ NOT NULL,
    bucket_end      TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (id, bucket_start)
);

SELECT create_hypertable('analytics_od_matrix', 'bucket_start', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

CREATE TABLE analytics_congestion (
    id              BIGSERIAL,
    camera_id       TEXT REFERENCES cameras(camera_id),
    zone            TEXT,
    density_score   REAL,
    avg_speed       REAL,
    congestion_level TEXT,  -- normal/watch/congested
    z_score         REAL,
    bucket_start    TIMESTAMPTZ NOT NULL,
    bucket_end      TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (id, bucket_start)
);

SELECT create_hypertable('analytics_congestion', 'bucket_start', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

CREATE TABLE analytics_heatmap (
    id            BIGSERIAL,
    h3_index      TEXT,  -- H3 hexagon index
    vehicle_count INTEGER,
    bucket_start  TIMESTAMPTZ NOT NULL,
    bucket_end    TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (id, bucket_start)
);

SELECT create_hypertable('analytics_heatmap', 'bucket_start', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

-- Insert demo cameras (Ahmedabad/Anand area coordinates)
INSERT INTO cameras (camera_id, location, zone, direction, status, stream_url) VALUES
('CAM001', ST_SetSRID(ST_MakePoint(72.5714, 23.0225), 4326), 'Zone-A', 'Northbound', 'online', 'simulated'),
('CAM002', ST_SetSRID(ST_MakePoint(72.5800, 23.0300), 4326), 'Zone-A', 'Southbound', 'online', 'simulated'),
('CAM003', ST_SetSRID(ST_MakePoint(72.5900, 23.0400), 4326), 'Zone-B', 'Eastbound', 'online', 'simulated'),
('CAM004', ST_SetSRID(ST_MakePoint(72.6000, 23.0500), 4326), 'Zone-B', 'Westbound', 'online', 'simulated'),
('CAM005', ST_SetSRID(ST_MakePoint(72.6100, 23.0600), 4326), 'Zone-C', 'Northbound', 'online', 'simulated'),
('CAM006', ST_SetSRID(ST_MakePoint(72.6200, 23.0700), 4326), 'Zone-C', 'Southbound', 'online', 'simulated'),
('CAM007', ST_SetSRID(ST_MakePoint(72.6300, 23.0800), 4326), 'Zone-D', 'Eastbound', 'online', 'simulated'),
('CAM008', ST_SetSRID(ST_MakePoint(72.6400, 23.0900), 4326), 'Zone-D', 'Westbound', 'online', 'simulated'),
('CAM009', ST_SetSRID(ST_MakePoint(72.6500, 23.1000), 4326), 'Zone-E', 'Northbound', 'online', 'simulated'),
('CAM010', ST_SetSRID(ST_MakePoint(72.6600, 23.1100), 4326), 'Zone-E', 'Southbound', 'online', 'simulated'),
('CAM011', ST_SetSRID(ST_MakePoint(72.6700, 23.1200), 4326), 'Zone-F', 'Eastbound', 'online', 'simulated'),
('CAM012', ST_SetSRID(ST_MakePoint(72.6800, 23.1300), 4326), 'Zone-F', 'Westbound', 'online', 'simulated')
ON CONFLICT (camera_id) DO NOTHING;

-- Insert demo blacklist plates
INSERT INTO blacklist (plate_text, normalized_plate, reason, added_by) VALUES
('GJ01AB1234', 'GJ01AB1234', 'Stolen Vehicle', 'admin'),
('MH12CD5678', 'MH12CD5678', 'Wanted Vehicle', 'admin'),
('DL09EF9012', 'DL09EF9012', 'Under Investigation', 'admin'),
('KA05GH3456', 'KA05GH3456', 'Suspicious Activity', 'admin')
ON CONFLICT (plate_text) DO NOTHING;

-- Insert demo user
INSERT INTO users (name, email, password_hash, role) VALUES
('Admin User', 'admin@example.com', '$2b$12$u4HkWvY4rVA/Fe3tCvL6h.P5p..PyeNzmmk.tEYkL6hOPsf8ZJ/FS', 'admin')
ON CONFLICT (email) DO NOTHING;