import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, EmbedBuilder } from "discord.js";
import { buttonCommand } from "../lib/handler/buttons.js";
import { permissionList } from "../lib/handler/messageCommand.js";
import { slashCommandFlags } from "../lib/handler/slashCommand.js";
import { CustomClient } from "../core/customClient.js";
import { I18nInstance } from "../core/i18n.js";
import questsConfig from "../config/questsConfig.js";



export default class supportButton extends buttonCommand {
    public name: string = "supportbot";
    public description: string = "";
    public options = [];
    public cooldown: number | string = "5s";
    public allowedServers?: string[] = [];
    public allowedUsers?: string[] = [];
    public allowedChannels?: string[] = [];

    // public permissions: permissionList[] = ["Administrator"];
    public bot_permissions: permissionList[] = [];
    public flags: slashCommandFlags[] = ["noReply"];











    embed(des: string) {
        return new EmbedBuilder().setDescription(des)
    }



    public async execute({
        interaction,
        client,
        i18n,
        lang
    }: {
        interaction: ButtonInteraction;
        client: CustomClient;
        i18n: I18nInstance;
        lang: string;
    }): Promise<any> {

        const buttons = questsConfig.buttons;
        const comp = [];
        const buttonsRow = new ActionRowBuilder();

        for (let index = 0; index < buttons.length; index++) {
            const button = buttons[index] as any
            let emoji = button?.emoji;
            if (emoji && typeof (emoji) == "function") {
                // @ts-ignore
                emoji = emoji(client);
            }
            const buttonBuilder = new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
            if (button.text) buttonBuilder.setLabel(button.text);
            if (button.url) buttonBuilder.setURL(button.url);
            if (emoji) buttonBuilder.setEmoji(`${emoji}`);
            buttonsRow.addComponents(buttonBuilder);
        }
        if (buttons.length > 0) comp.push(buttonsRow);



        interaction.reply({
            ephemeral: true,
            embeds: [new EmbedBuilder().setDescription(i18n.t("badge.supportedQuest")).setColor("DarkRed")],
            components: comp
        })





    }
}
