
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import emojis from "../../config/emojis.js";
import questsConfig from "../../config/questsConfig.js";
import { client } from "../../index.js";
import { QuestApi, QuestAssets } from "../../interface/quest.js";
import { isVideoFile } from "../../utils/quest/imageUtils.js";
import { getUrlFromDatabase, refreshExpiredImage } from "../../utils/quest/questsUtils.js";
import { decodeTimestampFromUrl } from "../../utils/quest/tokenUtils.js";
import { User } from "./User.js";
import { I18nInstance } from "../../core/i18n.js";
import { questRepo, questsCache } from "../../core/cache.js";
import { formatDiscordTimestamp } from "../../utils/tools.js";
import moment from "moment-timezone";
export enum RewardType {
    DiscordDecorations = 3,
    DiscordOrb = 4,
    Nitro = 5,
}
export class Quest {
    token: string;
    id: string
    user: User

    data: QuestApi
    constructor(quest: QuestApi, user: User) {
        this.id = quest.id;
        this.data = quest;
        this.user = user;
    }
    get i18n(): I18nInstance {
        return this.user.i18n;
    }
    get taskV1() {
        return this?.data?.config?.task_config?.tasks
    }
    get tasksV2() {
        return this?.data?.config?.task_config_v2?.tasks
    }
    get tasks() {
        return this.tasksV2 ?? this.taskV1
    }
    get application() {
        return this?.data?.config?.application
    }
    get assets() {
        return Object.entries(this?.data?.config?.assets).reduce((acc, [key, value]) => {
            acc[key] = this.cdn(value);
            return acc;
        }, {}) as QuestAssets
    }
    get startsAt() {
        return this?.data?.config?.starts_at
    }
    getTaskType(taskId: string) {
        const durationQuests = questsConfig.durationQuests;
        return durationQuests.includes(taskId) ? "duration" : "count"
    }
    get progress() {
        const progress = this?.data?.user_status?.progress;
        return Object.keys(this.tasks).map(key => {
            const task = this.tasks[key];
            const taskProgress = progress?.[key]
            const target = task.target;
            const current = taskProgress?.value ?? 0;
            const percent = Math.min(100, Math.floor((current / target) * 100));
            const emoji = client.getEmoji(key, true);
            const type = this.getTaskType(key);
            const completed = taskProgress?.completed_at && true || percent >= 100;
            const enrolled = this?.data?.user_status?.enrolled_at ? true : false;
            return {
                id: key,
                type: type,
                target,
                enrolled,
                current,
                percent,
                emoji,
                completed
            }
        }).sort((a, b) => b.percent - a.percent);
    }
    get rewards() {
        const rewards = this?.data?.config?.rewards_config.rewards;

        return rewards.map(reward => {

            return {

                ...reward
            }
        });


    }
    formatProgress(): string {
        const tasks = this.progress.map((task) => {
            return `-# ${task?.emoji || ""} ${task.percent}%`;
        });

        return `${tasks.join("\n").trim()}`;
    }
    formatTasks(i18n: I18nInstance = this.i18n): string {

        const capitalizeWords = (str: string) =>
            str
                .split("_")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(" ");

        const tasks = this.progress.map((task) => {
            const taskKey = task.id;
            const isDuration = task.type === "duration";

            // Compute target
            const target = isDuration ? task.target * 1000 : task.target;
            const formattedTarget = isDuration
                ? client.formatDuration(target, i18n.getLang(), ["m", "s"])
                : String(target);

            const i18nKey = `events.${taskKey}`
            let formattedName = this.i18n.t(i18nKey);
            if (formattedName == i18nKey) formattedName = capitalizeWords(taskKey);

            // Format description
            const taskDescription = isDuration
                ? `${i18n.t("for")} ${formattedTarget.trim()}`
                : formattedTarget;
            const emoji = task.emoji
            return `- ${formattedName} ${taskDescription} ${emoji || ""}`.trim();
        });

        return `**${tasks.join("\n")}**`;
    }

    isOrb(): boolean {
        return this.data.config.features.includes(RewardType.DiscordOrb);
    }
    isNitro(): boolean {
        return this.data.config.features.includes(RewardType.Nitro);
    }
    cdn(path: string) {
        if (!path) return null;
        const base = "https://cdn.discordapp.com";
        if (path?.startsWith("quests/")) {
            return `${base}/${path}`;
        }
        return `${base}/quests/${this.id}/${path}`;
    }
    async getRewardImage() {
        const reward = this?.rewards[0];
        const rewardId = reward?.sku_id;
        const customRewardsImage = questsConfig?.customRewardsImage?.[rewardId];
        if (customRewardsImage) {
            return customRewardsImage;
        };
        const rewardType = reward.type;
        const asset = reward.asset;
        if (!asset) return null;
        const url = this.cdn(asset);
        const fileName = `${reward.asset.split(".")[0]}-${this.id}`;
        const round = rewardType === RewardType.DiscordDecorations;
        const isVideo = isVideoFile(url);
        let finalUrl = url;
        if (isVideo) {
            const image = await getUrlFromDatabase(fileName, url, round);
            if (image) finalUrl = image;
        }
        return finalUrl;
    }
    get image() {
        const reward = this?.rewards[0];
        const rewardId = reward?.sku_id;
        const customRewardsImage = questsConfig?.customRewardsImage?.[rewardId];
        if (customRewardsImage) {
            return customRewardsImage;
        }
        const rewardType = reward.type;
        const asset = reward.asset;
        if (!asset) return null;
        const url = this.cdn(asset);
        const fileName = `${reward.asset.split(".")[0]}-${this.id}`;

        const isVideo = isVideoFile(url);
        const clientImage = client.images.get(fileName);
        let finalUrl = url;
        if (isVideo && !clientImage) {
            this.getRewardImage()
        }
        else if (isVideo && clientImage) {
            const isExpired = clientImage && decodeTimestampFromUrl(clientImage.url) < Date.now();
            if (isExpired) {
                refreshExpiredImage(clientImage);
            }
            finalUrl = clientImage.url;
        }
        return finalUrl;
    }

    async loadEmoji() {
        const currentEmoji = client.getEmoji(this.id, false);
        if (currentEmoji) return currentEmoji;
        const rewardImage = await this.getRewardImage();
        const isVideo = rewardImage && isVideoFile(rewardImage) || false;
        if (rewardImage && isVideo) return null;
        if (rewardImage && !isVideo) {

            return await client.createEmoji(this.id, rewardImage, true);
        }
    }
    get emoji() {
        const reward = this?.rewards?.[0];
        const rewardId = reward?.sku_id;
        const completed = this.isCompleted();

        // 1. Completed quest → priority
        if (completed) {
            return client.getEmoji("completed", false) || "✅";
        }

        // 2. Custom reward emoji
        if (rewardId) {
            const customId = questsConfig?.customRewardsEmoji?.[rewardId];
            if (customId) {
                const customEmoji = client.getEmoji(customId, false);
                if (customEmoji) return customEmoji;
            }
        }

        // 3. Quest-specific emoji
        let questEmoji = client.getEmoji(this.id, false);
        if (!questEmoji) {
            // Load asynchronously (no blocking)
            this.loadEmoji();
            // Re-check after load attempt
            questEmoji = client.getEmoji(this.id, false);
        }

        // 4. Fallback default
        return questEmoji || emojis(client)?.quest || "🎉";
    }


    get messages() {
        return this.data.config.messages;
    }
    get displayLabel() {
        return `${this?.messages?.game_title && `${this?.messages?.game_title}: ` || ""}${this?.messages?.quest_name}`;
    }
    get rewardLabel() {
        const reward = this?.rewards[0];
        const type = reward?.type;
        let i18nKey = `rewardTypes.${type}`
        let customRewardsLabel = this.i18n.t(`rewardTypes.${type}`);
        if (i18nKey == customRewardsLabel) customRewardsLabel = null;

        let text = reward.messages.name;
        if (customRewardsLabel) text += ` (${customRewardsLabel})`
        return text;
    }
    isCompleted(): boolean {
        return this?.data?.user_status?.completed_at ? true : false;
    }
    isSupported(): boolean {
        return this.progress.some(e => client.questsSupported.includes(e.id))
    }
    get solveMethod() {
        return this?.progress?.find(e => client.questsSupported.includes(e.id));
    }
    async getDb() {
        let quest = await questsCache.get(this.id);
        if (quest) return quest;


        if (!quest) {
            quest = await questRepo.findOne({ where: { questId: this.id } });
            if (!quest) {
                quest = questRepo.create({
                    questId: this.id,
                    messageSent: false,
                    timeSolved: 0,
                });
                await questRepo.save(quest);
            }
            questsCache.set(this.id, quest);
        }


        return quest
    }

    async incrementQuestSolved(): Promise<boolean> {
        let quest = await questsCache.get(this.id);

        if (!quest) {
            quest = await questRepo.findOne({ where: { questId: this.id } });
            if (!quest) {
                quest = questRepo.create({
                    questId: this.id,
                    messageSent: false,
                    timeSolved: 0,
                });
            }
        }

        quest.timeSolved = (quest.timeSolved || 0) + 1;

        await questRepo.save(quest);
        questsCache.set(this.id, quest);

        return true;
    }

    async getSolvedCount(): Promise<number> {
        let quest = await questsCache.get(this.id);

        if (!quest) {
            quest = await questRepo.findOne({ where: { questId: this.id } });
            if (quest) await questsCache.set(this.id, quest);
        }

        return quest?.timeSolved ?? 0;
    }
    getRewardsDisplay(i18n: I18nInstance = this.i18n) {

        const emojiList = client.emojisList;
        let rewards: any = this.rewards.map(reward => {
            let rewardText = reward.messages.name;
            const forWord = i18n.t("for");
            const months = i18n.t("months");
            const emoji = emojiList?.[`${reward.type}`];

            if ([1, 3].includes(reward.expiration_mode)) {
                rewardText += ` ${forWord} ${moment(reward.expires_at).diff(moment(moment(this.startsAt)), "months")} ${months}`;
            };
            if (emoji) {
                rewardText += ` ${emoji || ""}`;
            };
            return rewardText
        });
        return rewards = `- **${rewards.join("\n- ").trim()}**`;
    }
    async notification_message(i18n: I18nInstance = this.i18n) {
        await Promise.all([
            this.getRewardImage(),
        ])
        const quest = this;
        const role = questsConfig?.notification?.role;
        const isValidRole = client.isSnowflakeId(role);
        let rewards: any = this.getRewardsDisplay(i18n);
        const tasks = quest.formatTasks(i18n);
        const expiresAt = quest?.data?.config?.expires_at;
        const image = quest.image;


        const embed = new EmbedBuilder()
            .setTitle(i18n.t("message.newQuest"))
            .addFields(
                {
                    name: `${i18n.t("message.gameName")}:`,
                    value: `${quest.data.config.messages.game_title}`,
                    inline: true
                },
                {
                    name: i18n.t("message.questName") + ":",
                    value: `${quest.data.config.messages.quest_name}`,
                    inline: true
                },
                {
                    name: i18n.t("message.startsAT") + ":",
                    value: `${formatDiscordTimestamp(new Date(quest.startsAt).getTime(), "Date")} (${formatDiscordTimestamp(new Date(quest.startsAt).getTime(), "R")})`,
                    inline: false
                },
                {
                    name: `${i18n.t("message.expiresAt")}` + ":",
                    value: `${expiresAt ? `${formatDiscordTimestamp(new Date(expiresAt).getTime(), "Date")} (${formatDiscordTimestamp(new Date(expiresAt).getTime(), "R")})` : i18n.t("message.noExpires")}`,
                    inline: false
                },
            )

            .setColor(`#${quest.data.config.colors.primary.replace("#", "")}`)

            .setImage(quest.assets.hero)
            .setTimestamp(moment(quest.startsAt).toDate())
            .setFooter({ text: quest.data.config.application.name, iconURL: image ?? undefined })
            .setDescription(`## ${i18n.t("message.rewards")}: \n${rewards}\n\n## ${i18n.t("message.tasks")}:\n${tasks}`);


        if (image) {
            embed.setThumbnail(image);
        }


        let embeds = [embed];
        let content = undefined;
        if (isValidRole) {
            content = `||<@&${role}>||`
        };
        const supportButton = new ButtonBuilder().setEmoji("🤖").setStyle(ButtonStyle.Secondary).setDisabled(!this.isSupported).setCustomId(`supportbot`);
        const questLink = new ButtonBuilder().setStyle(ButtonStyle.Link).setEmoji("🔗").setLabel(i18n.t("badge.ViewQuest")).setURL(`https://discord.com/quests/${this.id}`);
        const buttonsRow = new ActionRowBuilder<any>().addComponents(questLink, supportButton);
        return { embeds: embeds, components: [buttonsRow], content };
    }


    get button(): ButtonBuilder {

        const i18n = this.i18n;
        const supported = this.isSupported();
        const completed = this.progress.some(e => e.completed);
        const enrolled = this.progress.some(e => e.enrolled);
        const started = this.user.started;
        const stoped = this.user.stoped;

        let customId: string;
        let label: string;
        let emoji: string;
        let style: ButtonStyle;
        let disabled = !enrolled || !supported;

        if (completed) {
            customId = "completed";
            label = i18n.t("buttons.completed")
            emoji = client.getEmoji("completed", false) || "✅";
            style = ButtonStyle.Secondary;
            disabled = true;
        }
        else if (!supported) {
            customId = "notsupported";
            label = i18n.t("buttons.notsupported")
            emoji = client.getEmoji("notsupported", false) || "❌";
            style = ButtonStyle.Secondary;
            disabled = true;
        }
        else if (enrolled) {
            if (started) {
                customId = "stop";
                label = i18n.t("buttons.stop")
                emoji = client.getEmoji("stop", false) || "⏹️";
                style = ButtonStyle.Secondary;
                disabled = stoped;
            } else {
                customId = "start";
                label = i18n.t("buttons.start")
                emoji = client.getEmoji("start", false) || "▶️";
                style = ButtonStyle.Secondary;
            }
        } else if (!enrolled && supported) {
            customId = "enroll";
            label = i18n.t("buttons.enroll")
            emoji = client.getEmoji("enroll", false) || "➕";
            style = ButtonStyle.Secondary;
            disabled = false
        }

        return new ButtonBuilder()
            .setCustomId(customId)
            .setLabel(label)
            .setEmoji(emoji)
            .setStyle(style)
            .setDisabled(disabled);
    }
    async enroll() {
        const url = `https://discord.com/api/v9/quests/${this.id}/enroll`;
        const data = { location: 11, is_targeted: false, metadata_raw: null }
        const response = await this.user.api.post(url, data).then(res => res.data).catch((err) => err?.response?.data);
        if (response?.enrolled_at) {
            this.data.user_status = response;
            return true;
        }
        else {
            return false;
        }

    }
    destroy() {
        /*   this.user = null!;
           this.data = null!;
           this.token = null;
           */




    }


}