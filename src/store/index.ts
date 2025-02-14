import { addInstallation, addSubscription, deleteInstallation, deleteSubscription, findSubForRepo, GHEntityResult, selectGHEntitiesForDiscordUser, SubResult, upsertGithubEntity } from "./queries";

export interface Entity {
    discordID: string,
    githubID: number,
    githubInstallationID: number,
}

export interface Subscription {
    repoID: number,
    defaultBranch: string,
    isDefaultBranchOnly: boolean,
}

export class Store {
    db: D1Database

    constructor(db: D1Database) {
        this.db = db;
    }

    async upsertEntity(githubID: number, discordID: string): Promise<void> {
        const stmt = this.db.prepare(upsertGithubEntity).bind(githubID, discordID);

        const { error } = await stmt.run();
        if (error)
            throw error;
    }

    async findEntities(discordID: string): Promise<Entity[]> {
        const stmt = this.db.prepare(selectGHEntitiesForDiscordUser).bind(discordID);

        const { error, results } = await stmt.all<GHEntityResult>();
        if (error)
            throw error;

        if (!results || !results[0])
            return [];

        return results.map(r => {
            return {
                discordID,
                githubID: r.github_id,
                githubInstallationID: r.github_installation_id,
            };
        });
    }

    async upsertSub(
        repoID: number,
        ownerID: number,
        defaultBranch: string,
        isDefaultBranchOnly: boolean
    ): Promise<void> {
        const stmt = this.db
            .prepare(addSubscription)
            .bind(repoID, ownerID, defaultBranch, isDefaultBranchOnly);

        const { error } = await stmt.run();
        if (error)
            throw error;
    }

    async findSub(repoID: number): Promise<Subscription | null> {
        const stmt = this.db.prepare(findSubForRepo).bind(repoID);

        const result = await stmt.first<SubResult>();
        if (!result)
            return null;

        return {
            repoID,
            defaultBranch: result.default_branch,
            isDefaultBranchOnly: result.is_default_branch_only,
        };
    }

    async removeSub(repoID: number): Promise<void> {
        const stmt = this.db
            .prepare(deleteSubscription)
            .bind(repoID);

        const { error } = await stmt.run();
        if (error)
            throw error;
    }

    async addInstallation(ghUserId: number, ghInstallationId: number): Promise<void> {
        const stmt = this.db
            .prepare(addInstallation)
            .bind(ghUserId, ghInstallationId);

        const { error } = await stmt.run();
        if (error)
            throw error;
    }

    async removeInstallation(ghInstallationId: number): Promise<void> {
        const stmt = this.db
            .prepare(deleteInstallation)
            .bind(ghInstallationId);

        const { error } = await stmt.run();
        if (error)
            throw error;
    }
}
