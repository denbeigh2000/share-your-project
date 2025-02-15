import { RED, YELLOW, getAuthor } from "./embeds";

import { StarEvent } from "@octokit/webhooks-types";
import { APIEmbed } from "discord-api-types/v10";

export default (event: StarEvent): APIEmbed => {
    let color: number;
    let title: string;

    switch (event.action) {
        case "created":
            color = YELLOW;
            title = `[${event.repository.full_name}] New star added: ${event.sender.login}`;
            break;
        case "deleted":
            color = RED;
            title = `[${event.repository.full_name}] Star removed: ${event.sender.login}`;
            break;
    }

    return {
        author: getAuthor(event.sender),
        title,
        thumbnail: {
            url: event.sender.avatar_url,
        },
        color,
        url: event.sender.url,
    };
}
