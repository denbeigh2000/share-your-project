const SUBSCRIPTIONS_TABLE = "repo_subscriptions";
const OAUTH_GRANTS_TABLE = "oauth_grants";
const INSTALLATIONS_TABLE = "app_installations";

const GITHUB_ENTITIES_TABLE = "github_entities";
const LINK_TABLE = "github_to_discord";

export const findSubForRepo = `
    SELECT default_branch, is_default_branch_only
    FROM ${SUBSCRIPTIONS_TABLE}
    WHERE repo_id = ?;
`;

export interface SubResult {
    default_branch: string,
    is_default_branch_only: boolean,
}

export interface FindInstallationResult {
    id: number,
    installation_id: number,
}

export const upsertOauthGrant = `
    INSERT INTO ${OAUTH_GRANTS_TABLE} (id, discord_id, encrypted_token, iv)
    VALUES (?, ?, ?, ?)
    ON CONFLICT REPLACE;
`;

export const upsertInstallation = `
    INSERT INTO ${INSTALLATIONS_TABLE} (id, installation_id)
    VALUES (?, ?)
    ON CONFLICT REPLACE;
`;

export const selectOauthGrantForDiscordUser = `
    SELECT (id AS github_id, encrypted_token, iv)
    FROM ${OAUTH_GRANTS_TABLE}
    WHERE discord_id = ?;
`;

export interface OAuthGrantResult {
    github_id: number,
    encrypted_token: Uint8Array,
    token_iv: Uint8Array,
}

export const selectGHEntitiesForDiscordUser = `
    SELECT link.github_id, link.discord_id, gh.installation_id, gh.encrypted_token, gh.token_iv
    FROM ${LINK_TABLE} AS link
    JOIN ${GITHUB_ENTITIES_TABLE} AS gh
        ON (gh.id = link.github_id)
    WHERE link.discord_id = ?;
`;

// TODO: on conflict?
export const addSubscription = `
    INSERT INTO ${SUBSCRIPTIONS_TABLE} (repo_id, owner_gh_id, default_branch, is_default_branch_only)
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
    DELETE FROM ${GITHUB_ENTITIES_TABLE}
    WHERE installation_id = ?;
`;

export const updateKey = `
    UPDATE ${GITHUB_ENTITIES_TABLE}
    SET
        encrypted_token = ?,
        token_iv = ?
    WHERE
        id = ?;
`;
