import {
    ActionRowBuilder,
    ChatInputCommandInteraction,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
  } from "discord.js";
  import { SlashCommand, slashCommandFlags } from "../../lib/handler/slashCommand.js";
  import { CustomClient } from "../../core/customClient.js";
  import { permissionList } from "../../lib/handler/messageCommand.js";
  import GuildDocument from "../../entities/guildSettings.js";
  import { I18nInstance } from "../../core/i18n.js";
  import { i18n as mainI18n } from "../../providers/i18n.js";
  import { EmbedBuilder } from "../../lib/handler/embedBuilder.js";
  import { userSettingsRepo } from "../../core/cache.js";
  
  export default class setLang extends SlashCommand {
    public name = "setlang";
    public description = "Set the language for the bot";
    public options = [];
    public cooldown: number | string = "1m";
    public allowedRoles?: string[] = [];
    public allowedServers?: string[] = [];
    public allowedUsers?: string[] = [];
    public allowedChannels?: string[] = [];
    public permissions: permissionList[] = ["Administrator"];
    public bot_permissions: permissionList[] = [];
    public flags: slashCommandFlags[] = ["onlyGuild", "ephemeral", "onlyDm"];
  
    private buildLangMenu(i18n: I18nInstance, lang: string, interactionId: string) {
      const langs = mainI18n.getAvailableLanguages();
      const langMenu = new StringSelectMenuBuilder()
        .setCustomId(`langSelect_${interactionId}`)
        .setMaxValues(1)
        .setMinValues(1)
        .setPlaceholder(i18n.t("setlang.selectLangPlaceholder"));
  
      langs.forEach(language => {
        langMenu.addOptions({
          label: language.name,
          value: language.lang,
          default: lang === language.short,
          emoji: language.flag ? { name: language.flag } : undefined,
        });
      });
  
      return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(langMenu);
    }
  
    private async awaitLangSelection(
      interaction: ChatInputCommandInteraction,
      langMenu: ActionRowBuilder<StringSelectMenuBuilder>
    ): Promise<StringSelectMenuInteraction | null> {
      const filter = (i: any) =>
        i.customId.startsWith("langSelect_") && i.user.id === interaction.user.id;
  
      return (await interaction.channel
        ?.awaitMessageComponent({ filter, time: this.client.clientMs("60s") })
        .catch(() => null)) as StringSelectMenuInteraction | null;
    }
  
    private async updateLangSetting(
      interaction: ChatInputCommandInteraction,
      i18n: I18nInstance,
      selectedLang: string
    ) {
      const updatedI18n = mainI18n.get(selectedLang);
  
      await interaction.editReply({
        embeds: [new EmbedBuilder().setDescription(updatedI18n.t("setlang.langSetMessage"))],
        components: [],
      });
  
      return updatedI18n;
    }
  
    public async execute({
      interaction,
      client,
      i18n,
      lang,
    }: {
      interaction: ChatInputCommandInteraction;
      client: CustomClient;
      i18n: I18nInstance;
      lang: string;
    }): Promise<any> {
      const isDM = interaction.channel?.isDMBased();
  
      if (isDM) {
        // Handle user settings
        const user = interaction.user;
        let userDoc =
          client.userSettings.get(user.id) ??
          (await userSettingsRepo.findOne({ where: { userId: user.id } }));
  
        if (!userDoc) {
          userDoc = userSettingsRepo.create({ userId: user.id });
          await userSettingsRepo.save(userDoc);
        }
        client.userSettings.tempSet(user.id, userDoc, client.clientMs("30m"));
  
        const langMenu = this.buildLangMenu(i18n, lang, interaction.id);
        await interaction.editReply({ components: [langMenu] });
  
        const collected = await this.awaitLangSelection(interaction, langMenu);
        if (!collected) {
          return interaction.editReply({
            components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(langMenu.components[0].setDisabled(true))],
          });
        }
  
        collected.deferUpdate();
        const selectedLang = collected.values[0];
        userDoc.lang = selectedLang;
        await userSettingsRepo.save(userDoc);
  
        await this.updateLangSetting(interaction, i18n, selectedLang);
      } else {
        // Handle guild settings
        const guild = interaction.guild!;
        const repo = this.appDataSource.getRepo(GuildDocument);
  
        let guildDoc = client.guildSettings.get(guild.id);
        if (!guildDoc) {
          guildDoc =
            (await repo.findOneBy({ guildId: guild.id })) ?? repo.create({ guildId: guild.id });
          await repo.save(guildDoc);
          client.guildSettings.set(guild.id, guildDoc);
        }
  
        const langMenu = this.buildLangMenu(i18n, lang, interaction.id);
        await interaction.editReply({ components: [langMenu] });
  
        const collected = await this.awaitLangSelection(interaction, langMenu);
        if (!collected) {
          return interaction.editReply({
            components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(langMenu.components[0].setDisabled(true))],
          });
        }
  
        collected.deferUpdate();
        const selectedLang = collected.values[0];
        guildDoc.lang = selectedLang;
        await repo.save(guildDoc);
        client.guildSettings.set(guild.id, guildDoc);
  
        await this.updateLangSetting(interaction, i18n, selectedLang);
      }
    }
  }
  