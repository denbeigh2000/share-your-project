-- Migration number: 0002 	 2025-02-17T01:39:05.211Z

CREATE TABLE oauth_grants (
    id              INTEGER PRIMARY KEY,
    discord_id      INTEGER NOT NULL,
    encrypted_token BLOB    NOT NULL,
    token_iv        BLOB    NOT NULL
);

CREATE INDEX idx_oauth_grants_discord_id
    ON oauth_grants (discord_id);

CREATE TABLE app_installations (
    id              INTEGER PRIMARY KEY,
    installation_id INTEGER NOT NULL
);

-- functionally the same, but adds a constraint on the new table
CREATE TABLE subscriptions (
    repo_id                 INTEGER PRIMARY KEY,
    owner_gh_id             INTEGER NOT NULL,
    default_branch          TEXT    NOT NULL,
    is_default_branch_only  INTEGER NOT NULL,

    CONSTRAINT fk_repo_subscriptions_github_entities
        FOREIGN KEY (owner_gh_id)
            REFERENCES app_installations (id)
            ON DELETE CASCADE
);

INSERT INTO oauth_grants
    SELECT id, gtd.discord_id AS discord_id, encrypted_token, token_iv
    FROM github_entities gh
        LEFT JOIN github_to_discord gtd
            ON (gh.id = gtd.github_id)
    WHERE encrypted_token IS NOT NULL;

INSERT INTO app_installations
    SELECT id, installation_id
    FROM github_entities;

INSERT INTO subscriptions
    SELECT repo_id, owner_gh_id, default_branch, is_default_branch_only
    FROM subscriptions;

-- these must/should be dropped when applying in prod, but committed as
-- comments. leaving them uncommented seems to make localdev have problems when
-- querying tables at runtime.
-- DROP TABLE github_entities;
-- DROP TABLE github_to_discord;
-- DROP TABLE repo_subscriptions;
