import { ClientEvents, Message, OmitPartialGroupDMChannel } from "discord.js";
import { baseDiscordEvent } from "../../lib/handler/baseClientEvent.js";
import config from "../../config/config.js";
import { cooldown } from "../../core/cooldown.js";
import { EmbedBuilder } from "../../lib/handler/embedBuilder.js";
import { GuildCommandSettings } from "../../entities/guildSettings.js";

export default class messageHandler extends baseDiscordEvent {
    public name: keyof ClientEvents = "messageCreate";
    public once: boolean = false;

    async executeEvent(message: OmitPartialGroupDMChannel<Message<boolean>>): Promise<any> {
        if (!message.content || message.author.bot || !this.client.ready) return;
        const replyMessage = async (content: string) => {
            const embed = new EmbedBuilder().setDescription(content);



            return message.reply({
                embeds: [embed],
                allowedMentions: { repliedUser: true },
            }).catch(err => {
                this.logger.error(`Failed to reply to message ${message.id}:`, err);
            });

        };
        const guildConfig = message.guildId && this.client.guildSettings.get(message.guildId) || null
        const lang = guildConfig?.lang || this?.client.config?.defaultLanguage || "en";
        const i18n = this.client.i18n.get(lang);
        const prefix = guildConfig?.prefix || config?.prefix || "-";
        if (!message.content.startsWith(prefix)) return;
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const cmd = args.shift()?.toLowerCase();
        const command = this.client.messageCommands.get(cmd) || this.client.messageCommands.find(e => e?.hasAlias(cmd));
        if (!command) return;
        const commandKey = command.getCommandKey();
        // Handle cooldown
        const commandCd = command.getCooldown();
        const cdKey = command.hasFlag("userCooldown") ? `${commandKey}-${message.author.id}` : `${message.author.id}-${commandKey}-${message.guild?.id || "dm"}`;
        const dbCd = command.hasFlag("cooldownDatabase");
        const cd = await cooldown.get(cdKey, dbCd);
        const argsCheck = command.greaterThanMinArgs(args.length) && command.lessThanMaxArgs(args.length);
        if (!command.enabled) return replyMessage(i18n.t("commandDisabled"));
        if (command.hasFlag("onlyGuild") && !message.guild && !command.hasFlag("onlyDm")) {
            return replyMessage(i18n.t("guildOnly"));
        }
        else if (command.hasFlag("onlyDm") && message.guild && !command.hasFlag("onlyGuild")) {
            return replyMessage(i18n.t("dmOnly"));
        }

        if (!argsCheck) return replyMessage(i18n.t("badUsage", { usage: command.getUsage(prefix) }));

        if (cd) {
            const remaining = this.client.formatDuration(cd.getRemaining(),lang);
            return replyMessage(i18n.t("cooldown", { time: remaining }));
        };
        if(command.hasFlag("ownerOnly") && !config?.developers?.includes(message.author.id)) {
            return replyMessage(i18n.t("developerOnly"));
        }


        if (message.guild) {
            const { channel, guild, member, author } = message;
            if(!command.isAllowedGuild(guild.id)) return replyMessage(i18n.t("notAllowedGuild"))
       
            const user = author
            const isOwner = user.id === guild.ownerId;
            // 1. Owner-only command
            if (command.hasFlag("ownerOnly") && !isOwner) {
                return replyMessage(i18n.t("ownerOnly"));
            }

            // 2. Bot permissions check
            const botPerms = command.getBotPermissions();
            if (!guild.members.me.permissions.has(botPerms)) {
                return replyMessage(i18n.t("noPermissionBot", {
                    permissions: command.bot_permissions.join(","),
                }));
            }

            // 3. Command configuration
            const guildCommandConfig = guildConfig?.commands?.[commandKey];
            const cmdConfig: GuildCommandSettings = guildCommandConfig ?? {} as GuildCommandSettings;
            const allowedRoles = cmdConfig.allowedRoles ?? command.allowedRoles ?? [];
            const disabledRoles = cmdConfig.disabledRoles ?? [];
            const allowedChannels = cmdConfig.allowedChannels ?? command.allowedChannels ?? [];
            const disabledChannels = cmdConfig.disabledChannels ?? [];
            const permissions = cmdConfig.allowedPermissions ?? command.permissions ?? [];
            const resolvedPerms = command.reslovePermissions(permissions as any);


            // 4. Channel restrictions
            if (disabledChannels.includes(channel.id) || (allowedChannels.length && !allowedChannels.includes(channel.id))) {
                return /*eplyMessage(i18n.t("commandDisabledInChannel", {
                    channel: channel.toString(),
                }));*/
            }
            // 5. Role restrictions
            const memberRoles = member.roles.cache;
            const hasAllowedRole = allowedRoles.some(role => memberRoles.has(role));
            const hasDisallowedRole = disabledRoles.some(role => memberRoles.has(role));

            if (hasDisallowedRole && !hasAllowedRole) {
                return replyMessage(i18n.t("commandDisabledInRole"));
            }
            const hasPermission = permissions.length === 0 && allowedRoles.length > 0 ? hasAllowedRole || isOwner : member.permissions.has(resolvedPerms) || hasAllowedRole || isOwner

            const permString = !permissions[0] ? `<@&${allowedRoles[0]}>` : permissions.map(e => `\`${e.trim()}\``).join(", ");
            if (!hasPermission) {
                return replyMessage(i18n.t("noPermmisionUser", {
                    permissions: permString,
                }));
            }
        }

        // Execute the command
        try {
            cooldown.create(cdKey, commandCd, dbCd);
            if (command.hasFlag("deleteMessage")) {
                if (message.guild && message.guild.members.me.permissions.has("ManageMessages")) {
                    await message.delete().catch(err => {
                        this.logger.error(`Failed to delete message ${message.id}:`, err);
                    });
                }
            }

            await command.execute({
                message,
                i18n,
                client: this.client,
                lang,
                args,
                guildConfig,
            });
            this.logger.info(`Executed command ${cmd} for user ${message.author.tag} successfully.`);
        } catch (err) {
            this.logger.error(`Failed to execute command ${cmd} for message ${message.id}:`, err);
            replyMessage(i18n.t("commandError"));
        }





    }

}
