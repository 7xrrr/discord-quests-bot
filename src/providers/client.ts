import { Options, Partials } from "discord.js";
import { CustomClient } from "../core/customClient.js";
import { loadCommands } from "../handler/loadCommands.js";
import config from "../config/config.js";

const client = new CustomClient({
    intents: 33539,
    partials: [Partials.Message, Partials.GuildMember, Partials.Channel, Partials.Reaction, Partials.User, Partials.ThreadMember],
    failIfNotExists: false,
    makeCache: Options.cacheWithLimits({
        ...Options.DefaultMakeCacheSettings,
        ReactionManager: 0,
        ApplicationCommandManager: 0,
        ApplicationEmojiManager: 500,
        AutoModerationRuleManager: 0,
        BaseGuildEmojiManager: 0,
        DMMessageManager: 25,
        EntitlementManager: 0,
        GuildBanManager: 0,
        GuildEmojiManager: 0,
        GuildInviteManager: 0,
        GuildMemberManager: 100,
        GuildScheduledEventManager: 0,
        GuildStickerManager: 0,
        MessageManager: 100,
        PresenceManager: 500000,
        ReactionUserManager: 0,
        GuildForumThreadManager: 0,
        GuildMessageManager: 10,
        GuildTextThreadManager: 0,
        StageInstanceManager: 0,
        ThreadManager: 0,
        ThreadMemberManager: 0,
        UserManager: 0,
        VoiceStateManager: 0,
    }),
});
(async () => {


    await loadCommands(client);
  
    await client.login(config.token);

})()



export default client;