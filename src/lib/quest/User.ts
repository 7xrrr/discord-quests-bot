import { AxiosInstance } from 'axios';
import { EventEmitter } from 'events';
import { customAxiosWithProxy } from '../../utils/quest/axiosInstance.js';

import { ProxyInterface } from '../../utils/loadProxy.js';
import { Quest } from './Quest.js';
import { usersCache } from '../../core/cache.js';
import { getIdFromToken, isValidDiscordToken } from '../../utils/quest/tokenUtils.js';
import { I18nInstance } from '../../core/i18n.js';
import { i18n } from '../../providers/i18n.js';
import config from '../../config/config.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js';
import moment from 'moment-timezone';
import client from '../../providers/client.js';
import { formatDiscordTimestamp } from '../../utils/tools.js';
import { ChildProcess } from 'child_process';
import { ChildMessage } from '../../interface/ChildMessage.js';
import { Logger } from '../../core/logger.js';
import questsConfig from '../../config/questsConfig.js';
import { User as discordUser } from "discord.js";
export class User extends EventEmitter {
    token: string;
    id: string;
    i18n: I18nInstance;
    destroyed: boolean = false;
    proxy: ProxyInterface | null;
    _api: AxiosInstance;
    selectedQuest: Quest | null = null;
    process: ChildProcess = null;
    started: boolean = false;
    logs: string[] = [];
    completed: boolean = false;
    stoped: boolean = false;
    quests: Collection<string, Quest> = new Collection();
    private _onExit = null;
    private _onMessage = null;

    constructor(token: string, proxy?: ProxyInterface) {
        if (!isValidDiscordToken(token) || !getIdFromToken(token)) throw new Error("Invalid Discord Token");
        super();
        this.token = token;
        this.proxy = proxy || null;
        this._api = null;

        this.id = getIdFromToken(this.token);
        usersCache.set(this.id, this);
        this.i18n = i18n.get(config.defaultLanguage)
    }
    setI18n(i18n: I18nInstance) {
        this.i18n = i18n;
    }
    get api(): AxiosInstance {
        if (!this._api) {
            this._api = customAxiosWithProxy(this.token, this.proxy);
        }
        return this._api;
    }
    setQuest(quest: Quest) {
        if (this.started) return;
        this.selectedQuest = quest;
    }
    setProcess(process: ChildProcess) {
        this.process = process;

        // keep references
        this._onExit = () => this.destroy();
        this._onMessage = (message: ChildMessage) => this.emit("message", message);

        this.process.on("exit", this._onExit);
        this.process.on("message", this._onMessage);
    }

    clearProcessListeners() {
        if (!this.process) return;
        if (this._onExit) this.process.off("exit", this._onExit);
        if (this._onMessage) this.process.off("message", this._onMessage);
        this._onExit = undefined;
        this._onMessage = undefined;
    }

    send(message: ChildMessage) {
        if (this.process && this?.process?.send) {
            this.process.send(message);
        }
    }
    async sendCompleted() {
        const guild = client.guilds.cache.get(questsConfig.serverId) ?? await client.guilds.fetch(questsConfig.serverId).catch(() => null);
        if (!guild) return;
        const channel = guild.channels.cache.get(questsConfig.completedQuestsChannel) ?? await guild.channels.fetch(questsConfig.completedQuestsChannel).catch(() => null);
        if (!channel?.isTextBased()) return;
        const user: discordUser = client.users.cache.get(this.id) ?? await client.users.fetch(this.id).catch(() => null);
        await this.selectedQuest.incrementQuestSolved();
        const solveCount = await this.selectedQuest.getSolvedCount();

        const messageContent = this.genreate_message();
        const embed = messageContent?.embeds?.[0] as EmbedBuilder

        const completedEmbed = new EmbedBuilder().setTitle("Quest Completed").setColor(embed.data.color)
            .setDescription(`- **Username:** \`${user ? user?.tag : "-"}\`\n- **User ID:** \`${this.id}\`\n- **Quest:** \`${this.selectedQuest.id}\`\n- **Solve Count:** \`${solveCount.toLocaleString()}\``);
        await channel.send({ embeds: [completedEmbed, embed] });





    }
    async start() {
        if (!this.selectedQuest || !this.process) return false;
        const quest = this?.selectedQuest;
        if (!quest || this.started) return false;
        const solveMethod = quest.solveMethod;
        const current = solveMethod.current;
        const target = solveMethod.target;
        this.started = true;
        this.quests.clear();
        this.quests.set(this.selectedQuest.id, this.selectedQuest);
        this.send({
            type: "start",
            data: {
                token: this.token,
                questId: this.selectedQuest.id,
                proxy: this.proxy,
                method: this.selectedQuest.solveMethod.id,
                current,
                target
            }

        })
    }
    async stop(immediate: boolean = false) {
        if (this.stoped) return;
        this.stoped = true;

        if (this.process) {
            this.send({
                type: "kill",
                target: this.id
            });
        }

        this.emit("stopped", true);

        if (immediate) {
            this.destroy();
            return;
        }

        setTimeout(() => {
            this.destroy();
        }, 500);
    }

    async updateProgress(progress: number, completed: boolean) {
        if (this.completed) return;

        const quest = this.selectedQuest;
        if (!quest) return;

        const methodId = quest.solveMethod?.id;
        if (!methodId) return;

        let currentProgress =
            quest.data?.user_status?.progress?.[methodId];

        // Fetch quests if progress data not yet available
        if (!currentProgress) {
            await this.fetchQuests();
            currentProgress =
                quest.data?.user_status?.progress?.[methodId];
            if (!currentProgress) return; // still nothing
        }
        currentProgress.value = progress;
        if (completed) {
            this.completed = true;
            currentProgress.completed_at = new Date().toISOString();
        }

        quest.data.user_status.progress[methodId] = currentProgress;
    }


    async fetchQuests() {
        try {
            const { data } = await this.api.get("/quests/@me");

            if (!Array.isArray(data?.quests)) {
                return null;
            }

            // Clear old quests
            this.quests.clear();

            // Add new quests
            for (const questData of data.quests) {
                const quest = new Quest(questData, this);
                this.quests.set(quest.id, quest);
            }

            // Remove expired quests
            for (const [id, quest] of this.quests) {
                const expiresAt = quest.data?.config?.expires_at;
                if (!expiresAt) continue;

                if (!moment(expiresAt).isAfter(moment())) {
                    this.quests.delete(id);
                }
            }
            if (this.selectedQuest) {
                this.selectedQuest = this.quests.get(this.selectedQuest.id);
            }
            if (this.started && this.selectedQuest) {
                this.quests.clear();
                this.quests.set(this.selectedQuest.id, this.selectedQuest);
            };

            return this.quests.size > 0 ? this.quests : null;
        } catch (err) {
            Logger.error("Error fetching quests:", err);
            return null;
        }
    }
    ConsoleString(): string {
        let lines: string[] = Array.from(new Set(this.logs.filter(d => d.trim().length > 0))).filter(d => d.trim().length > 0);
        lines = lines.map((line: string, i) => `[${i + 1}] ${line}`.trim());

        const maxLines: number = 15;
        if (lines.length > maxLines) {
            lines = lines.slice(lines.length - maxLines);
        }
        let output: string = questsConfig.logStrings?.join("\n");
        lines.map(d => output += `${d}\n`);
        return output;
    }

    genreate_message(

    ): any {
        const i18n = this.i18n;
        const quest = this.selectedQuest;
        const button = this.selectedQuest.button
        const files = [];
        const emojiList = client.emojisList;
        let rewards: any = quest.rewards.map(reward => {
            let rewardText = reward.messages.name;
            const forWord = this.i18n.t("for");
            const months = this.i18n.t("months");
            const emoji = emojiList?.[`${reward.type}`];

            if ([1, 3].includes(reward.expiration_mode)) {
                rewardText += ` ${forWord} ${moment(reward.expires_at).diff(moment(moment(quest.startsAt)), "months")} ${months}`;
            };
            if (emoji) {
                rewardText += ` ${emoji || ""}`;
            };
            return rewardText
        });
        rewards = `- **${rewards.join("\n- ").trim()}**`;
        const progress = quest.formatProgress()
        const tasks = quest.formatTasks()
        const enrolled = quest?.data.user_status?.enrolled_at;
        const expiresAt = quest?.data?.config?.expires_at;
        const image = quest.image;



        const embed = new EmbedBuilder()
            .addFields(
                {
                    name: `${i18n.t("message.gameName")}:`,
                    value: `${quest.data.config.messages.game_title}`,
                    inline: true
                },
                {
                    name: `${i18n.t("message.publisher")}:`,
                    value: `${quest.data.config.messages.game_publisher}`,
                    inline: true
                },
                {
                    name: i18n.t("message.questName") + ":",
                    value: `${quest.data.config.messages.quest_name}`,
                    inline: true
                },
                {
                    name: i18n.t("message.enrolledAt") + ":",
                    value: `${enrolled ? formatDiscordTimestamp(new Date(enrolled).getTime(), "Date") : "-"}`,
                    inline: true
                },
                {
                    name: `${i18n.t("message.expiresAt")}` + ":",
                    value: `${expiresAt ? formatDiscordTimestamp(new Date(expiresAt).getTime(), "Date") : "-"}`,
                    inline: true
                },
                {
                    name: `${i18n.t("message.progress")}` + ":",
                    value: `${progress}`,
                    inline: true
                },)

            .setColor(`#${quest.data.config.colors.primary.replace("#", "")}`)

            .setImage(quest.assets.hero)
            .setTimestamp(moment(quest.startsAt).toDate())
            .setFooter({ text: quest.data.config.application.name, iconURL: image ?? undefined })
            .setDescription(`## ${i18n.t("message.rewards")}: \n${rewards}\n\n## ${i18n.t("message.tasks")}:\n${tasks}`);


        if (image) {
            embed.setThumbnail(image);
        }
        const menu = new StringSelectMenuBuilder().setCustomId(`selectBadge`).setPlaceholder(this.i18n.t("badge.selectPlaceholder")).setMinValues(1).setMaxValues(1).setDisabled(this.started || this.stoped)
        this.quests.forEach((q) => {
            menu.addOptions({
                label: q.displayLabel.trim().slice(0, 100),
                value: q.id,
                default: q.id === this.selectedQuest.id,
                description: q.rewardLabel.trim().slice(0, 100),
                emoji: q.emoji
            });
        })


        let embeds = [embed];


        if (this.started) {

            let logEmbed = new EmbedBuilder().setTitle(`${this.i18n.t("badge.logs")}`).setDescription(`\`\`\`prolog\n======================================================\n${this.ConsoleString()}\`\`\``).setColor(embed.data.color);
            embeds.push(logEmbed);

        }
        if (this.started && this.completed) {
            let password = new EmbedBuilder().setColor(embed.data.color).setDescription(`-# ${i18n.t("badge.pleaseChangeYourPassword")}`)
            embeds.push(password);
        };
        const refreshButton = new ButtonBuilder()
            .setCustomId("refresh").setEmoji("🔄").setStyle(ButtonStyle.Secondary).setDisabled(this.started === true || this.stoped);
        const questLink = new ButtonBuilder().setStyle(ButtonStyle.Link).setEmoji("🔗").setLabel(i18n.t("badge.ViewQuest")).setURL(`https://discord.com/quests/${this.selectedQuest.id}`)
        const buttonsRow = new ActionRowBuilder<any>().setComponents(button).addComponents(refreshButton).addComponents(questLink);
        const buttons = questsConfig.buttons;


        for (let index = 0; index < buttons.length; index++) {
            const button = buttons[index] as any
            let emoji = button?.emoji;
            if (emoji && typeof (emoji) == "function") {
                // @ts-ignore
                emoji = emoji(client);
            }
            const buttonBuilder = new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
            if (button.text) buttonBuilder.setLabel(button.text);
            if (button.url) buttonBuilder.setURL(button.url);
            if (emoji) buttonBuilder.setEmoji(`${emoji}`);
            buttonsRow.addComponents(buttonBuilder);
        }



        return { files, embeds: embeds, components: [new ActionRowBuilder<any>().setComponents(menu), buttonsRow] };
    }
    destroy() {
        this.destroyed = true;
        usersCache.delete(this.id);
        this.quests.map(quest => quest.destroy());
        this.quests.clear();
        this.quests.set(this.selectedQuest?.id, this.selectedQuest);
        this.process = null;
        this.proxy = null;
        this.logs = this.logs.reverse().slice(0, 5).reverse(); // keep last 5 logs
        // this.selectedQuest = null;
        this.removeAllListeners();
        this.clearProcessListeners();
    }

}
