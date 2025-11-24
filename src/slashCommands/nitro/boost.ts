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
const levels = [{ level: 1, months: 0, emoji: "boost_level_1", }, { level: 2, months: 2, emoji: "boost_level_2", }, { level: 3, months: 3, emoji: "boost_level_3", }, { level: 4, months: 6, emoji: "boost_level_4", }, { level: 5, months: 9, emoji: "boost_level_5", }, { level: 6, months: 12, emoji: "boost_level_6", }, { level: 7, months: 15, emoji: "boost_level_7", }, { level: 8, months: 18, emoji: "boost_level_8", }, { level: 9, months: 24, emoji: "boost_level_9", },]

export default class setLang extends SlashCommand {
    public name: string = "boost";
    public description: string = "Show the boost level calculator";
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
        if (!userProfile?.premium_guild_since) return interaction.editReply({ embeds: [new EmbedBuilder().setDescription(i18n.t("boost.noActiveBoost")).setColor("DarkRed")] });
        const boostDate = moment(userProfile.premium_guild_since).toDate();
        const color = "#BE7AB7";


        let commandConfig = {
            targetLevel: -1,
        }
        // @ts-ignore
        const message = await interaction.editReply({ ...genratePayLoad(i18n, boostDate, user, commandConfig.targetLevel, color) });
        // @ts-ignore
        if (message.components[0].components[0].disabled) return;
        const collecter = message.createMessageComponentCollector({ filter: (i) => i.user.id === interaction.user.id, time: ms("5m") });
        collecter.on("collect", async (i) => {
            if (!i.isStringSelectMenu()) return;
            const selected = i.values[0];
            commandConfig.targetLevel = parseInt(selected);
            // @ts-ignore
            await i.update({ ...genratePayLoad(i18n, boostDate, user, commandConfig.targetLevel, color) });
        })

        collecter.on("end", async () => {
            const reply = await interaction.fetchReply().catch((err) => null);
            if (!reply) return;


            interaction.editReply({ components: disableComponents(reply.components), }).catch((err) => null)
        })






    }
}
function genratePayLoad(i18n: I18nInstance, boostDate: Date, author: User, targetLevelNumber: number, color?: string): InteractionReplyOptions {

    const months = moment().diff(boostDate, "months");
    const sortedLevels = levels.sort((a, b) => b.months - a.months);
    const boostLevel = sortedLevels.find((l) => l.months <= months);
    const nextLevel = sortedLevels.reverse().find((l) => l.months > months);
    const targetLevel = targetLevelNumber !== -1 ? sortedLevels.reverse().find((l) => l.level === targetLevelNumber) : nextLevel;
    const higherBoostLevels = sortedLevels.filter((l) => l.level > boostLevel.level).sort((a, b) => a.months - b.months);

    const menu = new StringSelectMenuBuilder()
        .setMaxValues(1)
        .setMinValues(1)
        .setCustomId("boost_level")
        .setPlaceholder(i18n.t("boost.selectBoostLevel"));
    if (higherBoostLevels.length > 0) {
        for (const level of higherBoostLevels) {
            menu.addOptions({
                label: `${level.months} ${capitalizeWords(i18n.t("months"))}`,
                emoji: client.getEmoji(level?.emoji, false) || "⭐",
                value: level.level.toString(),
                default: level?.level === targetLevel?.level || false,
                description: i18n.t("boost.boostLevelAfter", { level: level.level, months: level.months })
            })
        }
    }
    else {
        menu.addOptions({
            label: i18n.t("boost.maxLevel"),
            emoji: client.getEmoji(boostLevel?.emoji, false) || "⭐",
            value: boostLevel.level.toString(),
            default: true,
            description: i18n.t("boost.noMoreLevels"),
        })
        menu.setDisabled(true)
    };
    const currentLevel = {
        emoji: boostLevel?.emoji && client.getEmoji(boostLevel?.emoji, false) || "⭐",
        level: boostLevel.level,
        months: boostLevel.months,

    }
    const nextLevelData = {
        emoji: nextLevel?.emoji && client.getEmoji(nextLevel?.emoji, false) || "⭐",
        level: nextLevel?.level,
        months: nextLevel?.months,
        nextLevelDate: nextLevel && moment(boostDate).add(nextLevel.months, "months").toDate(),
    }
    const targetLevelData = {
        emoji: targetLevel?.emoji && client.getEmoji(targetLevel?.emoji, false) || "⭐",
        level: targetLevel?.level,
        months: targetLevel?.months,
        targetLevelDate: targetLevel && moment(boostDate).add(targetLevel.months, "months").toDate(),
    }

    let embedDescription = ``;
    embedDescription += `- **${i18n.t("boost.+")} ${currentLevel.level}** ${currentLevel.emoji}\n`;
    embedDescription += `-# -  ${i18n.t("boost.boostLevel")} ${formatDiscordTimestamp(boostDate.getTime(), "Date")}\n`;
    embedDescription += `-# -  ${i18n.t("boost.boostingStreak")}: \`${months}\` Months\n\n`;
    if (nextLevel) {
        embedDescription += `- **${i18n.t("boost.nextLevel")} ${nextLevelData.level}** ${nextLevelData.emoji}\n`;
        embedDescription += `-# - ${i18n.t("boost.nextLevelDate")} ${formatDiscordTimestamp(nextLevelData.nextLevelDate.getTime(), "Date")}\n`;
        embedDescription += `-# - ${i18n.t("boost.nextLevelIn")}: ${formatDiscordTimestamp(nextLevelData.nextLevelDate.getTime(), "R")}\n\n`;


        if (nextLevel.level !== targetLevel.level) {
            embedDescription += `- **${i18n.t("boost.targetLevel")} ${targetLevelData.level}** ${targetLevelData.emoji}\n`;
            embedDescription += `-# - ${i18n.t("boost.targetLevelDate")} ${formatDiscordTimestamp(targetLevelData.targetLevelDate.getTime(), "Date")}\n`;
            embedDescription += `-# - ${i18n.t("boost.TargetLevelIn")}: ${formatDiscordTimestamp(targetLevelData.targetLevelDate.getTime(), "R")}\n\n`;
        }

    }
    else {
        embedDescription += `- **${i18n.t("boost.reachedMaxBoost")}** ${currentLevel.emoji}\n\n`;
    }
    embedDescription += `-# -  **${i18n.t("boost.developed")}**\n`;



    const embed = new EmbedBuilder().setDescription(embedDescription).setThumbnail(author.displayAvatarURL()).setAuthor({ name: author.tag, iconURL: author.displayAvatarURL() }).setColor(`#${color.replace("#", "").trim()}`).setFooter({ text: i18n.t("boost.boostLevelCalculator"), iconURL: client.user.avatarURL() || undefined }).setImage("https://k.top4top.io/p_3343xcnvn1.png")

    return {
        components: [new ActionRowBuilder<any>().addComponents(menu)],
        embeds: [embed],

    }




}