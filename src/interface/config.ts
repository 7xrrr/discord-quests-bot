import { DatabaseConfigOptions } from "../core/databaseConfig.js";

export interface Config {
    token: string;
    database: DatabaseConfigOptions;
    prefix: string;
    developers?: string[];
    allowedServers?: string[];
    embedColor: string,
    debugMode?: boolean;
    defaultLanguage?: string;
    seasonsPath: string;

}
