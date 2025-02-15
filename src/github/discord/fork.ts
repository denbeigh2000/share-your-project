import { GREY, getAuthor } from "./embeds";

import { ForkEvent } from "@octokit/webhooks-types";
import { APIEmbed } from "discord-api-types/v10";

export default (event: ForkEvent): APIEmbed => {
    const { repository, forkee } = event;
    const prefix = `[${repository.full_name}]`;
    return {
        author: getAuthor(forkee.owner),
        title: `${prefix} Fork created: ${forkee.full_name}`,
        thumbnail: {
            url: forkee.owner.avatar_url,
        },
        url: forkee.url,
        color: GREY,
    };
}
