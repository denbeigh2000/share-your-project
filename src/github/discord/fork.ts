import { EmitterWebhookEvent } from "@octokit/webhooks";
import { GREY, formatCommitter } from "./embeds";

import { APIEmbed } from "discord-api-types/v10";

type ForkEvent = EmitterWebhookEvent<"fork">["payload"];

export default (event: ForkEvent): APIEmbed => {
    const { repository, forkee } = event;
    const prefix = `[${repository.full_name}]`;

    forkee.owner.
    return {
        author: formatCommitter(forkee.owner),
        title: `${prefix} Fork created: ${forkee.full_name}`,
        thumbnail: {
            url: forkee.owner.avatar_url,
        },
        url: forkee.url,
        color: GREY,
    };
}
