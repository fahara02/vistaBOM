-- SQL schema for VistaBOM
-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY,
  age INTEGER,
  username TEXT UNIQUE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  password_hash TEXT,
  google_id TEXT UNIQUE,
  avatar_url TEXT
);

-- Sessions table
CREATE TABLE IF NOT EXISTS "Session" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE
);

-- Projects table
CREATE TABLE IF NOT EXISTS "Project" (
  id TEXT PRIMARY KEY,
  project_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id TEXT NOT NULL,
  CONSTRAINT fk_project_user FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE,
  CONSTRAINT uq_user_project UNIQUE (user_id, project_name)
);
