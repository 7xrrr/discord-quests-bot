import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CustomClient, root } from '../index.js';
import { convertURLs } from './windowsUrlConvertor.js';
import { SnowflakeUtil } from "discord.js";
const __filename = fileURLToPath(import.meta.url);

const fileTypes = ["js","ts"]

export const  loadQuests = async (client:CustomClient,pathDir?:string) =>  {

    const rootDir = pathDir || path.join(root, "quests");

    if (!fs.existsSync(rootDir)) { console.log("No quests found"); return; };
    const questFiles = fs.readdirSync(rootDir);

    questFiles.forEach(async (file) => {
        const filePath = path.join(rootDir, file);
        const isFolder = fs.lstatSync(filePath).isDirectory();
        if (isFolder) return loadQuests(client, filePath);
        if (!fileTypes.includes(file.split('.').pop())) return;
        const quest = (await import(convertURLs(filePath)))?.default;
        if (quest && quest.filterKey)  {
            client.questsConfig.set(SnowflakeUtil.generate().toString(), quest);  
        }
    })

}