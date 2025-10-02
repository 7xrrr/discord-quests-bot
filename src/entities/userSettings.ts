import { Entity, Column } from "typeorm";
import BaseDocument from "../lib/handler/BaseDocument.js";
import config from "../config/config.js";

export interface BannedInfo {
  id: string; // unique id for this ban
  reason: string;
  staff: string; // staff userId who banned
  expireDate: string | null; // ISO date string, or null if permanent
}

export interface BanHistoryEntry {
  id: string; // unique id for this ban entry
  time: string; // ISO date when ban was applied
  expireDate: string | null; // ISO date or null for permanent
  reason: string;
  staff: string; // who banned
  unbannedBy?: string; // who lifted the ban (optional)
}

@Entity("users")
class UserDocument extends BaseDocument {
  @Column()
  userId: string;

  @Column({ default: 0 })
  totalSolvedQuests: number;

  @Column("simple-json", { nullable: true })
  banned?: BannedInfo;

  @Column("simple-json", { nullable: true, default: () => "'[]'" })
  bannedHistory?: BanHistoryEntry[];

  @Column({ nullable: true, default: config.defaultLanguage })
  lang?: string;
}

export default UserDocument;
