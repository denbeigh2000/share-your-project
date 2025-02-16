import { Encrypter, iv } from "../encrypter";
import { addInstallation, addSubscription, deleteInstallation, deleteSubscription, findSubForRepo, GHEntityResult, selectGHEntitiesForDiscordUser, SubResult, updateKey, upsertGithubEntity } from "./queries";

export interface Entity {
    discordID: string,
    githubID: number,
    githubInstallationID: number,
    oauthToken: string | null,
}

export interface Subscription {
    repoID: number,
    defaultBranch: string,
    isDefaultBranchOnly: boolean,
}

export class Store {
    db: D1Database
    encrypter: Encrypter

    constructor(db: D1Database, key: CryptoKey) {
        this.db = db;
        this.encrypter = new Encrypter(key);
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

        const items = [];
        for (let i = 0; i < results.length; i++) {
            const r = results[i];
            let oauthToken = null;
            if (r.encrypted_token && r.token_iv) {
                const encrypted = new Uint8Array(r.encrypted_token);
                const iv = new Uint8Array(r.token_iv);
                oauthToken = await this.encrypter.decrypt(encrypted, iv);
            }

            items.push({
                discordID,
                githubID: r.github_id,
                githubInstallationID: r.installation_id,
                oauthToken,
            });
        }

        console.log(items);

        return items;
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

    async updateCode(ghUserId: number, token: string): Promise<void> {
        const iv_ = iv();
        const encryptedToken = await this.encrypter.encrypt(iv_, token);
        const stmt = this.db.prepare(updateKey).bind(encryptedToken, iv_, ghUserId);
        const { error } = await stmt.run();
        if (error) throw error;
    }
}
