CREATE SCHEMA IF NOT EXISTS users;

CREATE TABLE IF NOT EXISTS users.credentials (
    user_key   SERIAL PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    is_active  BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS users.profiles (
    user_key     INTEGER PRIMARY KEY REFERENCES users.credentials(user_key) ON DELETE CASCADE,
    email        VARCHAR(255) UNIQUE NOT NULL,
    first_name   VARCHAR(100),
    last_name    VARCHAR(100),
    phone_number VARCHAR(20),
    role         VARCHAR(20) DEFAULT 'user' NOT NULL,
    created_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS users.invites (
    invite_key  SERIAL PRIMARY KEY,
    token       VARCHAR(64) UNIQUE NOT NULL,
    email       VARCHAR(255),
    used        BOOLEAN DEFAULT FALSE NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_by  INTEGER REFERENCES users.credentials(user_key) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE OR REPLACE FUNCTION users.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_credentials_updated_at
    BEFORE UPDATE ON users.credentials
    FOR EACH ROW EXECUTE FUNCTION users.set_updated_at();

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON users.profiles
    FOR EACH ROW EXECUTE FUNCTION users.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_profiles_email    ON users.profiles(email);
CREATE INDEX IF NOT EXISTS idx_invites_token     ON users.invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_expires   ON users.invites(expires_at) WHERE used = FALSE;
