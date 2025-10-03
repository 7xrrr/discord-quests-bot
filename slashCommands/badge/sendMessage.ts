import { ChatInputCommandInteraction, SlashCommandStringOption } from "discord.js";
import { SlashCommand, slashCommandFlags } from "../../lib/handler/slashCommand.js";
import { CustomClient } from "../../core/customClient.js";
import { permissionList } from "../../lib/handler/messageCommand.js";
import { I18nInstance } from "../../core/i18n.js";
import { EmbedBuilder } from "../../lib/handler/embedBuilder.js";
import { usersCache } from "../../core/cache.js";
import { devlopers_message } from "../../interface/ChildMessage.js";
export default class setLang extends SlashCommand {
    public name: string = "send_message";
    public description: string = "Send a message to all quest solver users";
    public options = [
        new SlashCommandStringOption().setRequired(true).setName("message").setDescription("message").setMinLength(3)
    ];
    public cooldown: number | string = "1m";
    public allowedRoles?: string[] = [];
    public allowedServers?: string[] = [];
    public allowedUsers?: string[] = [];
    public allowedChannels?: string[] = [];
    public permissions: permissionList[] = [];
    public bot_permissions: permissionList[] = [];
    public flags: slashCommandFlags[] = ["devOnly", "ephemeral", "onlyDm", "onlyGuild"];
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
        const message = interaction.options.getString("message", true);

        const solvers = usersCache.filter(e => e.started && e.process);
        if (solvers.size === 0) return interaction.editReply({ embeds: [new EmbedBuilder().setDescription(`${i18n.t("sendMessage.noUsers")}`).setColor("DarkRed")] });
        solvers.forEach((user) => {
            user.emit("message", { message, type: "devlopers_message" } as devlopers_message)
        });

        interaction.editReply({ embeds: [new EmbedBuilder().setDescription(`${i18n.t("sendMessage.messageSent", { users: solvers.size.toString() })}`).setColor("Green")] });
    }
}
