// file: structures/EmbedBuilder.ts
import { EmbedBuilder as DiscordEmbedBuilder } from "discord.js";
import config from "../../config/config.js";



export class EmbedBuilder extends DiscordEmbedBuilder {
  constructor(options?: any) {
    super(options);
    this.setColor(`#${config.embedColor.replaceAll("#","")}`); 
  }
}



