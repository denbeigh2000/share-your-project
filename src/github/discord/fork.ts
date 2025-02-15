import { EmitterWebhookEvent } from "@octokit/webhooks";
import { GREY, formatSimpleUser, formatUser } from "./embeds";

import { APIEmbed } from "discord-api-types/v10";

type ForkEvent = EmitterWebhookEvent<"fork">["payload"];

export default (event: ForkEvent): APIEmbed => {
    const { repository, forkee, sender } = event;
    const prefix = `[${repository.full_name}]`;

    const author = forkee.owner
        ? formatUser(forkee.owner)
        : formatSimpleUser(sender);

    const thumbnail = author.icon_url
        ? { url: author.icon_url }
        : undefined;

    return {
        author,
        title: `${prefix} Fork created: ${forkee.full_name}`,
        thumbnail,
        url: forkee.url,
        color: GREY,
    };
}
