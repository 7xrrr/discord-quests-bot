
import config from "./config.js";
import { error } from "./utils/logging.js";
import { Client, Collection, Options, Partials } from "discord.js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export let root = __dirname;
console.log(root);

export class CustomClient extends Client {
    cooldowns: any[] = [];
    newQuests: Collection<String, any> = new Collection();
    commands: Collection<String, any> = new Collection();
    slashCommands: Collection<String, any> = new Collection();
    selectMenus: Collection<String, any> = new Collection();
    modals: Collection<String, any> = new Collection();
    contextMenus: Collection<String, any> = new Collection();
    buttons: Collection<String, any> = new Collection();
    questsConfig: Collection<String, QuestConfig> = new Collection();
    questSolvoer: Collection<String, any> = new Collection();
    images: Collection<String, questImagesInterface> = new Collection();


}


export const client = new CustomClient({
    intents: 131071,
    partials: [Partials.Message, Partials.GuildMember, Partials.Channel, Partials.Reaction, Partials.User],
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
        GuildMemberManager: 0,
        GuildScheduledEventManager: 0,
        GuildStickerManager: 0,
        MessageManager: 100,
        PresenceManager: 0,
        ReactionUserManager: 0,
        GuildForumThreadManager: 0,
        GuildMessageManager: 100,
        GuildTextThreadManager: 0,
        StageInstanceManager: 0,
        ThreadManager: 0,
        ThreadMemberManager: 0,
        UserManager: 0,
        VoiceStateManager: 5,


    }),
});


import eventHandler from "./handlers/eventHandler.js";
import idkHowToCallThisHandler from "./handlers/idkHowToCallThisHandler.js";
import mongoose from "mongoose";
import { QuestConfig } from "./interface/questConfig.js";
import { loadQuests } from "./utils/loadQuests.js";
import { questImagesInterface } from "./models/images.js";

await idkHowToCallThisHandler.init();
eventHandler.function();
loadQuests(client);

process.on("uncaughtException", config.debugMode ? console.error : error);
process.on("unhandledRejection", config.debugMode ? console.error : error);

mongoose.connect(config.mongoDB, {
    useBigInt64: true,


}).then(() => { console.log("Connected to MongoDB") }).catch((err) => { console.log(err) });

client.login(config.token);
