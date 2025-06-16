import { ActionRowBuilder, BaseGuildTextChannel, ButtonBuilder, ButtonStyle, ChannelType } from "discord.js";
import { client } from "../index.js";
import { Quest } from "../interface/quest.js";
import { getQuestProgressInforamtion } from "./switchQuests.js";
import { notification_message } from "./Message.js";
import config from "../config.js";
import questsNotifcationShema from "../models/questsSaved.js";

const cooldown = new Map();
const COOLDOWN_TIME = 60 * 1000; // 2 minutes in milliseconds

export async function sendNewQuests(quests: Quest[], channel: BaseGuildTextChannel) {
    const guild = channel.guild;

    for (const quest of quests) {
        if (client.newQuests.has(quest.id)) continue;
        if (cooldown.has(quest.id)) continue;
        cooldown.set(quest.id, true);
        setTimeout(() => cooldown.delete(quest.id), COOLDOWN_TIME);

        const checkData = await questsNotifcationShema.findOne({ questID: quest.id });
        if (checkData) {
            console.log("Quest already sent");
            client.newQuests.set(quest.id, true);
            continue;
        }

       

        const messageContent = await notification_message(quest);
        const support = getQuestProgressInforamtion(quest)?.support === true;
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setLabel("View Quest")
                .setEmoji("🔗")
                .setURL(`https://discord.com/quests/${quest.id}`),
            new ButtonBuilder()
                .setEmoji("🤖")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!support)
                .setCustomId(`supportbot`)
        );

        const message = await channel.send({
            ...messageContent,
            content: `||<@&${config.notification.role}>||`,
            components: [row],
        });

        if (channel.type === ChannelType.GuildAnnouncement) {
            await message.crosspost().catch(() => null);
        }

        await new questsNotifcationShema({
            questID: quest.id,
            messageID: message.id,
        }).save().catch(console.error);

      

        if (config.notification.sendDm) {
            const role = await guild.roles.fetch(config.notification.role).catch(() => null);
            if (!role) {
                console.log("Failed to fetch role");
                continue;
            }

            const members = role.members.filter(member => member.roles.cache.has(config.notification.role));
            if (!members.size) {
                console.log("No members found with the role");
                continue;
            }

            for (const member of members.values()) {
                if (config.debugMode && !config.devlopers.includes(member.id)) continue;
                if (cooldown.has(`${quest.id}-${member.id}`)) continue;

                await member.send({
                    ...messageContent,
                    components: [row],
                }).then(() => cooldown.set(`${quest.id}-${member.id}`, true)).catch(() => null);
            }
        }
    }
}