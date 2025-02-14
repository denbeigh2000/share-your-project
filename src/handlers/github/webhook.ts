import { Webhooks } from "@octokit/webhooks";
import { Sentry } from "../../sentry";

import { Env } from "../../env";
import { Store } from "../../store";
import { BotClient } from "../../discord/client";

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
        const sub = await store.findSub(payload.repository.id);
        if (!sub)
            return;

        if (sub.isDefaultBranchOnly && payload.ref !== `refs/heads/${sub.defaultBranch}`)
            return;

        client.createMessage(
            env.PUBLISH_CHANNEL_ID,
            {
                // TODO: make embeds etc
                content: "new commits!",
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
                content: "new release!",
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
