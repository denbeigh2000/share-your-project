import { Octokit } from "octokit";
import { Env } from "../../env";
import { Sentry } from "../../sentry";
import { Store } from "../../store";
import { returnStatus } from "../../util/http";

import { createOAuthUserAuth } from "@octokit/auth-oauth-user";
import { StateStore } from "../../stateStore";

export async function handler(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
    sentry: Sentry
) {
    sentry.setExtras({
        type: "github-postauth",
    });

    const url = new URL(request.url);
    if (!url.searchParams.has("state") || !url.searchParams.has("code")) {
        return new Response("It is now safe to close this window");
    }

    const state = url.searchParams.get("state")!;
    const code = url.searchParams.get("code")!;

    const stateStore = new StateStore(env.OAUTH);
    const discordID = await stateStore.get(state);
    if (!discordID)
        return returnStatus(400, "Error");

    const octokit = new Octokit({
        authStrategy: createOAuthUserAuth,
        auth: {
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
            code,
            state,
        },
    });

    const { data: userData } = await octokit.request("GET /user");
    const store = new Store(env.USER_DB);
    await store.upsertEntity(userData.id, discordID);
}
