import type { ClientEvents } from "discord.js";
import { CustomClient } from "../../core/customClient.js";
import { Logger } from "../../core/logger.js";
import { i18n } from "../../providers/i18n.js";
import I18nManager from "../../core/i18n.js";
import { CustomDataSource } from "../../core/DataSource.js";

//import { events } from "../../core/sallaApi";
import { AppDataSource } from "../../index.js";




export type baseEventConstructor = new (client: CustomClient) => baseDiscordEvent;
export abstract class baseDiscordEvent {
    public i18n: I18nManager = i18n;
    public name: keyof ClientEvents
    public once: boolean;
    public appDataSource: CustomDataSource = AppDataSource;

    public logger = Logger
    public client:CustomClient = null;


    constructor(client: CustomClient) {
        this.client = client;
      }

    abstract executeEvent(
        ...args: ClientEvents[keyof ClientEvents] | any[]
    )
}
