import { ChatInputCommandInteraction, SlashCommandStringOption } from "discord.js";
import { SlashCommand, slashCommandFlags } from "../../lib/handler/slashCommand.js";
import { CustomClient } from "../../core/customClient.js"; 
import { permissionList } from "../../lib/handler/messageCommand.js";
import GuildDocument from "../../entities/guildSettings.js";
import { I18nInstance } from "../../core/i18n.js";
import { EmbedBuilder } from "../../lib/handler/embedBuilder.js";


export default class setprefix extends SlashCommand {
    public name: string = "setprefix";
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
        const guild = interaction.guild;
             const GuildDocumentRepo = this.appDataSource.getRepo(GuildDocument);
        let guildSettings = client.guildSettings.get(guild.id);
        if (!guildSettings) {
            let doc = await GuildDocumentRepo.findOneBy({ guildId: guild.id }) ?? GuildDocumentRepo.create({ guildId: guild.id });
            await GuildDocumentRepo.save(doc);
            client.guildSettings.set(guild.id, guildSettings);
            guildSettings = client.guildSettings.get(guild.id);
        }
        const newPrefix = interaction.options.getString("prefix");
        guildSettings.prefix = newPrefix;
        await GuildDocumentRepo.save(guildSettings);
        client.guildSettings.set(guild.id, guildSettings);
        const embed = new EmbedBuilder().setDescription(i18n.t("setprefix.prefixSetMessage", { prefix: newPrefix }))
        await interaction.editReply({ embeds: [embed] });






    }
}
