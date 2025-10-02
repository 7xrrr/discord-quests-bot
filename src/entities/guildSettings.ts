import { Entity, Column } from "typeorm";
import BaseDocument from "../lib/handler/BaseDocument.js";
import config from "../config/config.js";

// Command settings for a single command (keyed by command name)
export interface GuildCommandSettings {
  enabled: boolean;
  allowedPermissions: string[];
  allowedRoles: string[];
  disabledRoles: string[];
  allowedChannels: string[];
  disabledChannels: string[];
}

// Entire commands config: record of commandName => settings
type GuildCommandsRecord = Record<string, GuildCommandSettings>;

@Entity("guilds")
class GuildDocument extends BaseDocument {
  @Column()
  guildId: string;

  @Column({ nullable: true })
  prefix?: string;
  @Column({ default: false })
  ticketSystem?: boolean;


  @Column({ nullable: true, default: config.defaultLanguage })
  lang?: string;

  @Column("simple-json", { nullable: true })
  commands?: GuildCommandsRecord;
}

export default GuildDocument;
