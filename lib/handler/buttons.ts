import {
    PermissionFlagsBits, PermissionsBitField,
    ButtonInteraction
} from "discord.js";
import { AppDataSource, client } from "../../index.js";
import ms from "ms";
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
export type SlashCommandFlagKeys = keyof typeof slashCommandFlags;
export type slashCommandFlags = SharedCommandFlagKeys | SlashCommandFlagKeys;
export type permissionList = keyof typeof PermissionFlagsBits;

export type buttonCommandConstructor = new () => buttonCommand;

export abstract class buttonCommand {
    public i18n: I18nManager = i18n;
    public client = client;
    public appDataSource = AppDataSource;
    public type: commandType = commandType.buttonCommand;
    public enabled: boolean = true;
    public name: string = "";
    public description: string = "";
    public cooldown: number | string = 0;
    public allowedRoles?: string[] = [];
    public allowedServers?: string[] = [];
    public allowedUsers?: string[] = [];
    public allowedChannels?: string[] = [];
    public permissions?: permissionList[] = [];
    public bot_permissions?: permissionList[] = [];
    public flags: slashCommandFlags[] = [];
    public filter: ((interaction: ButtonInteraction) => boolean) | undefined = null;


    passFilter(interaction: ButtonInteraction): boolean {
        if (!this.filter) return false; // If no filter is set, pass by default
        return this.filter(interaction);
    }


    getName(): string {
        let name = this.name;
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


    getCommandKey(): string {
        return `button-${this.getName()}`;
    }




    public abstract execute(options: {
        interaction: ButtonInteraction;
        client: CustomClient;
        i18n: I18nInstance,
        lang: string,
        guildConfig: GuildDocument | null,
    }): Promise<any>;
}
