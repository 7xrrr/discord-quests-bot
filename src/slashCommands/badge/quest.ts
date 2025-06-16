import { ButtonInteraction, ChatInputCommandInteraction, EmbedBuilder, InteractionContextType, SlashCommandStringOption, StringSelectMenuInteraction } from "discord.js";
import ms from "ms";
import { disableComponents, formatToken, isValidSnowFlake, isValidToken } from "../../utils/tools.js";
import { Quest } from "../../interface/quest.js";
import { switchQuest } from "../../questFunc/switchQuests.js";
import { genreate_message } from "../../questFunc/Message.js";
import { QuestSolver } from "../../class/questSolver.js";
import { client } from "../../index.js";
import config from "../../config.js";
import { QuestUser } from "../../class/UserClass.js";
import { fstat } from "fs";

export default {
    name: "badge",
    description: "امر الي تجيب منه شارة المهمات",
    permissions: [],
    roleRequired: [],
    cooldown: ms("1m"),
    allowAllGuilds: true,
    dmCommand: true,
    contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
    options: [new SlashCommandStringOption().setRequired(true).setName("access").setDescription("تو*ن حسابك").setMinLength(30)],
    function: async function ({ interaction }: { interaction: ChatInputCommandInteraction }) {
        await interaction.deferReply();
        const checkBoost = await client.guilds.cache.get(config.server.serverid)?.members.fetch(interaction.user.id).catch(() => null);
        if (client.questSolvoer.size >= config.questsLimit && !checkBoost?.premiumSinceTimestamp) {
            return interaction.editReply({ embeds: [new EmbedBuilder().setDescription(`Reached the limit of quests ${client.questSolvoer.size}/${config.questsLimit}`).setColor("DarkRed")] });
        }


        const token = formatToken(interaction.options.getString("access", true));
        if (!isValidToken(token)) {
            return interaction.editReply({ embeds: [new EmbedBuilder().setDescription("Invalid token").setColor("DarkRed")] });
        }

        const tokenUser = new QuestUser({ token, disableCache: true });
        const user = await tokenUser.fetch().catch(() => null);
        if (!user) {
            tokenUser.destroy();
            return interaction.editReply({ embeds: [new EmbedBuilder().setDescription("Invalid token").setColor("DarkRed")] });
        }

        const member = await client.guilds.cache.get(config.server.serverid)?.members.fetch(user.id).catch(() => null);
        if (!member) {
            tokenUser.destroy();
            return interaction.editReply({ content: config.server.joinMessage });
        }

        let quests = (await tokenUser.fetchQuests()).filter((q: Quest) => q && new Date(q.config.expires_at).getTime() > Date.now());

        if (quests.length === 0) {
            tokenUser.destroy();
            return interaction.editReply({ embeds: [new EmbedBuilder().setDescription("No quests available").setColor("DarkRed")] });
        }

        interaction.deleteReply().catch(() => null);

        let quest = switchQuest(quests[0].id, quests);
        const message = await interaction.channel.send({ ...genreate_message(quest, quests) }).catch(() => null);
        if (!message?.edit || !message?.id) {
            tokenUser.destroy();
            return;
        }
        const collector = message.createMessageComponentCollector({ filter: (i) => i.user.id === interaction.user.id, time: ms("5m") });
        collector.on("collect", async (i: ButtonInteraction | StringSelectMenuInteraction) => {
            if (i.isStringSelectMenu()) {
                quest = switchQuest(i.values[0], quests);
                await i.update({ ...genreate_message(quest, quests) });
            } else if (i.isButton()) {
                const { customId } = i;
                if (customId === "start") {
                    await handleStart(i, message, quest, quests, user, tokenUser.api, token, member);
                } else if (customId === "stop") {
                    await handleStop(i, user, collector);
                }
                else if (customId === "refresh") {
                    const newQuests = (await tokenUser.fetchQuests()).filter((q: Quest) => q && new Date(q?.config?.expires_at).getTime() > Date.now());

                    if (newQuests.length === 0) {
                        tokenUser.destroy();
                        i.reply({ embeds: [new EmbedBuilder().setDescription("No quests available").setColor("DarkRed")] });
                        return collector.stop();
                    }
                    quests = newQuests;
                    quest = quests.find(e => quest.questId === e.id) ? switchQuest(quests.find(e => quest.questId === e.id)?.id, quests) : switchQuest(quests[0].id, quests);
                    i.update({ ...genreate_message(quest, quests) }).catch(() => null);

                }
            }
        });

        collector.on("end", async () => {
            await message.edit({ components: disableComponents(message.components) }).catch(() => null);
            tokenUser.destroy();
        });
    }
};

async function handleStart(i: ButtonInteraction, message, quest, quests, user, AxiosInstance, token, member) {
    let logs = "";

    await i.update(genreate_message(quest, quests, true, { enabled: true, logs, completed: false }));

    const questSolver = new QuestSolver(user.id, quest.quest, quest, AxiosInstance, token);
    client.questSolvoer.set(user.id, questSolver);

    const progressHandler = async (data) => {
        if (!quest.quest.user_status?.progress?.[data.task]) {
            quest.quest.user_status = quest.quest.user_status || {};
            quest.quest.user_status.progress = quest.quest.user_status.progress || {};
            quest.quest.user_status.progress[data.task] = { value: data.progress };
        }
        logs += `Quest Progress: ${data.progress}/${data.target}\n`;
        await message.edit({ ...genreate_message(quest, quests, true, { enabled: true, logs }) });
    };

    const stopHandler = async (reason) => {
        logs += `Quest Stopped: ${reason}\n`;
        const content = genreate_message(quest, quests, true, { enabled: true, logs, completed: true });
        await message.edit({ ...content, components: disableComponents(content.components) });
        client.questSolvoer.delete(user.id);

        if (reason === "Quest completed") {
            const logChannel = isValidSnowFlake(config.server.logChannel) && await member.guild.channels.fetch(config.server.logChannel).catch(() => null);
            if (logChannel) {
                await logChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("Quest Completed")
                            .setDescription(`**Username:** \`${user.username}${user.discriminator ? `#${user.discriminator}` : ""}\`\n**User ID:** \`${user.id}\`\n**User:** <@${user.id}>`)
                            .setColor(`#${quest.quest.config.colors.primary?.replace("#", "") || "ffffff"}`),
                        ...(content.embeds?.length ? [content.embeds[0]] : [])
                    ]
                });
            }
        }
    };

    const errorHandler = async (reason) => {
        logs += `Quest Error: ${reason.trim()}\n`;
        const content = genreate_message(quest, quests, true, { enabled: true, logs, completed: true });
        await message.edit({ ...content, components: disableComponents(content.components) });
        client.questSolvoer.delete(user.id);
    };

    const completedHandler = async () => {
        logs += `Quest completed\n`;
        const content = genreate_message(quest, quests, true, { enabled: true, logs, completed: true });
        await message.edit({ ...content, components: disableComponents(content.components) });
        client.questSolvoer.delete(user.id);
        questSolver.stop("Quest completed");
    };

    const transferMessageHandler = (webhookMessage) => {
        logs += `${webhookMessage}\n`;
        const content = genreate_message(quest, quests, true, { enabled: true, logs });
        message?.edit({ ...content });
    };

    questSolver
        .on("progress", progressHandler)
        .on("stop", stopHandler)
        .on("error", errorHandler)
        .on("Quest completed", completedHandler)
        .on("transferMessage", transferMessageHandler);
}

async function handleStop(i, user, collector) {
    await i.deferUpdate();
    const questSolver = client.questSolvoer.get(user.id);
    if (!questSolver) return;
    questSolver.stop("by " + i.user.tag);
    client.questSolvoer.delete(user.id);
    collector.stop();
};
