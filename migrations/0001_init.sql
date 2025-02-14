-- Migration number: 0001 	 2025-02-15T00:20:33.507Z

CREATE TABLE github_entities (
    id              INTEGER PRIMARY KEY,
    installation_id INTEGER
);

CREATE INDEX idx_github_entities_installation_id
    ON github_entities (installation_id);

CREATE TABLE github_to_discord (
    github_id   INTEGER,
    discord_id  TEXT,

    CONSTRAINT unique_github_to_discord
        UNIQUE (github_id, discord_id),

    CONSTRAINT fk_github_to_discord_github_entities_id
        FOREIGN KEY (github_id)
            REFERENCES (github_entities) id
            ON DELETE CASCADE
);

CREATE INDEX idx_github_to_discord_github_id
    ON github_to_discord (github_id);

CREATE INDEX idx_github_to_discord_discord_id
    ON github_to_discord (discord_id);

CREATE TABLE repo_subscriptions (
    repo_id                 INTEGER PRIMARY KEY,
    owner_gh_id             INTEGER NOT NULL,
    default_branch          TEXT    NOT NULL,
    is_default_branch_only  INTEGER NOT NULL,

    CONSTRAINT fk_repo_subscriptions_github_entities
        FOREIGN KEY (owner_gh_id)
            REFERENCES github_entities (id)
            ON DELETE CASCADE
);
