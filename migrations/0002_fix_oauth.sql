-- Migration number: 0002 	 2025-02-17T01:39:05.211Z

CREATE TABLE oauth_grants (
    id              INTEGER PRIMARY KEY,
    discord_id      INTEGER NOT NULL,
    encrypted_token BLOB    NOT NULL,
    token_iv        BLOB    NOT NULL
);

CREATE TABLE app_installations (
    id              INTEGER PRIMARY KEY,
    installation_id INTEGER NOT NULL
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

DROP TABLE github_entities;
DROP TABLE github_to_discord;
