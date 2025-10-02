import fs from "fs";

import { findProjectRoot } from "./tools.js";
import path from "path";
import { Collection } from "discord.js";
import { Logger } from "../core/logger.js";

export interface ProxyInterface {
    ip: string;
    authentication: string;
}

async function readProxy(collection: Collection<any, any>): Promise<void> {
    try {
        const proxyPath = path.join(findProjectRoot(), 'proxy.txt');
        if (!fs.existsSync(proxyPath)) return console.error("Proxy file not found at:", proxyPath);
        const data = await fs.readFileSync('proxy.txt', 'utf8');
        const lines = data.split('\n');

        collection.clear(); // Clear existing proxies before loading new ones
        for (const line of lines) {
            const splited = line.trim().split(":");
            if (splited.length !== 4) {
                Logger.info("Bad Proxy line: " + line);
                continue;
            }

            collection.set(line, {
                ip: `${splited[0]}:${splited[1]}`,
                authentication: `${splited[2]}:${splited[3]}`,
            });
        }
        Logger.info(`Loaded ${collection.size} proxies successfully.`);
    } catch (error) {
        Logger.error("Error reading proxy file:", error);
    }
}
export const writeProxy = async (proxies: string): Promise<void> => {
    try {
        const proxyPath = path.join(findProjectRoot(), 'proxy.txt');
        await fs.writeFileSync(proxyPath, proxies, 'utf8');
        Logger.info('Proxies have been written to', proxyPath);
    } catch (error) {
        Logger.error('Error writing to proxy file:', error);
    }


}
export default readProxy;