export interface Env {
    OAUTH: KVNamespace;
    USER_DB: D1Database;

    BOT_TOKEN: string;
    CLIENT_SECRET: string;
    SENTRY_DSN: string;

    CLIENT_ID: string;
    CLIENT_PUBLIC_KEY: string;
    REDIRECT_URI: string;
    GUILD_ID: string;

    GITHUB_APP_ID: number;
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;
    GITHUB_PRIVATE_KEY: string;
    GITHUB_APPLICATION_NAME: string;
    GITHUB_WEBHOOK_SECRET: string;

    PUBLISH_CHANNEL_ID: string;

    DENBEIGH_USER: string;

    ENVIRONMENT: string;

    OAUTH_ENCRYPTION_KEY: string;
}
