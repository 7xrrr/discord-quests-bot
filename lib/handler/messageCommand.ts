import { Message, OmitPartialGroupDMChannel, PermissionFlagsBits, PermissionsBitField } from "discord.js";
import {  AppDataSource, client } from "../../index.js";
;
import { CustomClient } from "../../core/customClient.js"; 
import I18nManager, { I18nInstance } from "../../core/i18n.js";
import { i18n } from "../../providers/i18n.js";
import ms from "ms";
import GuildDocument from "../../entities/guildSettings.js";

export type permissionList = keyof typeof PermissionFlagsBits;

export interface MessageCommandContext {
    message: OmitPartialGroupDMChannel<Message<boolean>>;
    client: CustomClient;
    i18n: I18nInstance,
    lang: string,
    args: string[],
    guildConfig: GuildDocument | null,
}
export enum commandType {
    slashCommand = "slashCommand",
    messageCommmand = "messageCommand",
    buttonCommand = "buttonCommand",
    menuCommand="menuCommand",

}

export const sharedCommandFlags = {
    onlyGuild: "Only works in guilds",
    onlyDm: "Only works in DMs",
    devOnly: "Only available for developers",
    cooldownDatabase: "Uses database-based cooldown system",
    ignorePermissions: "Does not reply if the user does not have permissions",
    ignoreCooldown: "Does not reply if the command is on cooldown",
    ownerOnly: "Only Server Owner can use this command",
    userCooldown: "Uses user-based cooldown system",
} as const;

export const messageCommandFlags = {
    deleteMessage: "Deletes the user's message after executing the command",



}


export type SharedCommandFlagKeys = keyof typeof sharedCommandFlags;

export type MessageCommandFlagKeys = keyof typeof messageCommandFlags | SharedCommandFlagKeys;

export type messageCommandConstructor = new () => messageCommand;






export abstract class messageCommand {
    public i18n: I18nManager = i18n;
    public client = client;
    public appDataSource = AppDataSource;
    public type: commandType = commandType.messageCommmand;
    public enabled: boolean = true;
    public name: string;
    public aliases?: string[];
    public description: string;
    public usage: string;
    public examples?: string[];
    public cooldown: number | string;
    public allowedRoles?: string[];
    public allowedServers?: string[];
    public allowedUsers?: string[];
    public allowedChannels?: string[];
    public minArgs?: number = 0; // Minimum number of arguments required
    public maxArgs?: number = -1; // -1 means no limit
    public permissions?: permissionList[];
    public bot_permissions?: permissionList[];
    public flags: MessageCommandFlagKeys[];
    reslovePermissions(permissions: permissionList[] | undefined): bigint {
        return PermissionsBitField.resolve(permissions);
    }
    getPermissions(): bigint {
        return this.permissions ? this.reslovePermissions(this.permissions) : BigInt(0);
    }
    getBotPermissions(): bigint {
        return this.bot_permissions ? this.reslovePermissions(this.bot_permissions) : BigInt(0);
    }
    hasFlag(flag: MessageCommandFlagKeys): boolean {
        return this?.flags?.includes(flag) ? true : false;
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
    greaterThanMinArgs(args: number): boolean {
        if (this.minArgs === undefined || this.minArgs <= 0) return true;
        return args >= this.minArgs;
    }
    lessThanMaxArgs(args: number): boolean {
        if (this.maxArgs === undefined || this.maxArgs < 0) return true;
        return args <= this.maxArgs;
    }
    getUsage(prefix: string): string {
        return this.usage.replace("{prefix}", prefix).replace("{command}", this.name).trim();
    }
    hasAlias(alias: string): boolean {
        if (!this.aliases || this.aliases.length === 0) return false;
        return this.aliases.map(o => o.toLowerCase().trim()).includes(alias.toLowerCase());

    }
    isAllowedGuild(guildId: string) {
        if (this?.allowedServers && this?.allowedServers?.length > 0) {
            return this.allowedServers.includes(guildId);
        }
        return true; // If no specific allowed servers are set, allow all
    }
    getCommandKey():string {
        return `slashommand-${this.name.toLowerCase().trim()}`;
    }

    public abstract execute(options: MessageCommandContext): Promise<any>;
}
