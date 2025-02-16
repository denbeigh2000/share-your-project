import {
    APIChatInputApplicationCommandGuildInteraction,
    APIInteractionResponse,
    InteractionResponseType,
    MessageFlags,
    RESTPostAPIChatInputApplicationCommandsJSONBody
} from "discord-api-types/v10";
import { Env } from "../../../env";
import { getInviteLink } from "../../../util";
import { BotClient } from "../../client";

export const command: RESTPostAPIChatInputApplicationCommandsJSONBody = {
    name: "about",
    description: "What this is, how to use it, FAQ.",
};


function blurb(env: Env): string {
    return `
# About me
I am the **Share Your Project bot**.

Tell me about the Github projects you want people to know about, I'll post in <#${env.PUBLISH_CHANNEL_ID}> when there are new commits, tags or releases! :smile:

# What do?
To get started follow these steps:
- Install the Github App [here](${getInviteLink(env.GITHUB_APPLICATION_NAME)})
- Run \`/link\` to confirm ownership of your Github user
- Run \`/subscribe\` to add your first project! :tada:

# FAQ
**Why would I want to do this?**
You have a project that you're working on that you're proud of, that you'd like the community to know about!

**Why do I have to authorise a Github application with read access?**
For two reasons:
- :envelope: Github will send me an event when you push updates.
- :white_check_mark: I can verify you own the Github account you're publishing from by sending you a unique link in Discord.

Github will show you a prompt to select which repos I can see before you grant me any access, so you can keep your sensitive repos to yourself :zipper_mouth_face:

**Can I stop publishing updates for a repo I own?**
Yes, use the \`/unsubscribe\` command.

**Can I stop updates entirely and revoke your permissions?**
Yes, use the \`/unlink\` command.

If you'd like to do this yourself, or check my work, you can do so [here](https://github.com/settings/installations).

**Can I see your source code?**
[Of course](https://github.com/denbeigh2000/share-your-project)
`;
}

export const handler = async (
    _ctx: ExecutionContext,
    _c: BotClient,
    _i: APIChatInputApplicationCommandGuildInteraction,
    env: Env,
): Promise<APIInteractionResponse> => {
    return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
            // NOTE: cannot suppress embeds *and* keep the response ephemeral,
            // apparently.
            flags: MessageFlags.Ephemeral,
            content: blurb(env),
        },
    };
};

