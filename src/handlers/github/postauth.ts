import { Octokit } from "octokit";
import { Env } from "../../env";
import { Sentry } from "../../sentry";
import { Store } from "../../store";
import { returnStatus } from "../../util/http";

import { createOAuthUserAuth } from "@octokit/auth-oauth-user";
import { StateStore } from "../../stateStore";
import { importOauthKey } from "../../encrypter";

type RequestParams = OauthRequestParams | InstallationRequestParams | InvalidRequestParams;

interface OauthRequestParams {
    requestType: "post_oauth";
    code: string;
    state: string;
};

interface InstallationRequestParams {
    requestType: "post_installation";
    code: string;
    installationId: string;
};

interface InvalidRequestParams {
    requestType: "invalid";
}

function getRequestParams(rawParams: URLSearchParams): RequestParams {
    const state = rawParams.get("state") || undefined;
    const code = rawParams.get("code");
    const installationId = rawParams.get("installation_id");
    if (installationId && code)
        return { requestType: "post_installation", code, installationId };
    if (state && code)
        return { requestType: "post_oauth", code, state };

    return { requestType: "invalid" };
}

interface AuthParams {
    clientId: string,
    clientSecret: string,
    code: string,
    state?: string,
}

interface AuthReturn {
    octokit: Octokit,
    token: string,
}

async function handleAuth(params: AuthParams): Promise<AuthReturn> {
    const auth = createOAuthUserAuth(params);
    const { token } = await auth();

    const { clientId, clientSecret } = params;
    const octokit = new Octokit({
        authStrategy: createOAuthUserAuth,
        auth: {
            clientId,
            clientSecret,
            token,
            clientType: "oauth-app",
        },
    });

    return { octokit, token };
}

async function handlePostInstallation(env: Env, { code }: InstallationRequestParams): Promise<Response> {
    const { octokit } = await handleAuth({
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        code,
    });

    // We don't actually do anything here, AFAIK (this is just to ensure that
    // our code is legit)
    const { data: userData, status } = await octokit.request("GET /user");
    if (status !== 200)
        return returnStatus(401, "bad code");

    return returnStatus(200, `Github application installed for ${userData.login}, you can now link your Discord account`);
}

async function handlePostOauth(env: Env, { state, code }: OauthRequestParams): Promise<Response> {
    const stateStore = new StateStore(env.OAUTH);
    const discordID = await stateStore.get(state);
    if (!discordID)
        return returnStatus(400, "Error");

    const { octokit, token } = await handleAuth({
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        code,
        state,
    });

    const { data: userData } = await octokit.request("GET /user");
    const key = await importOauthKey(env.OAUTH_ENCRYPTION_KEY);
    const store = new Store(env.USER_DB, key);

    await store.upsertOauthGrant(userData.id, discordID, token);
    return returnStatus(200, "Discord account linked, you can now share projects");
}

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

    const params = getRequestParams(url.searchParams);
    switch (params.requestType) {
        case "post_installation":
            return handlePostInstallation(env, params);
        case "post_oauth":
            return handlePostOauth(env, params);
        default:
            return returnStatus(400, "Bad request");
    }
}
