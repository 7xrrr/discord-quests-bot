import { AnySelectMenuInteraction, ContextMenuCommandInteraction } from "discord.js";
import { permissionList } from "../lib/handler/messageCommand.js";
import { slashCommandFlags } from "../lib/handler/slashCommand.js";
import { CustomClient } from "../core/customClient.js";
import { I18nInstance } from "../core/i18n.js";
import { menuCommand } from "../lib/handler/menu.js";



export default class exampleMenu extends menuCommand {
    public name: string = "test_menu";
    public description: string = "A test menu to verify the bot's functionality.";
    public options = [];
    public cooldown: number | string = "1m";
    public allowedRoles?: string[] = [];
    public allowedServers?: string[] = [];
    public allowedUsers?: string[] = [];
    public allowedChannels?: string[] = [];
    public permissions: permissionList[] = ["Administrator"];
    public bot_permissions: permissionList[] = [];
    public flags: slashCommandFlags[] = ["onlyGuild", "ephemeral"];













    public async execute({
        interaction,
        client,
        i18n,
        lang
    }: {
        interaction: AnySelectMenuInteraction | ContextMenuCommandInteraction;
        client: CustomClient;
        i18n: I18nInstance;
        lang: string;
    }): Promise<any> {
        interaction.editReply({
            content: "test working",
        });


    }
}
