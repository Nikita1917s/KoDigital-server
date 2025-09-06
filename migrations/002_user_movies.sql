DROP TABLE IF EXISTS user_movies CASCADE;

CREATE TABLE IF NOT EXISTS user_movies (
  username    TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  "Title"     TEXT NOT NULL,
  "Year"      TEXT NOT NULL CHECK ("Year" ~ '^\d{4}$'), -- store 4-digit year only
  "Runtime"   TEXT,
  "Genre"     TEXT,
  "Director"  TEXT,
  "Favourite" BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_movies_pk PRIMARY KEY (username, "Title")
);

CREATE INDEX IF NOT EXISTS idx_user_movies_username ON user_movies(username);