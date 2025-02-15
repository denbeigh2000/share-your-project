import { Webhooks } from "@octokit/webhooks";
import { Sentry } from "../../sentry";

import { Env } from "../../env";
import { Store } from "../../store";
import { BotClient } from "../../discord/client";

import handlePush from "../../github/discord/push";
import { getBranchName, isBranch } from "../../github/discord/embeds";
import { formatReleaseEvent } from "../../github/discord/releases";

export async function handler(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
    sentry: Sentry
) {
    sentry.setExtras({
        type: "github-wevhooks",
    });

    const webhooks = new Webhooks({
        secret: env.GITHUB_WEBHOOK_SECRET,
    });

    const store = new Store(env.USER_DB);
    const client = new BotClient(env.BOT_TOKEN, sentry);

    webhooks.on("push", async ({ payload }) => {
        const { repository, ref } = payload;

        const sub = await store.findSub(repository.id);
        if (!sub)
            return;

        const { isDefaultBranchOnly, defaultBranch } = sub;
        if (isBranch(ref) && isDefaultBranchOnly && getBranchName(ref) !== defaultBranch)
            return;

        client.createMessage(
            env.PUBLISH_CHANNEL_ID,
            {
                embeds: [handlePush(payload)],
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
        id: request.headers.get("x-request-id")!,
        name: request.headers.get("x-request-event")!,
        signature: request.headers.get("x-hub-signature")!,
        payload: await request.text(),
    });
}
