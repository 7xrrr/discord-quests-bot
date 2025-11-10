import { ClientEvents, Collection, Guild, GuildMember, Message, Snowflake, TextChannel } from "discord.js";
import { baseDiscordEvent } from "../../lib/handler/baseClientEvent.js";
import cron from "node-cron";
import { Quest } from "../../lib/quest/Quest.js";
import { User } from "../../lib/quest/User.js";
import questsConfig from "../../config/questsConfig.js";
import { getIdFromToken, isValidDiscordToken } from "../../utils/quest/tokenUtils.js";
import { questRepo, userSettingsRepo } from "../../core/cache.js";
import moment from "moment-timezone";

const token = questsConfig?.notification?.token || "";
const isValidToken = isValidDiscordToken(token) && getIdFromToken(token) !== null;
export const selfUser = isValidToken ? new User(token) : null;

export default class readyEvent extends baseDiscordEvent {
    public name: keyof ClientEvents = "clientReady";
    public once: boolean = true;

    /** Check if the quest has already been sent */
    private async checkQuest(quest: Quest) {
        const questDb = await quest.getDb();
        return questDb.messageSent ? null : questDb;
    }

    /** Fetch guild and notification channel */
    private async getGuildAndChannel(): Promise<{ guild: Guild; channel: TextChannel } | null> {
        const guild = this.client.guilds.cache.get(questsConfig.serverId)
            ?? await this.client.guilds.fetch(questsConfig.serverId).catch(() => null);

        if (!guild) {
            this.logger.warn("Bot is not in the specified server. Quest notifications disabled.");
            return null;
        }

        const channel = guild.channels.cache.get(questsConfig.notification.channel)
            ?? await guild.channels.fetch(questsConfig.notification.channel).catch(() => null);

        if (!channel?.isTextBased()) {
            this.logger.warn("Notification channel is invalid or not text-based. Quest notifications disabled.");
            return null;
        }

        return { guild, channel: channel as TextChannel };
    }

    /** Fetch members eligible for DM notifications */
    private async fetchMembersToDM(guild: Guild): Promise<Collection<Snowflake, GuildMember> | null> {
        const dmRoles = questsConfig?.notification?.dm?.dmRoles || [];
        if (!questsConfig.notification.dm?.enabled || dmRoles.length === 0) return null;

        const members = await guild.members.fetch().catch(() => null);
        if (!members) return null;

        const eligibleMembers = members.filter(
            member => !member.user.bot && dmRoles.some(r => member.roles.cache.has(r))
        );

        if (eligibleMembers.size === 0) {
            this.logger.warn("No members with the specified DM roles found. Disabling DM notifications.");
            return null;
        }

        return eligibleMembers;
    }

    /** Fetch user settings with caching */
    private async getUserSettings(id: string) {
        const cache = this.client.userSettings.get(id);
        if (cache) return cache;

        const userData = await userSettingsRepo.findOne({ where: { userId: id } });
        if (userData) {
            this.client.userSettings.tempSet(id, userData, this.client.clientMs("30m"));
            return userData;
        }
    }

    /** Send quest notification to channel and optionally via DM */
    private async sendQuestNotification(
        quest: Quest,
        questDoc: any,
        channel: TextChannel,
        members: Collection<Snowflake, GuildMember> | null
    ) {
        const messageContent = await quest.notification_message();

        // Send to channel
        const channelMessage: Message = await channel.send({ ...messageContent })
            .then(async (channelMessage) => {
                this.logger.info(`Sent notification for quest ${quest.id} in channel ${channel.id}`);
                questDoc.messageSent = true;
                await questRepo.save(questDoc);
                return channelMessage;
            })
            .catch(() => {
                this.logger.warn(`Failed to send notification for quest ${quest.id} in channel ${channel.id}`);
                return null;
            })
        if (channelMessage) {
            channelMessage.crosspost().then(() => {
                this.logger.info(`Crossposted quest ${quest.id} notification in channel ${channel.id}`);
            }).catch(() => {
                this.logger.warn(`Failed to crosspost quest ${quest.id} notification in channel ${channel.id}`);
            })
        };

        // Send via DM if applicable
        if (!members?.size) return;

        for (const member of members.values()) {
            const userSettings = await this.getUserSettings(member.id);
            const lang = userSettings?.lang ?? this?.client?.config?.defaultLanguage ?? "en";
            const i18n = this.i18n.get(lang);
            const userMessage = await quest.notification_message(i18n);
            member.send({ ...userMessage, content: `${member.toString()}` })
                .then(() => this.logger.info(`Sent DM for quest ${quest.id} to user ${member.user.tag}`))
                .catch(() => null);
        }
    }

    /** Main execution */
    async executeEvent(): Promise<void> {
        if (!selfUser) {
            this.logger.warn("Invalid or missing quest notification token. Quest notifications will be disabled.");
            return;
        }

        // Cron: every 5 minutes
        cron.schedule("0 */5 * * * *", async () => {
            this.logger.info("Checking for new quests...");

            const guildAndChannel = await this.getGuildAndChannel();
            if (!guildAndChannel) return;
            const { guild, channel } = guildAndChannel;
            const oldQuests = new Collection<string, Quest>();


            selfUser.quests.forEach(q => oldQuests.set(q.id, q));
            const newQuests = await selfUser.fetchQuests();

            
            // Only quests that are new and started within last 6 hours
            const diff = newQuests.filter(q =>
                !oldQuests.has(q.id) &&
                moment(q.startsAt).isAfter(moment().subtract(6, "hours"))
            );
            if (!diff.size) return;
            const members = await this.fetchMembersToDM(guild);
            const unSentQuests = await Promise.all(diff.map(q => this.checkQuest(q)));
            const filteredQuests = unSentQuests.filter(q => q !== null);

            for (const questDoc of filteredQuests) {
                const quest = newQuests.get(questDoc.questId);
                if (!quest) continue;
                await this.sendQuestNotification(quest, questDoc, channel, members);
            }

            this.logger.info(`Quest check completed at ${new Date().toISOString()}`);
        });
    }
}
