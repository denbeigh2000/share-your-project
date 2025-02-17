import { Webhooks } from "@octokit/webhooks";
import { Sentry } from "../../sentry";

import { Env } from "../../env";
import { Store } from "../../store";
import { BotClient } from "../../discord/client";

import handlePush from "../../github/discord/push";
import { getBranchName, isBranch } from "../../github/discord/embeds";
import { formatReleaseEvent } from "../../github/discord/releases";
import { returnStatus } from "../../util/http";
import { importOauthKey } from "../../encrypter";

export async function handler(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
    sentry: Sentry
) {
    sentry.setExtras({
        type: "github-webhooks",
    });

    const webhooks = new Webhooks({
        secret: env.GITHUB_WEBHOOK_SECRET,
    });

    const key = await importOauthKey(env.OAUTH_ENCRYPTION_KEY);
    const store = new Store(env.USER_DB, key);
    const client = new BotClient(env.BOT_TOKEN, sentry);

    webhooks.on("push", async ({ payload }) => {
        const {
            ref,
            repository: {
                id: repoId,
                default_branch: defaultBranch
            }
        } = payload;

        const sub = await store.findSub(repoId);
        if (!sub)
            return;

        const { isDefaultBranchOnly } = sub;
        if (isBranch(ref) && isDefaultBranchOnly && getBranchName(ref) !== defaultBranch)
            return;

        await client.createMessage(
            env.PUBLISH_CHANNEL_ID,
            {
                embeds: [handlePush(payload)],
                allowed_mentions: { parse: [] },
            }
        );
    });

    webhooks.on("release.created", async ({ payload }) => {
        const sub = store.findSub(payload.repository.id);
        if (!sub)
            return;

        client.createMessage(
            env.PUBLISH_CHANNEL_ID,
            {
                embeds: [formatReleaseEvent(payload)],
                allowed_mentions: { parse: [] },
            }
        );
    });

    webhooks.on("installation.created", async ({ payload }) => {
        const { id, target_id: targetId } = payload.installation;
        await store.addInstallation(targetId, id);
    });

    webhooks.on("installation.deleted", async ({ payload }) => {
        await store.removeInstallation(payload.installation.id);
    });

    await webhooks.verifyAndReceive({
        id: request.headers.get("x-github-hook-id")!,
        name: request.headers.get("x-github-event")!,
        signature: request.headers.get("x-hub-signature-256")!,
        payload: await request.text(),
    });

    return returnStatus(200, 'OK');
}
