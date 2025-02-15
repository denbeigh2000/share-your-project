const GITHUB_ENTITIES_TABLE = "github_entities";
const LINK_TABLE = "github_to_discord";
const SUBSCRIPTIONS_TABLE = "repo_subscriptions";

export const findSubForRepo = `
    SELECT (default_branch, is_default_branch_only)
    FROM ${SUBSCRIPTIONS_TABLE}
    WHERE repo_id = ?;
`;

export interface SubResult {
    default_branch: string,
    is_default_branch_only: boolean,
}

export const upsertGithubEntity = `
    INSERT INTO ${LINK_TABLE} (github_id, discord_id)
    VALUES (?, ?)
    ON CONFLICT DO NOTHING;
`;

export const selectGHEntitiesForDiscordUser = `
    SELECT (link.github_id, link.discord_id, gh.installation_id)
    FROM ${LINK_TABLE} AS link
    JOIN ${GITHUB_ENTITIES_TABLE} AS gh
        ON (gh.id = link.github_id)
    WHERE link.discord_id = ?;
`;

export interface GHEntityResult {
    github_id: number,
    github_installation_id: number,
    discord_id: string,
}

// TODO: on conflict?
export const addSubscription = `
    INSERT INTO ${SUBSCRIPTIONS_TABLE} (repo_id, owner_gh_id, default_branch, is_default_branch_only)
    VALUES (?, ?, ?, ?);
`;

export const deleteSubscription = `
    DELETE FROM ${SUBSCRIPTIONS_TABLE}
    WHERE repo_id = ?;
`;

export const addInstallation = `
    INSERT INTO ${GITHUB_ENTITIES_TABLE} (id, installation_id)
    VALUES (?, ?);
`;

export const deleteInstallation = `
    DELETE FROM ${GITHUB_ENTITIES_TABLE}
    WHERE installation_id = ?;
`;
