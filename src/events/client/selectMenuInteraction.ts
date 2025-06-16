import colors from "colors";
import { log } from "../../utils/logging.js";
import { client } from "../../index.js";
import { EmbedBuilder, PermissionsBitField, Interaction } from "discord.js";
import config from "../../config.js";

interface SelectMenu {
    id: string;
    function: (params: {
        client: typeof client;
        interaction: Interaction;
        choices: string[];
    }) => void;
    cooldown: number;
}

interface Cooldown {
    user: string;
    id: string;
    until: number;
}

export default {
    name: "interactionCreate",
    once: false,
    function: async function (interaction: Interaction) {
        if (!interaction.isAnySelectMenu()) return;
        if (!config.whiteListedGuildes.includes(interaction?.guildId)) return;
        const selectMenu = client.selectMenus.get(interaction.customId) as SelectMenu;
        if (!selectMenu) return;
        const existingCooldown = client.cooldowns.find((a) => a.id === selectMenu.id && a.user === interaction.user.id);
        if (existingCooldown) {
            const now = Math.floor(Date.now() / 1000);
            if (now < existingCooldown.until) {
                const cooldownEmbed = new EmbedBuilder()
                    .setColor("#FF0000")
                    .setTitle("Cooldown")
                    .setDescription(`:x: **You can use this command again <t:${existingCooldown.until}:R>**`)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.username, iconURL: interaction.user.avatarURL() || undefined });

                return interaction.reply({ embeds: [cooldownEmbed] });
            }
        }
        log(
            `[Select menu clicked] ${interaction.customId} ${colors.blue("||")} Author: ${interaction.user.username} ${colors.blue("||")} ID: ${interaction.user.id
            } ${colors.blue("||")} Server: ${interaction.guild!.name}`
        );
        selectMenu.function({ client, interaction, choices: interaction.values });
        const memberPerms: PermissionsBitField = interaction.member!.permissions as PermissionsBitField;
        if (selectMenu.cooldown !== 0 && (interaction.guild && memberPerms.has(PermissionsBitField.Flags.Administrator))) {
            const until = Math.round((Date.now() + selectMenu.cooldown) / 1000);
            client.cooldowns.push({ user: interaction.user.id, id: selectMenu.id, until });
            setTimeout(() => {
                const index = client.cooldowns.findIndex(
                    (cooldown: Cooldown) => cooldown.user === interaction.user.id && cooldown.id === selectMenu.id
                );
                if (index !== -1) {
                    client.cooldowns.splice(index, 1);
                }
            }, selectMenu.cooldown);
        }
    },
} as any;
