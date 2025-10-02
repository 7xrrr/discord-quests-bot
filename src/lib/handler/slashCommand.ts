import {
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    InteractionContextType,
    PermissionsBitField
} from "discord.js";
import {  AppDataSource, client } from "../../index.js";
import ms from "ms"
import { CustomClient } from "../../core/customClient.js";
import { commandType, SharedCommandFlagKeys } from "./messageCommand.js";
import { i18n } from "../../providers/i18n.js";
import I18nManager, { I18nInstance } from "../../core/i18n.js";
import GuildDocument from "../../entities/guildSettings.js";

export const slashCommandFlags = {
    noReply: "Does not reply to the interaction",
    ephemeral: "Reply is ephemeral (only visible to the user)",
    allowOverride: "Allows the command permission to be overridden with guild settings",
    nsfw: "Command can be used in NSFW channels",
}
type slashCommandOption = Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup"> | SlashCommandSubcommandsOnlyBuilder | SlashCommandOptionsOnlyBuilder;
export type SlashCommandFlagKeys = keyof typeof slashCommandFlags;
export type slashCommandFlags = SharedCommandFlagKeys | SlashCommandFlagKeys;
export type permissionList = keyof typeof PermissionFlagsBits;

export type SlashCommandConstructor = new () => SlashCommand;

export abstract class SlashCommand {
    public i18n: I18nManager = i18n;
    public client = client;
    public appDataSource = AppDataSource;
    public type: commandType = commandType.slashCommand;
    public enabled: boolean = true;


    public name: string = "";
    public description: string = "";
    public options: any[] = [];
    public cooldown: number | string = 0;
    public allowedRoles?: string[] = [];
    public allowedServers?: string[] = [];
    public allowedUsers?: string[] = [];
    public allowedChannels?: string[] = [];
    public permissions?: permissionList[] = [];
    public bot_permissions?: permissionList[] = [];
    public flags: slashCommandFlags[] = [];
    public isSubCommand: boolean = false;
    public isConfigFile: boolean = false;
    public subCommand: string = "";
    public subCommandGroupName: string = "";


    getName(): string {
        let name = this.name;
        if (this.isSubCommand && this.subCommandGroupName) {
            name += `-${this.subCommandGroupName}`; // Add subcommand group name if it exists
        }

        if (this.isSubCommand && this.subCommand) {
            name += `-${this.subCommand}`;


        }


        return name.trim().toLowerCase();
    }
    isNSFW(): boolean {
        return this.flags.includes("nsfw");
    }
    reslovePermissions(permissions: permissionList[] | undefined): bigint {
        return PermissionsBitField.resolve(permissions);
    }
    getPermissions(): bigint {
        return this.permissions ? this.reslovePermissions(this.permissions) : BigInt(0);
    }
    getBotPermissions(): bigint {
        return this.bot_permissions ? this.reslovePermissions(this.bot_permissions) : BigInt(0);
    }
    hasFlag(flag: slashCommandFlags): boolean {
        return this?.flags?.includes(flag) === true;
    }

    getContexts(): InteractionContextType[] {
        const context = [];

        const contextFlags = ["onlyDm", "onlyGuild", "devOnly"];
        const contextCmdFlags = this.flags.filter(flag => contextFlags.includes(flag));


        if (this.hasFlag("onlyDm")) context.push(InteractionContextType.BotDM, InteractionContextType.PrivateChannel);
        if (this.hasFlag("onlyGuild")) context.push(InteractionContextType.Guild);
        if ((contextCmdFlags || []).length === 0) context.push(InteractionContextType.Guild);

        return context;
    }
    getCooldown(): number {
        if (!this.cooldown) return 0;
        if (typeof (this.cooldown) === "string") {
            const time = ms(this.cooldown);
            if (!time) return 0;
            return time;
        }
        if (typeof (this.cooldown) === "number") {
            return this.cooldown;
        }
    }
    isAllowedGuild(guildId: string) {
        if (this.allowedServers && this.allowedServers.length > 0) {
            return this.allowedServers.includes(guildId);
        }
        return true; // If no specific allowed servers are set, allow all
    }
    constructor() {
        this.name = this.constructor.name.toLowerCase();
    }
    getCommandKey():string {
        return `slashommand-${this.getName()}`;
    }




    public abstract execute(options: {
        interaction: ChatInputCommandInteraction;
        client: CustomClient;
        i18n: I18nInstance,
        lang: string,
        guildConfig: GuildDocument | null,
    }): Promise<any>;
}
