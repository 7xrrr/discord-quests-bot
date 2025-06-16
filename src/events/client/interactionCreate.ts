import colors from "colors";
import { log } from "../../utils/logging.js";
import { EmbedBuilder, InteractionType, PermissionsBitField, CommandInteraction, GuildMemberRoleManager } from "discord.js";
import { client } from "../../index.js";
import config from "../../config.js";

interface Command {
	name: string;
	permissions: string[];
	roleRequired: string;
	dmCommand: boolean;
	cooldown: number;
	function: (params: {
		client: typeof client;
		interaction: CommandInteraction;
		options: any; // Replace "any" with the correct type for options
	}) => void;
}

export default {
	name: "interactionCreate",
	description: "client on interaction create event, using for slash commands",
	once: false,
	function: async function (interaction: CommandInteraction) {
		if (config.debugMode && !config.devlopers.includes(interaction.user.id)) return;
		if (interaction.type !== InteractionType.ApplicationCommand) return;

		if (!interaction.isChatInputCommand()) return;
		const cmd = interaction.commandName;
		const command = client.slashCommands.get(cmd) as any;
		if (!command) return;
		if (command.dmCommand) {
			if (interaction.guildId) return interaction.reply({ ephemeral: true, content: "This command can only be used in DMs!" });
			const existingCooldown = client.cooldowns.find((a) => a.command === command.name && a.user === interaction.user.id);
			if (existingCooldown) {
				const now = Math.floor(Date.now() / 1000);
				if (now < existingCooldown.until) {
					const cooldownEmbed = new EmbedBuilder()
						.setColor("#FF0000")
						
						.setDescription(`:x: **You can use this command again <t:${existingCooldown.until}:R>**`)
	
					

					return interaction.reply({ embeds: [cooldownEmbed], ephemeral: true });
				}
			}

			const options = interaction.options.data;
			command.function({ client, interaction, options });
			log(
				`[Command ran] ${interaction.commandName} ${colors.blue("||")} Author: ${interaction.user.username} ${colors.blue("||")} ID: ${interaction.user.id
				} ${colors.blue("||")} Server: ${interaction.guild!?.name || "DM"}`
			);

		}
		else {
			if (!interaction?.guildId && !command?.allowDm) return interaction.reply({ ephemeral: true, content: "This command can only be used in servers!" });
			if (!command?.allowAllGuilds && !config.whiteListedGuildes.includes(interaction.guildId)) return;
			if (command?.permissions?.length > 0) {
				const invalidPerms: string[] = [];
				const memberPerms: PermissionsBitField = interaction.member!.permissions as PermissionsBitField;
				for (const perm of command.permissions) {
					if (!memberPerms.has(PermissionsBitField.Flags[perm])) invalidPerms.push(perm);
				}
				if (invalidPerms.length)
					return interaction.reply({ content: `Missing Permissions: \`${invalidPerms.join(", ")}\`` });
			}
			if (command?.roleRequired?.length > 0) {
				const role = await interaction.guild!.roles.fetch(command.roleRequired);
				const member = interaction.member;
				const memberPerms: PermissionsBitField = interaction.member!.permissions as PermissionsBitField;
				const memberRoles: GuildMemberRoleManager = member!.roles as GuildMemberRoleManager;
				if (role && !memberRoles.cache.has(role.id) && memberRoles.highest.comparePositionTo(role) < 0 && !memberPerms.has(PermissionsBitField.Flags.Administrator))
					return interaction.reply(`:x: **You don't have the required role!**`);
			}
			const existingCooldown = client.cooldowns.find((a) => a.command === command.name && a.user === interaction.user.id);
			if (existingCooldown) {
				const now = Math.floor(Date.now() / 1000);
				if (now < existingCooldown.until) {
					const cooldownEmbed = new EmbedBuilder()
						.setColor("#FF0000")
						.setTitle("Cooldown")
						.setDescription(`:x: **You can use this command again <t:${existingCooldown.until}:R>**`)
						.setTimestamp()
						.setFooter({ text: interaction.user.username, iconURL: interaction.user.avatarURL() || undefined });

					return interaction.reply({ embeds: [cooldownEmbed], ephemeral: true });
				}
			}
			const options = interaction.options.data;
			command.function({ client, interaction, options });
			log(
				`[Command ran] ${interaction.commandName} ${colors.blue("||")} Author: ${interaction.user.username} ${colors.blue("||")} ID: ${interaction.user.id
				} ${colors.blue("||")} Server: ${interaction.guild!?.name || "DM"}`
			);




		}
		if (command.cooldown) {
			const until = Math.round((Date.now() + command.cooldown) / 1000);
			client.cooldowns.push({ user: interaction?.user.id, command: command.name, until });
			setTimeout(() => {
				const index = client.cooldowns.findIndex(
					(cooldown) => cooldown.user === interaction.user.id && cooldown.command === command.name
				);
				if (index !== -1) {
					client.cooldowns.splice(index, 1);
				}
			}, command.cooldown);
		}
	},
} as any;
