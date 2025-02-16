import { Octokit } from "octokit";
import { Env } from "../../env";
import { Sentry } from "../../sentry";
import { Store } from "../../store";
import { returnStatus } from "../../util/http";

import { createOAuthUserAuth } from "@octokit/auth-oauth-user";
import { StateStore } from "../../stateStore";
import { importOauthKey } from "../../encrypter";

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
    const state = url.searchParams.get("state") || undefined;
    const code = url.searchParams.get("code");
    const installationId = url.searchParams.get("installation_id");

    if (!code)
        return returnStatus(400, "Bad request");

    let discordID = undefined;
    if (state) {
        // This is a discord account link
        const stateStore = new StateStore(env.OAUTH);
        discordID = await stateStore.get(state);
        if (!discordID)
            return returnStatus(400, "Error");
    } else if (!installationId)
        return returnStatus(400, "Error");

    const auth = createOAuthUserAuth({
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        code,
        state,
    });
    const { token } = await auth();

    const octokit = new Octokit({
        authStrategy: createOAuthUserAuth,
        auth: {
            clientId: env.CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
            token,
            clientType: "oauth-app",
        },
    });

    const { data: userData } = await octokit.request("GET /user");
    const key = await importOauthKey(env.OAUTH_ENCRYPTION_KEY);
    const store = new Store(env.USER_DB, key);
    if (discordID) {
        await store.upsertEntity(userData.id, discordID);
        await store.updateCode(userData.id, token);
        return returnStatus(200, "Discord account linked, you can now share projects");
    } else {
        // NOTE: we already confirmed installationId was truthy above, in the
        // else block after confirming the state
        await store.updateCode(userData.id, token);
        return returnStatus(200, "Github application installed, you can now link your Discord account");
    }

}
