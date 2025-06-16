import { ChatInputCommandInteraction, EmbedBuilder, InteractionContextType, SlashCommandStringOption } from "discord.js";
import ms from "ms";
import { client } from "../../index.js";
import config from "../../config.js";

export default {
    name: "send",
    description: "امر الي تجيب منه شارة المهمات",
    permissions: [],
    roleRequired: [],
    cooldown: ms("1m"),
    allowAllGuilds: true,
    dmCommand: true,
    contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
    options: [new SlashCommandStringOption().setRequired(true).setName("message").setDescription("message").setMinLength(3)],
    
    function: async function ({ interaction }: { interaction: ChatInputCommandInteraction }) {
        if(!config.devlopers.includes(interaction.user.id)) return;
        await interaction.deferReply();
        const checkBoost = await client.guilds.cache.get(config.server.serverid)?.members.fetch(interaction.user.id).catch(() => null);
        const users = client.questSolvoer;
        if(users.size === 0) return interaction.editReply({ embeds: [new EmbedBuilder().setDescription(`No users`).setColor("DarkRed")] });
        const message = interaction.options.getString("message", true);
        users.forEach(async (user) => {
            user.emit("transferMessage",message);
        });
        interaction.editReply({ embeds: [new EmbedBuilder().setDescription(`Message sent to ${users.size} users`).setColor("Green")] });



    }
};


