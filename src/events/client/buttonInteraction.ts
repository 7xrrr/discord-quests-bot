import colors from "colors";
import { log } from "../../utils/logging.js";
import { client } from "../../index.js";
import { PermissionsBitField, ButtonInteraction, GuildMemberRoleManager } from "discord.js";
import config from "../../config.js";



export default {
	name: "interactionCreate",
	once: false,
	function: async function (interaction: ButtonInteraction) {
		if (!interaction.isButton()) return;
		if (config.debugMode && !config.devlopers.includes(interaction.user.id)) return;

		const button = client.buttons.get(interaction.customId)
		if (button) {
			if (button.permissions) {
				const invalidPerms: any[] = [];
				const memberPerms: PermissionsBitField = interaction.member!.permissions as PermissionsBitField;
				for (const perm of button.permissions) {
					if (!memberPerms.has(PermissionsBitField.Flags[perm])) invalidPerms.push(perm);
				}
				if (invalidPerms.length) {
					return interaction.reply({ content: `Missing Permissions: \`${invalidPerms.join(", ")}\``, ephemeral: true });
				}
			}
			if (button.roleRequired) {
				const role = await interaction.guild!.roles.fetch(button.roleRequired);
				const member = interaction.member;
				const memberRoles: GuildMemberRoleManager = member!.roles as GuildMemberRoleManager;
				const memberPerms: PermissionsBitField = interaction.member!.permissions as PermissionsBitField;
				if (role && !memberRoles.cache.has(role.id) && memberRoles.highest.comparePositionTo(role) < 0 && !memberPerms.has(PermissionsBitField.Flags.Administrator)) {
					return interaction.reply(`:x: **You don't have the required role!**`);
				}
			}
			button.function(interaction);
			log(
				`[Button clicked] ${interaction.customId} ${colors.blue("||")} Author: ${interaction.user.username} ${colors.blue("||")} ID: ${interaction.user.id
				} ${colors.blue("||")} Server: ${interaction.guild!.name}`
			);
		}
	},
} as any;
