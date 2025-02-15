import { EmitterWebhookEvent } from "@octokit/webhooks";
import { APIEmbed } from "discord-api-types/v10";
import { formatUser, unknownUser } from "./embeds";

type ReleaseEvent = EmitterWebhookEvent<"release">["payload"];

const MAX_PREVIEW_LEN = 256;

function formatBody(body: string | null): string | undefined {
    if (!body)
        return undefined;

    const preview = body.split("\n")[0];
    if (preview.length >= 256)
        return `${preview.substring(0, MAX_PREVIEW_LEN - 3)}...`;

    return preview;
}

export function formatReleaseEvent(event: ReleaseEvent): APIEmbed {
    const { action, release } = event;
    const title = `Release ${release.name} ${action}`;
    const description = formatBody(release.body);
    const url = release.html_url;
    const author = release.author ? formatUser(release.author) : unknownUser;

    return {
        title,
        description,
        url,
        author,
    };
}
