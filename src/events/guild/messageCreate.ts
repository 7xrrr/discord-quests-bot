import colors from "colors";
import { log } from "../../utils/logging.js";
import { client } from "../../index.js";
import config from "../../config.js";
import { ChannelType, EmbedBuilder, Message, PermissionsBitField } from "discord.js";

export default {
	name: "messageCreate",
	description: "Client on receive message event",
	once: false,
	function: async function (message: Message) {
		if (config.debugMode && !config.devlopers.includes(message.author.id)) return;
		if (message.channel.type !== ChannelType.GuildText) return;
		
		if (!config.whiteListedGuildes.includes(message.guildId)) return;

		if (!config.prefix) return;
		if (message.author.bot) return;
		if (!message.content.startsWith(config.prefix)) return;
		const args = message.content.slice(config.prefix.length).split(/ +/);
		const cmd = args.shift()?.toLowerCase();
		if (!cmd) return;
		const command = client.commands.get(cmd) || client.commands.find((a: any) => a.aliases && a.aliases.includes(cmd));

		if (command) {
			if (command.permissions.length) {
				const invalidPerms: any[] = [];
				for (const perm of command.permissions) {
					if (!message.member?.permissions.has(PermissionsBitField.Flags[perm])) invalidPerms.push(perm);
				}
				if (invalidPerms.length) return message.channel.send(`Missing Permissions: \`${invalidPerms + "".replace(/,/g, ", ")}\``);
			}
			if (command.roleRequired) {
				const role = await message.guild?.roles.fetch(command.roleRequired);
				if (role && message.member && !message.member?.roles.cache.has(role.id) && message.member.roles.highest.comparePositionTo(role) < 0 && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.channel.send(`:x: **You don't have the required role!**`);
			}
			if (client.cooldowns.find((a) => a.command == command.name && a.user == message.author.id)) {
				const embed = new EmbedBuilder()
					.setColor("#FF0000")
					.setTitle("Cooldown")
					.setDescription(`:x: **You can use this command again <t:${client.cooldowns.find((a) => a.command == command.name && a.user == message.author.id).until}:R>**`)
					.setTimestamp()
					.setFooter({ text: message.author.username, iconURL: message.author.avatarURL() || undefined });
				return message.channel.send({ embeds: [embed] });
			}
			command.function({ client, message, args });
			log(`[Command ran] ${message.content} ${colors.blue("||")} Author: ${message.author.username} ${colors.blue("||")} ID: ${message.author.id} ${colors.blue("||")} Server: ${message.guild?.name || "DM"}`);
			if (message.member && command.cooldown && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
				client.cooldowns.push({ user: message.author.id, command: command.name, until: Math.round((Date.now() + command.cooldown) / 1000) });
				setTimeout(() => {
					client.cooldowns.splice(client.cooldowns.indexOf(client.cooldowns.find((a) => a.user === message.author.id && a.command === command.name)), 1);
				}, command.cooldown);
			}
		}
	},
};
