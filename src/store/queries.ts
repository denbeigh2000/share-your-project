const SUBSCRIPTIONS_TABLE = "subscriptions";
const OAUTH_GRANTS_TABLE = "oauth_grants";
const INSTALLATIONS_TABLE = "app_installations";

export const findSubForRepo = `
    SELECT is_default_branch_only
    FROM ${SUBSCRIPTIONS_TABLE}
    WHERE repo_id = ?;
`;

export interface SubResult {
    is_default_branch_only: boolean,
}

export interface FindInstallationResult {
    id: number,
    installation_id: number,
}

export const upsertOauthGrant = `
    INSERT INTO ${OAUTH_GRANTS_TABLE} (id, discord_id, encrypted_token, token_iv)
    VALUES (?, ?, ?, ?)
    ON CONFLICT DO UPDATE
        SET discord_id = excluded.discord_id,
            encrypted_token = excluded.encrypted_token,
            token_iv = excluded.token_iv;
`;

export const upsertInstallation = `
    INSERT INTO ${INSTALLATIONS_TABLE} (id, installation_id)
    VALUES (?, ?)
    ON CONFLICT DO UPDATE SET installation_id = excluded.installation_id;
`;

export const selectOauthGrantForDiscordUser = `
    SELECT id AS github_id, discord_id, encrypted_token, token_iv
    FROM ${OAUTH_GRANTS_TABLE}
    WHERE discord_id = ?;
`;

export interface OAuthGrantResult {
    github_id: number,
    discord_id: string,
    encrypted_token: Uint8Array,
    token_iv: Uint8Array,
}

export const selectOauthGrantsForDiscordUser = `
    SELECT id AS github_id, discord_id, encrypted_token, token_iv
    FROM ${OAUTH_GRANTS_TABLE}
    WHERE discord_id = ?;
`;

// TODO: on conflict?
export const addSubscription = `
    INSERT INTO ${SUBSCRIPTIONS_TABLE}
    (repo_id, owner_gh_id, is_default_branch_only)
    VALUES (?, ?, ?, ?);
`;

export const deleteSubscription = `
    DELETE FROM ${SUBSCRIPTIONS_TABLE}
    WHERE repo_id = ?;
`;

export const findInstallation = `
    SELECT id, installation_id
    FROM ${INSTALLATIONS_TABLE}
    WHERE id = ?;
`;

export const deleteInstallation = `
    DELETE FROM ${INSTALLATIONS_TABLE}
    WHERE installation_id = ?;
`;
