import { ChatInputCommandInteraction, SlashCommandStringOption } from "discord.js";
import { SlashCommand, slashCommandFlags } from "../../lib/handler/slashCommand.js";
import { CustomClient } from "../../core/customClient.js";
import { permissionList } from "../../lib/handler/messageCommand.js";
import { I18nInstance } from "../../core/i18n.js";


export default class setprefix extends SlashCommand {
    public name: string = "test";
    public description: string = "Set the prefix for the bot in this server";
    public options = [
        new SlashCommandStringOption().setName("prefix")
            .setDescription("The new prefix for the bot")
            .setMaxLength(2)
            .setMinLength(1)
            .setRequired(true)
    ];
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
        interaction: ChatInputCommandInteraction;
        client: CustomClient;
        i18n: I18nInstance;
        lang: string;
    }): Promise<any> {
        interaction.deferReply({ ephemeral: true });
        const message = await interaction.channel.send("Test command executed!");
        interaction.followUp({ content: "Attempting to crosspost the message...", ephemeral: true });
   



    }
}
