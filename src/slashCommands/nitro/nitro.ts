import { ActionRowBuilder, ChatInputCommandInteraction, EmbedBuilder, GuildMember, InteractionReplyOptions, SlashCommandUserOption, StringSelectMenuBuilder, User } from "discord.js";
import { SlashCommand, slashCommandFlags } from "../../lib/handler/slashCommand.js";
import { CustomClient } from "../../core/customClient.js";
import { permissionList } from "../../lib/handler/messageCommand.js";
import { I18nInstance } from "../../core/i18n.js";
import questsConfig from "../../config/questsConfig.js";
import { selfUser } from "../../events/quest/newQuests.js";
import moment from "moment-timezone";
import { capitalizeWords, disableComponents, formatDiscordTimestamp } from "../../utils/tools.js";
import { client } from "../../index.js";
import ms from "ms";
const levels = [{ level: "Stone", months: 0, color: "#495879", emoji: "nitro_level_stone", }, { level: "Bronze", months: 1, color: "#E78A34", emoji: "nitro_level_Bronze", }, { level: "Silver", months: 3, color: "#BFCED7", emoji: "nitro_level_Silver", }, { level: "Gold", color: "#E48101", months: 6, emoji: "nitro_level_Gold", }, { level: "Platinum", color: "#7AD3FF", months: 12 * 1, emoji: "nitro_level_Platinum", }, { level: "Diamond", color: "#D48BFF", months: 12 * 2, emoji: "nitro_level_Diamond", }, { level: "Emerald", color: "#CCFB4B", months: 12 * 3, emoji: "nitro_level_emerald", }, { level: "Ruby", color: "#7A181F", months: 12 * 5, emoji: "nitro_level_Ruby", }, { level: "Opal", color: "#078193", months: 12 * 6, emoji: "nitro_level_Opal", },]
export default class setLang extends SlashCommand {
    public name: string = "nitro";
    public description: string = "Show the nitro level calculator";
    public options = [
        new SlashCommandUserOption().setRequired(false).setName("member").setDescription("account"),
    ];
    public cooldown: number | string = "1m";
    public allowedRoles?: string[] = [];
    public allowedServers?: string[] = [];
    public allowedUsers?: string[] = [];
    public allowedChannels?: string[] = [];
    public permissions: permissionList[] = [];
    public bot_permissions: permissionList[] = [];
    public flags: slashCommandFlags[] = ["ephemeral", "onlyDm", "onlyGuild"];
    public async execute({
        interaction,
        client,
        i18n,
        lang
    }: {
        interaction: ChatInputCommandInteraction;
        client: CustomClient;
        i18n: I18nInstance;
        lang: string;
    }): Promise<any> {
        if (!selfUser) {
            return interaction.editReply({ embeds: [new EmbedBuilder().setDescription(i18n.t("boost.botNotReady")).setColor("DarkRed")] });
        };
        const guild = questsConfig.serverId.includes(interaction.guildId) ? interaction.guild : client.guilds.cache.get(questsConfig.serverId);
        const user = guild && (interaction.options.getUser("member") || interaction.user) || null;
        const member: GuildMember = user && await guild.members.fetch(user.id).catch((err) => null);
        if (!member) return interaction.editReply({ embeds: [new EmbedBuilder().setDescription(i18n.t("boost.memberNotFound")).setColor("DarkRed")] });
        const userProfile = (await selfUser.api.get(`users/${member.user.id}/profile`).catch((err) => null))?.data;
        if (!userProfile) return interaction.editReply({ embeds: [new EmbedBuilder().setDescription(i18n.t("boost.userProfileNotFound")).setColor("DarkRed")] });
        if (!userProfile?.premium_guild_since) return interaction.editReply({ embeds: [new EmbedBuilder().setDescription(i18n.t("nitro.noActiveNitro")).setColor("DarkRed")] });
        const nitroDate = moment(userProfile.premium_since).toDate();
        const color = "#495879";


        let commandConfig = {
            targetLevel: "none",
        }
        // @ts-ignore
        const message = await interaction.editReply({ ...genratePayLoad(i18n, nitroDate, user, commandConfig.targetLevel, color) });
        // @ts-ignore
        if (message.components[0].components[0].disabled) return;
        const collecter = message.createMessageComponentCollector({ filter: (i) => i.user.id === interaction.user.id, time: ms("5m") });
        collecter.on("collect", async (i) => {
            if (!i.isStringSelectMenu()) return;
            const selected = i.values[0];
            commandConfig.targetLevel = selected;
            // @ts-ignore
            await i.update({ ...genratePayLoad(i18n, nitroDate, user, commandConfig.targetLevel, color) });
        })

        collecter.on("end", async () => {
            const reply = await interaction.fetchReply().catch((err) => null);
            if (!reply) return;


            interaction.editReply({ components: disableComponents(reply.components), }).catch((err) => null)
        })









    }
}
function genratePayLoad(i18n: I18nInstance, nitroDate: Date, author: User, targetLevelName: string, color?: string): InteractionReplyOptions {

    const months = moment().diff(nitroDate, "months");
    const sortedLevels = levels.sort((a, b) => b.months - a.months);
    const nitroLevel = sortedLevels.find((l) => l.months <= months);
    const nextLevel = sortedLevels.reverse().find((l) => l.months > months);
    const targetLevel = targetLevelName !== "none" ? sortedLevels.reverse().find((l) => l.level === targetLevelName) : nextLevel;
    const higherNitroLevels = sortedLevels.filter((l) => l.months > nitroLevel.months).sort((a, b) => a.months - b.months);
    const t = (key: string) => i18n.t(`nitro.${key}`);

    const menu = new StringSelectMenuBuilder()
        .setMaxValues(1)
        .setMinValues(1)
        .setCustomId("nitro_level")
        .setPlaceholder(t("selectNitroLevel"));
    if (higherNitroLevels.length > 0) {
        for (const level of higherNitroLevels) {
            menu.addOptions({
                label: `${capitalizeWords(level.level).trim()}`,
                emoji: client.getEmoji(level?.emoji, false) || "⭐",
                value: level.level.toString(),
                default: level?.level === targetLevel?.level || false,
                description: i18n.t("nitro.nitroLevelAfter", { level: level.level, months: level.months }),
            })
        }
    }
    else {
        menu.addOptions({
            label: t("maxLevel"),
            emoji: client.getEmoji(nitroLevel?.emoji, false) || "⭐",
            value: nitroLevel.level.toString(),
            default: true,
            description: t("noMoreLevels")
        })
        menu.setDisabled(true)
    };
    const currentLevel = {
        emoji: nitroLevel?.emoji && client.getEmoji(nitroLevel?.emoji, false) || "⭐",
        level: nitroLevel.level,
        months: nitroLevel.months,

    }
    const nextLevelData = {
        emoji: nextLevel?.emoji && client.getEmoji(nextLevel?.emoji, false) || "⭐",
        level: nextLevel?.level,
        months: nextLevel?.months,
        nextLevelDate: nextLevel && moment(nitroDate).add(nextLevel.months, "months").toDate(),
    }
    const targetLevelData = {
        emoji: targetLevel?.emoji && client.getEmoji(targetLevel?.emoji, false) || "⭐",
        level: targetLevel?.level,
        months: targetLevel?.months,
        targetLevelDate: targetLevel && moment(nitroDate).add(targetLevel.months, "months").toDate(),
    }

    let embedDescription = ``;
    embedDescription += `- **${t("nitroLevel")} ${currentLevel.level}** ${currentLevel.emoji}\n`;
    embedDescription += `-# -  ${t("SubscriberSince")} ${formatDiscordTimestamp(nitroDate.getTime(), "Date")}\n`;
    embedDescription += `-# -  ${t("SubscriptionStreak")}: \`${months}\` ${i18n.t("months")}\n\n`;
    if (nextLevel) {
        embedDescription += `- **${t("nextLevel")} ${nextLevelData.level}** ${nextLevelData.emoji}\n`;
        embedDescription += `-# - ${t("nextLevelDate")} ${formatDiscordTimestamp(nextLevelData.nextLevelDate.getTime(), "Date")}\n`;
        embedDescription += `-# - ${t("nextLevelIn")}: ${formatDiscordTimestamp(nextLevelData.nextLevelDate.getTime(), "R")}\n\n`;


        if (nextLevel.level !== targetLevel.level) {
            embedDescription += `- **${t("targetLevel")} ${targetLevelData.level}** ${targetLevelData.emoji}\n`;
            embedDescription += `-# - ${t("targetLevelDate")} ${formatDiscordTimestamp(targetLevelData.targetLevelDate.getTime(), "Date")}\n`;
            embedDescription += `-# - ${t("TargetLevelIn")}: ${formatDiscordTimestamp(targetLevelData.targetLevelDate.getTime(), "R")}\n\n`;
        }

    }
    else {
        embedDescription += `- **${t("reachedMaxNitro")}** ${currentLevel.emoji}\n\n`;
    }
    embedDescription += `-# -  **${t("developed")}**\n`;



    const embed = new EmbedBuilder().setThumbnail(author.displayAvatarURL()).setAuthor({ name: author.tag, iconURL: author.displayAvatarURL() }).setDescription(embedDescription).setColor(`#${nitroLevel.color.replace("#", "").trim()}`).setFooter({ text: t("nitroLevelCalculator"), iconURL: client.user.avatarURL() || undefined }).setImage("https://l.top4top.io/p_3343gfeqt1.png")

    return {
        components: [new ActionRowBuilder<any>().addComponents(menu)],
        embeds: [embed],

    }




}