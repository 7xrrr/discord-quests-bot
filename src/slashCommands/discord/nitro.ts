
import { ActionRowBuilder, ChatInputCommandInteraction, EmbedBuilder, GuildMember, InteractionContextType, InteractionReplyOptions, SlashCommandUserOption, StringSelectMenuBuilder, User } from "discord.js";
import ms from "ms";
import { selfBotAxios } from "../../events/guild/newQuests.js";
import moment from "moment-timezone";
import { getEmojiFromClient } from "../../questFunc/Message.js";
import { client } from "../../index.js";
import { disableComponents, formatDiscordTimestamp, uppercaseFirstLetter } from "../../utils/tools.js";
import config from "../../config.js";

const levels = [
    {
        level: "Stone",
        months: 0,
        color: "#495879",
        emoji: "nitro_level_stone",
    },
    {
        level: "Bronze",
        months: 1,
        color: "#E78A34",
        emoji: "nitro_level_Bronze",
    },
    {
        level: "Silver",
        months: 3,
        color: "#BFCED7",
        emoji: "nitro_level_Silver",
    },
    {
        level: "Gold",
        color: "#E48101",
        months: 6,
        emoji: "nitro_level_Gold",
    },
    {
        level: "Platinum",
        color: "#7AD3FF",
        months: 12 * 1,
        emoji: "nitro_level_Platinum",
    },
    {
        level: "Diamond",
        color: "#D48BFF",
        months: 12 * 2,
        emoji: "nitro_level_Diamond",
    },
    {
        level: "Emerald",
        color: "#CCFB4B",
        months: 12 * 3,
        emoji: "nitro_level_emerald",
    },
    {
        level: "Ruby",
        color: "#7A181F",
        months: 12 * 5,
        emoji: "nitro_level_Ruby",
    },
    {
        level: "Opal",
        color: "#078193",
        months: 12 * 6,
        emoji: "nitro_level_Opal",
    },
]


export default {
    name: "nitro",
    description: "الأمر الي تحسب منه متى تتطور شارة النيترو",
    permissions: [],
    roleRequired: [], // id here
    cooldown: ms("1m"), // in ms
    allowAllGuilds: true,
    contexts: [InteractionContextType.BotDM,InteractionContextType.Guild,InteractionContextType.PrivateChannel] as InteractionContextType[],
    allowDm: true,
    options: [
        new SlashCommandUserOption().setRequired(false).setName("member").setDescription("الحساب"),
    ],
    function: async function ({ interaction }: { interaction: ChatInputCommandInteraction }) {
        await interaction.deferReply();
        const guild = config.whiteListedGuildes.includes(interaction.guildId) ? interaction.guild : client.guilds.cache.get(config.whiteListedGuildes[0]);
        const user = guild && (interaction.options.getUser("member") || interaction.user) || null;
        const member: GuildMember = user && await guild.members.fetch(user.id).catch((err) => null);
        if (!member) return interaction.editReply({ embeds: [new EmbedBuilder().setDescription("Member Not Found").setColor("DarkRed")] });
        const userProfile = (await selfBotAxios.get(`users/${member.user.id}/profile`).catch((err) => null))?.data;
        if (!userProfile) return interaction.editReply({ embeds: [new EmbedBuilder().setDescription("User Profile Not Found").setColor("DarkRed")] });
        if (!userProfile?.premium_guild_since) return interaction.editReply({ embeds: [new EmbedBuilder().setDescription("User Not Subscriber").setColor("DarkRed")] });
        const nitroDate = moment(userProfile.premium_since).toDate();
        const color = "#495879";


        let commandConfig = {
            targetLevel: "none",
        }
        // @ts-ignore
        const message = await interaction.editReply({ ...genratePayLoad(nitroDate, user, commandConfig.targetLevel, color) });
            // @ts-ignore
        if (message.components[0].components[0].disabled) return;
        const collecter = message.createMessageComponentCollector({ filter: (i) => i.user.id === interaction.user.id, time: ms("5m") });
        collecter.on("collect", async (i) => {
            if (!i.isStringSelectMenu()) return;
            const selected = i.values[0];
            commandConfig.targetLevel = selected;
            // @ts-ignore
            await i.update({ ...genratePayLoad(nitroDate, user, commandConfig.targetLevel, color) });
        })

        collecter.on("end", async () => {
            const reply = await interaction.fetchReply().catch((err) => null);
            if (!reply) return;


            interaction.editReply({ components: disableComponents(reply.components), }).catch((err) => null)
        })













    }
}

function genratePayLoad(nitroDate: Date, author: User, targetLevelName: string, color?: string): InteractionReplyOptions {

    const months = moment().diff(nitroDate, "months");
    const sortedLevels = levels.sort((a, b) => b.months - a.months);
    const nitroLevel = sortedLevels.find((l) => l.months <= months);
    const nextLevel = sortedLevels.reverse().find((l) => l.months > months);
    const targetLevel = targetLevelName !== "none" ? sortedLevels.reverse().find((l) => l.level === targetLevelName) : nextLevel;
    const higherNitroLevels = sortedLevels.filter((l) => l.months > nitroLevel.months).sort((a, b) => a.months - b.months);

    const menu = new StringSelectMenuBuilder()
        .setMaxValues(1)
        .setMinValues(1)
        .setCustomId("nitro_level")
        .setPlaceholder("Select Nitro Level");
    if (higherNitroLevels.length > 0) {
        for (const level of higherNitroLevels) {
            menu.addOptions({
                label: `${uppercaseFirstLetter(level.level).trim()}`,
                emoji: getEmojiFromClient(client, level?.emoji, false) || "⭐",
                value: level.level.toString(),
                default: level?.level === targetLevel?.level || false,
                description: `Nitro Level ${level.level} after ${level.months} months`,
            })
        }
    }
    else {
        menu.addOptions({
            label: "You Reached Max Nitro Level",
            emoji: getEmojiFromClient(client, nitroLevel?.emoji, false) || "⭐",
            value: nitroLevel.level.toString(),
            default: true,
            description: "No More Nitro Levels",
        })
        menu.setDisabled(true)
    };
    const currentLevel = {
        emoji: nitroLevel?.emoji && getEmojiFromClient(client, nitroLevel?.emoji, false) || "⭐",
        level: nitroLevel.level,
        months: nitroLevel.months,

    }
    const nextLevelData = {
        emoji: nextLevel?.emoji && getEmojiFromClient(client, nextLevel?.emoji, false) || "⭐",
        level: nextLevel?.level,
        months: nextLevel?.months,
        nextLevelDate: nextLevel && moment(nitroDate).add(nextLevel.months, "months").toDate(),
    }
    const targetLevelData = {
        emoji: targetLevel?.emoji && getEmojiFromClient(client, targetLevel?.emoji, false) || "⭐",
        level: targetLevel?.level,
        months: targetLevel?.months,
        targetLevelDate: targetLevel && moment(nitroDate).add(targetLevel.months, "months").toDate(),
    }

    let embedDescription = ``;
    embedDescription += `- **Nitro Level ${currentLevel.level}** ${currentLevel.emoji}\n`;
    embedDescription += `-# -  Subscriber since ${formatDiscordTimestamp(nitroDate.getTime(), "Date")}\n`;
    embedDescription += `-# -  Subscription Streak: \`${months}\` Months\n\n`;
    if (nextLevel) {
        embedDescription += `- **Next Level ${nextLevelData.level}** ${nextLevelData.emoji}\n`;
        embedDescription += `-# - Next Level Date ${formatDiscordTimestamp(nextLevelData.nextLevelDate.getTime(), "Date")}\n`;
        embedDescription += `-# - Next Level In: ${formatDiscordTimestamp(nextLevelData.nextLevelDate.getTime(), "R")}\n\n`;


        if (nextLevel.level !== targetLevel.level) {
            embedDescription += `- **Target Level ${targetLevelData.level}** ${targetLevelData.emoji}\n`;
            embedDescription += `-# - Target Level Date ${formatDiscordTimestamp(targetLevelData.targetLevelDate.getTime(), "Date")}\n`;
            embedDescription += `-# - Target Level In: ${formatDiscordTimestamp(targetLevelData.targetLevelDate.getTime(), "R")}\n\n`;
        }

    }
    else {
        embedDescription += `- **You Reached Max Nitro Level** ${currentLevel.emoji}\n\n`;
    }
    embedDescription += `-# -  **Developed by 7xr**\n`;



    const embed = new EmbedBuilder().setThumbnail(author.displayAvatarURL()).setAuthor({ name: author.tag, iconURL: author.displayAvatarURL() }).setDescription(embedDescription).setColor(`#${nitroLevel.color.replace("#", "").trim()}`).setFooter({ text: "Nitro Level Calculator", iconURL: client.user.avatarURL() || undefined }).setImage("https://l.top4top.io/p_3343gfeqt1.png")

    return {
        components: [new ActionRowBuilder<any>().addComponents(menu)],
        embeds: [embed],

    }




}