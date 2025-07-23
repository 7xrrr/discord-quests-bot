
import { ActionRowBuilder, ChatInputCommandInteraction, EmbedBuilder, GuildMember, InteractionContextType, InteractionReplyOptions, SlashCommandUserOption, StringSelectMenuBuilder, User } from "discord.js";
import ms from "ms";
import { selfBotAxios } from "../../events/guild/newQuests.js";
import moment from "moment-timezone";
import { getEmojiFromClient } from "../../questFunc/Message.js";
import { client } from "../../index.js";
import { disableComponents, formatDiscordTimestamp } from "../../utils/tools.js";
import config from "../../config.js";

const levels = [
    {
        level: 1,
        months: 0,
        emoji: "boost_level_1",
    },
    {
        level: 2,
        months: 2,
        emoji: "boost_level_2",
    },
    {
        level: 3,
        months: 3,
        emoji: "boost_level_3",
    },
    {
        level: 4,
        months: 6,
        emoji: "boost_level_4",
    },
    {
        level: 5,
        months: 9,
        emoji: "boost_level_5",
    },
    {
        level: 6,
        months: 12,
        emoji: "boost_level_6",
    },
    {
        level: 7,
        months: 15,
        emoji: "boost_level_7",
    },
    {
        level: 8,
        months: 18,
        emoji: "boost_level_8",
    },
    {
        level: 9,
        months: 24,
        emoji: "boost_level_9",
    },
]


export default {
    name: "boost",
    description: "الأمر الي تحسب منه متى تتطور شارتك",
    permissions: [],
    roleRequired: [], // id here
    cooldown: ms("1m"), // in ms
    contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel] as InteractionContextType[],
    allowAllGuilds: true,
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
        if (!userProfile?.premium_guild_since) return interaction.editReply({ embeds: [new EmbedBuilder().setDescription("User Not Boosting").setColor("DarkRed")] });
        const boostDate = moment(userProfile.premium_guild_since).toDate();
        const color = "#BE7AB7";


        let commandConfig = {
            targetLevel: -1,
        }
        // @ts-ignore
        const message = await interaction.editReply({ ...genratePayLoad(boostDate, user, commandConfig.targetLevel, color) });
            // @ts-ignore
        if (message.components[0].components[0].disabled) return;
        const collecter = message.createMessageComponentCollector({ filter: (i) => i.user.id === interaction.user.id, time: ms("5m") });
        collecter.on("collect", async (i) => {
            if (!i.isStringSelectMenu()) return;
            const selected = i.values[0];
            commandConfig.targetLevel = parseInt(selected);
            // @ts-ignore
            await i.update({ ...genratePayLoad(boostDate, user, commandConfig.targetLevel, color) });
        })

        collecter.on("end", async () => {
            const reply = await interaction.fetchReply().catch((err) => null);
            if (!reply) return;


            interaction.editReply({ components: disableComponents(reply.components), }).catch((err) => null)
        })













    }
}

function genratePayLoad(boostDate: Date, author: User, targetLevelNumber: number, color?: string): InteractionReplyOptions {

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
        .setPlaceholder("Select Boost Level");
    if (higherBoostLevels.length > 0) {
        for (const level of higherBoostLevels) {
            menu.addOptions({
                label: `${level.months} Months`,
                emoji: getEmojiFromClient(client, level?.emoji, false) || "⭐",
                value: level.level.toString(),
                default: level?.level === targetLevel?.level || false,
                description: `Boost Level ${level.level} after ${level.months} months`,
            })
        }
    }
    else {
        menu.addOptions({
            label: "You Reached Max Boost Level",
            emoji: getEmojiFromClient(client, boostLevel?.emoji, false) || "⭐",
            value: boostLevel.level.toString(),
            default: true,
            description: "No More Boost Levels",
        })
        menu.setDisabled(true)
    };
    const currentLevel = {
        emoji: boostLevel?.emoji && getEmojiFromClient(client, boostLevel?.emoji, false) || "⭐",
        level: boostLevel.level,
        months: boostLevel.months,

    }
    const nextLevelData = {
        emoji: nextLevel?.emoji && getEmojiFromClient(client, nextLevel?.emoji, false) || "⭐",
        level: nextLevel?.level,
        months: nextLevel?.months,
        nextLevelDate: nextLevel && moment(boostDate).add(nextLevel.months, "months").toDate(),
    }
    const targetLevelData = {
        emoji: targetLevel?.emoji && getEmojiFromClient(client, targetLevel?.emoji, false) || "⭐",
        level: targetLevel?.level,
        months: targetLevel?.months,
        targetLevelDate: targetLevel && moment(boostDate).add(targetLevel.months, "months").toDate(),
    }

    let embedDescription = ``;
    embedDescription += `- **Boost Level ${currentLevel.level}** ${currentLevel.emoji}\n`;
    embedDescription += `-# -  Boosting since ${formatDiscordTimestamp(boostDate.getTime(), "Date")}\n`;
    embedDescription += `-# -  Boosting Streak: \`${months}\` Months\n\n`;
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
        embedDescription += `- **You Reached Max Boost Level** ${currentLevel.emoji}\n\n`;
    }
    embedDescription += `-# -  **Developed by 7xr**\n`;



    const embed = new EmbedBuilder().setDescription(embedDescription).setThumbnail(author.displayAvatarURL()).setAuthor({ name: author.tag, iconURL: author.displayAvatarURL() }).setColor(`#${color.replace("#", "").trim()}`).setFooter({ text: "Boost Level Calculator", iconURL: client.user.avatarURL() || undefined }).setImage("https://k.top4top.io/p_3343xcnvn1.png")

    return {
        components: [new ActionRowBuilder<any>().addComponents(menu)],
        embeds: [embed],

    }




}