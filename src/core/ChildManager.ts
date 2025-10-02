import { fork, ChildProcess } from "child_process";
import path from "path";
import questsConfig from "../config/questsConfig.js";
import { findClosestIndexFolder } from "../utils/tools.js";
import { Logger } from "./logger.js";
import { Collection } from "discord.js";
import { ChildMessage } from "../interface/ChildMessage.js";
import { client } from "../index.js";

export class ChildManager {
  private static childProcesses: Collection<
    number,
    { process: ChildProcess; currentTasks: number }
  > = new Collection();

  static async loadChildProcess() {
    const count = questsConfig.childProcessCount;

    for (let i = 0; i < count; i++) {
      this.spawnChild();
    }
  }
  static get maxUsage() {
    return Math.floor(questsConfig.childProcessCount * questsConfig.questsPerChildProcess);
  }
  static get pids() {
    return this.childProcesses.map((c) => c.process.pid);
  }

  private static spawnChild() {
    const childPath = path.join(
      findClosestIndexFolder(),
      "childProcess",
      "childProcess.js"
    );

    const child = fork(childPath, [], {
      stdio: ["inherit", "inherit", "inherit", "ipc"],
    });

    child.on("message", (msg: ChildMessage) => {
      const type = msg?.type;

      if (type === "ready") {
        Logger.info(`Child process ${child.pid} is ready`);
      } else if (type === "process_update") {

        const childInfo = this.childProcesses.get(child.pid);
        if (childInfo) {
          childInfo.currentTasks = msg.count;
        }
        const totalUsage = this.TotalUsage;
        client.updateActivity()
        Logger.info(`Child process ${child.pid} updated task count to ${msg.count}. Total usage: ${totalUsage}`);
      }
    });

    child.on("exit", (code, signal) => {
      Logger.warn(
        `Child process ${child.pid} exited with code ${code}, signal ${signal}`
      );
      this.childProcesses.delete(child.pid);

      // 🔁 Respawn automatically
      Logger.info(`Respawning child process...`);
      this.spawnChild();
    });

    this.childProcesses.set(child.pid, {
      process: child,
      currentTasks: 0,
    });

    Logger.info(`Child process ${child.pid} started`);
  }

  static getChildren() {
    return this.childProcesses;
  }

  static getAvailableChild(): ChildProcess | null {
    let selected: { process: ChildProcess; currentTasks: number } | null = null;

    for (const child of this.childProcesses.values()) {
      if (!selected || child.currentTasks < selected.currentTasks) {
        selected = child;
      }
    }

    return selected?.process ?? null;
  }
  static getLowestUsageChild():
    | { process: ChildProcess; currentTasks: number }
    | null {
    let selected: { process: ChildProcess; currentTasks: number } | null = null;

    for (const child of this.childProcesses.values()) {
      if (!selected || child.currentTasks < selected.currentTasks) {
        selected = child;
      }
    }

    return selected;
  }
  static get TotalUsage() {
    return this.childProcesses.reduce((c, p) => c + p.currentTasks, 0);
  }


}
