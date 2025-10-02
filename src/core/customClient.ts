
import { ActivityType, ChatInputCommandInteraction, Client, Collection, parseEmoji, SnowflakeUtil } from "discord.js";
import { Logger } from "../core/logger.js";
import { SlashCommand } from "../lib/handler/slashCommand.js";
import { messageCommand } from "../lib/handler/messageCommand.js";
import config from "../config/config.js";
import I18nManager from "../core/i18n.js";
import { i18n } from "../providers/i18n.js";
import GuildDocument from "../entities/guildSettings.js";
import { duration, findClosestIndexFolder, findProjectRoot } from "../utils/tools.js";
import ms from "ms";
import { buttonCommand } from "../lib/handler/buttons.js";
import path from "path";
import fs from "fs";
import { Config } from "../interface/config.js";
import readProxy, { ProxyInterface } from "../utils/loadProxy.js";
import ImageEntity from "../entities/image.js";
import emojis from "../config/emojis.js";
import { loadFolder } from "../handler/folderLoader.js";
import { QuestConfig } from "../lib/questConfig.js";
import { ChildManager } from "./ChildManager.js";
import questsConfig from "../config/questsConfig.js";
import UserDocument from "../entities/userSettings.js";
import { customCollection } from "../lib/handler/customCollection.js";

export class CustomClient extends Client {
    cooldowns: Collection<string, any> = new Collection();
    messageCommands: Collection<String, messageCommand> = new Collection();
    slashCommands: Collection<String, SlashCommand> = new Collection();
    buttons: Collection<String, buttonCommand> = new Collection();
    menus: Collection<String, any> = new Collection();
    i18n: I18nManager = i18n;
    ready: boolean = false;
    guildSettings: Collection<string, GuildDocument> = new Collection();
    userSettings: customCollection<string, UserDocument> = new customCollection();
    config: Config = config;
    proxy: Collection<string, ProxyInterface> = new Collection();
    images: Collection<string, ImageEntity> = new Collection();
    questsSupported: string[] = [];

    private emojiTasks: Map<string, Promise<string>> = new Map();


    constructor(options: any) {
        super(options);
        this.loadQuests();

        this.once("ready", () => {
            this.loadEmojis();
            this.loadChildProcess();
            readProxy(this.proxy);
   


        });

    }
    async loadQuests() {
        const rootDir = findClosestIndexFolder();

        const questsFolder = path.join(rootDir, "quests");
        const quests = await loadFolder(questsFolder, { logger: true, shouldReturn: true, subFolders: true }) as QuestConfig[]
        this.questsSupported = quests.map(q => q.name);
        Logger.info(`Quests loaded: ${this.questsSupported.length}`);
        Logger.info(`Quests: ${this.questsSupported}`);
    }
    async loadChildProcess() {

        ChildManager.loadChildProcess();
    }
    updateActivity() {
        this.user?.setActivity(`Managing ${ChildManager.TotalUsage}/${ChildManager.maxUsage} solver(s)`, { type: ActivityType.Competing, url: questsConfig.inviteUrl })
    }
    /*
    async getUserSettings(id:string) {
        const cache = this.userSettings.get(id);
        if(cache) return cache;
        const userData = await userSettingsRepo.findOne({ where: { userId:id } });
        if(userData) {
            this.userSettings.tempSet(id, userData,this.clientMs("30m"));
            return userData;
        }
   
    }*/

    async loadEmojis() {
        try {
            await this.application.emojis.fetch().then((e) => Logger.info(`Emojis loaded: ${e.size}`));
        } catch (error) {
            Logger.error("Error fetching emojis:", error);
        } finally {
            const emojiFolderPath = path.join(findProjectRoot(), "emojis");
            if (fs.existsSync(emojiFolderPath) && fs.statSync(emojiFolderPath).isDirectory()) {
                const emojiFiles = fs.readdirSync(emojiFolderPath).filter(file => ["png", "gif", "jpg", "jpeg",].includes(file.split(".").pop().toLowerCase()));
                for (const file of emojiFiles) {
                    const emojiName = file.split(".")[0];
                    const emojiUrl = path.join(emojiFolderPath, file);
                    if (!this.getEmoji(emojiName, false)) {
                        try {
                            const buffer = fs.readFileSync(emojiUrl);
                            await this.createEmojiWithBuffer(emojiName, buffer, true);
                        } catch (error) {
                            Logger.error(`Error creating emoji ${emojiName}:`, error);
                            continue;
                        }
                    }
                }

            }
        }

    }
    getEmoji = (emojiName: string, returnBlank: boolean) => {
        const emoji = this.application.emojis.cache.find(
            (e) => e.name?.toLowerCase().trim() === emojiName?.toLowerCase().trim()
        );
        return emoji ? emoji.toString() : returnBlank ? "" : null
    };
    get emojisList() {
        return emojis(this);
    }

    createEmoji = async (emojiName: string, emojiUrl: string, force: boolean = false) => {
        // If already exists and force is false, return cached emoji immediately
        const existing = this.getEmoji(emojiName, false);
        if (existing && !force) {
            return existing;
        }

        // If a task is already in progress for this emoji, return the same promise
        if (this.emojiTasks.has(emojiName)) {
            return this.emojiTasks.get(emojiName)!;
        }

        // Create a new task
        const task = (async () => {
            try {
                const createdEmoji = await this.application.emojis.create({
                    attachment: emojiUrl,
                    name: emojiName,
                });
                Logger.info(`Emoji ${createdEmoji.name} created`);
                return createdEmoji.toString();
            } finally {
                // Once finished, remove from task map so future calls can retry if needed
                this.emojiTasks.delete(emojiName);
            }
        })();

        // Cache the promise
        this.emojiTasks.set(emojiName, task);

        return task;
    };
    deleteEmoji = async (emojiName: string) => {
        const emoji = this.getEmoji(emojiName, false);
        const id = emoji && parseEmoji(emoji)?.id;
        if (emoji && id) {
            await this.application.emojis.delete(id);
            Logger.info(`Emoji ${emojiName} deleted`);
            return true;
        }
    }
    formatDuration = duration;
    clientMs = ms;
    ms = ms;
    createEmojiWithBuffer = async (emojiName: string, buffer: Buffer, force: boolean = false) => {

        const emoji = this.getEmoji(emojiName, false);
        if (emoji) {
            return emoji
        } else {

            const createdEmoji = await this.application.emojis.create({
                attachment: buffer,
                name: emojiName,
            });
            Logger.info(`Emoji ${createdEmoji.name} created`);
            return createdEmoji.toString();
        }
    };
    getCommandName(interaction: ChatInputCommandInteraction): string {
        if (!interaction.isChatInputCommand()) return null;
        let commandName = interaction.commandName.toLowerCase();
        const subCommandName = interaction.options.getSubcommand(false);
        const subCommandGroupName = interaction.options.getSubcommandGroup(false);

        if (subCommandGroupName) {
            commandName += `-${subCommandGroupName}`;
        }
        if (subCommandName) {
            commandName += `-${subCommandName}`;
        }

        return commandName.toLowerCase().toLowerCase();
    }
    isSnowflakeId(id: string): boolean {
        try {
            const snowflakeRegex = /^\d{17,19}$/; // Discord IDs are 17-19 digits long
            const timetest = SnowflakeUtil.timestampFrom(id);
            return snowflakeRegex.test(id) && timetest > 0;
        } catch (error) {
            return false;
        }


    }

}





