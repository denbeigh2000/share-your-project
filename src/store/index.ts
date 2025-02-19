import { Encrypter, iv } from "../encrypter";
import {
    addSubscription,
    deleteInstallation,
    deleteOauthGrant,
    deleteSubscription,
    findInstallation,
    FindInstallationResult,
    findSubForRepo,
    OAuthGrantResult,
    selectOauthGrantsForDiscordUser,
    SubResult,
    upsertInstallation,
    upsertOauthGrant,
} from "./queries";

export interface OauthGrant {
    discordID: string,
    githubID: number,
    oauthToken: string,
}

export interface Installation {
    githubID: number,
    githubInstallationID: number,
}

export interface Subscription {
    repoID: number,
    isDefaultBranchOnly: boolean,
}

export class Store {
    db: D1Database
    encrypter: Encrypter

    constructor(db: D1Database, key: CryptoKey) {
        this.db = db;
        this.encrypter = new Encrypter(key);
    }

    async upsertOauthGrant(githubID: number, discordID: string, token: string): Promise<void> {
        const iv_ = iv();
        const encryptedToken = await this.encrypter.encrypt(iv_, token);

        const stmt = this.db.prepare(upsertOauthGrant).bind(githubID, discordID, encryptedToken, iv_);
        const { error } = await stmt.run();
        if (error)
            throw error;
    }

    async findOauthGrant(discordID: string): Promise<OauthGrant | null> {
        const stmt = this.db.prepare(selectOauthGrantsForDiscordUser).bind(discordID);

        const { error, results } = await stmt.all<OAuthGrantResult>();
        if (error)
            throw error;

        if (!results || !results[0])
            return null;

        const r = results[0];
        const encrypted = new Uint8Array(r.encrypted_token);
        const iv = new Uint8Array(r.token_iv);
        const oauthToken = await this.encrypter.decrypt(encrypted, iv);

        return {
            discordID,
            githubID: r.github_id,
            oauthToken,
        };
    }

    async deleteOauthGrant(discordID: string): Promise<OauthGrant | null> {
        const stmt = this.db.prepare(deleteOauthGrant).bind(discordID);
        const result = await stmt.first<OAuthGrantResult>();
        if (!result)
            return null

        const encrypted = new Uint8Array(result.encrypted_token);
        const iv = new Uint8Array(result.token_iv);
        const oauthToken = await this.encrypter.decrypt(encrypted, iv);
        return {
            discordID,
            githubID: result.github_id,
            oauthToken
        }
    }

    async upsertSub(
        repoID: number,
        ownerID: number,
        isDefaultBranchOnly: boolean
    ): Promise<void> {
        const stmt = this.db
            .prepare(addSubscription)
            .bind(repoID, ownerID, isDefaultBranchOnly);

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
            .prepare(upsertInstallation)
            .bind(ghUserId, ghInstallationId);

        const { error } = await stmt.run();
        if (error)
            throw error;
    }

    async findInstallation(githubID: number): Promise<Installation | null> {
        const stmt = this.db.prepare(findInstallation).bind(githubID);

        const results = await stmt.first<FindInstallationResult>();
        if (!results)
            return null;

        return {
            githubID: results.id,
            githubInstallationID: results.installation_id,
        }
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
