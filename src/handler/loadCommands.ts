import { CustomClient } from "../core/customClient.js";
import { SlashCommandConstructor } from "../lib/handler/slashCommand.js";
import { findClosestIndexFolder } from "../utils/tools.js";
import { loadFolder } from "./folderLoader.js";
import path from "path";
import fs from "fs";
import { Logger } from "../core/logger.js";
import { messageCommandConstructor } from "../lib/handler/messageCommand.js";
import { baseDiscordEvent, baseEventConstructor } from "../lib/handler/baseClientEvent.js";
import { buttonCommandConstructor } from "../lib/handler/buttons.js";
import { menuCommandConstructor } from "../lib/handler/menu.js";


export async function loadCommands(client: CustomClient) {
  const rootDir = findClosestIndexFolder();
  const slashCommandPath = path.join(rootDir, "slashCommands");
  const messageCommandsPath = path.join(rootDir, "commands");
  const eventsPath = path.join(rootDir, "events");
  const buttonsPath = path.join(rootDir, "buttons");
  const selectMenusPath = path.join(rootDir, "menu");


  const tasks: Promise<void>[] = [];

  if (fs.existsSync(slashCommandPath)) {
    tasks.push(
      loadFolder(slashCommandPath, { logger: false, shouldReturn: true, subFolders: true }).then((commands: SlashCommandConstructor[]) => {
        for (const Command of commands) {
          if (typeof Command === "function") {
            const cmd = new Command();
            const name = cmd.getName();
            Logger.info(`Loaded slash command: ${name}`);
            client.slashCommands.set(name, cmd);
          }
        }
      })
    );
  } else {
    Logger.error(`Slash commands folder not found at ${slashCommandPath}`);
  }
  if (fs.existsSync(buttonsPath)) {
    tasks.push(
      loadFolder(buttonsPath, { logger: false, shouldReturn: true, subFolders: true }).then((commands: buttonCommandConstructor[]) => {
        for (const Command of commands) {
          if (typeof Command === "function") {
            const cmd = new Command();
            const name = cmd.getName();
            Logger.info(`Loaded button command: ${name}`);
            client.buttons.set(name, cmd);
          }
        }
      })
    );
  } else {
    Logger.error(`Slash commands folder not found at ${slashCommandPath}`);
  }
  if (fs.existsSync(selectMenusPath)) {
    tasks.push(
      loadFolder(selectMenusPath, { logger: false, shouldReturn: true, subFolders: true }).then((menus: menuCommandConstructor[]) => {
        for (const Menu of menus) {
          if (typeof Menu === "function") {
            const cmd = new Menu();
            const name = cmd.getName();
            Logger.info(`Loaded menu command: ${name}`);
            client.menus.set(name, cmd);
          }
        }
      })
    );
  }
  else {
    Logger.error(`Select menus folder not found at ${selectMenusPath}`);
  }

  if (fs.existsSync(messageCommandsPath)) {
    tasks.push(
      loadFolder(messageCommandsPath, { logger: false, shouldReturn: true, subFolders: true }).then((commands: messageCommandConstructor[]) => {
        for (const Command of commands) {
          if (typeof Command === "function") {
            const cmd = new Command();
            Logger.info(`Loaded message command: ${cmd.name}`);
            client.messageCommands.set(cmd.name, cmd);
          }
        }
      })
    );
  } else {
    Logger.error(`Message commands folder not found at ${messageCommandsPath}`);
  }

  if (fs.existsSync(eventsPath)) {
    tasks.push(
      loadFolder(eventsPath, { logger: false, shouldReturn: true, subFolders: true }).then((events: baseEventConstructor[]) => {
        for (const EventClass of events) {
          if (typeof EventClass === "function") {

            const instance = new EventClass(client) as baseDiscordEvent;
            if (instance.once) {
              /// @ts-ignore
              client.once(instance.name, (...args: any[]) => instance.executeEvent(...args));
            } else {
              // @ts-ignore
              client.on(instance.name, (...args: any[]) => instance.executeEvent(...args));
            }

            Logger.info(`Loaded event: ${instance.name}`);
          } else {
            Logger.error(`Invalid event class or missing executeEvent`);
          }
        }
      })
    );
  } else {
    Logger.error(`Events folder not found at ${eventsPath}`);
  }


  await Promise.all(tasks);
}

