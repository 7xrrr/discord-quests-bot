import config from "../../config.js";
import colors from "colors";
import path from "path";
import { fileURLToPath } from 'url';
import { log, error } from "../../utils/logging.js";
import { client } from "../../index.js";
import { readdirSync, statSync } from "fs";
import { REST } from "@discordjs/rest";

import { convertURLs } from "../../utils/windowsUrlConvertor.js";
import { loadEmojis } from "../../utils/loadEmoji.js";
import { Routes } from "discord-api-types/v10";

interface Command {
	name: string;
	description: string;
	options: any[]; // You can replace "any" with the correct type for options
	contexts: any[];
};


export default {
	name: "ready",
	description: "client ready event",
	once: false,
	function: async function () {
		log(`Logged in as ${colors.red(client.user!.tag)}`);

		const __filename = fileURLToPath(import.meta.url);
		const __dirname = path.dirname(__filename);

		const commands: Command[] = [];
		const registerDir = async (dirName: string) => {
			const COMMAND_DIR = path.resolve(__dirname, `../../${dirName}`);
			const readDir = async (dir: string) => {
				const files = readdirSync(dir);
				for await (const file of files) {
					if (statSync(`${dir}/${file}`).isDirectory()) await readDir(`${dir}/${file}`);
					else {
						const fileToImport = process.platform === "win32" ? `${convertURLs(dir)}/${file}` : `${dir}/${file}`;
						const command = (await import(fileToImport)).default;
						if (command?.name) {
							commands.push({
								name: command.name,
								description: command.description,
								options: command.options,
								contexts: command?.contexts || [],
							
							});
							log(`${dir}/${file} has been registered!`);
						} else {
							error(`${dir}/${file} has no name!`);
						}
					}
				}
			};
			await readDir(COMMAND_DIR);
		};

		await registerDir("slashCommands");

        
		const rest = new REST({ version: '10' }).setToken(config.token);
		rest
			.put(Routes.applicationCommands(client.user!.id), { body: commands })
			.then((e) => {
			log(`Successfully registered ${commands.length} commands!`);
			})
			.catch((err) => console.log(err));
         await loadEmojis(client);
	},
} as any;
