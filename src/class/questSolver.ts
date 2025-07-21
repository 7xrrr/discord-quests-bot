import { EventEmitter } from "events";
import { Quest } from "../interface/quest.js";
import { SwitchQuestResult } from "../questFunc/switchQuests.js";
import { ChildProcess, fork } from "child_process";
import path from "path";
import { AxiosInstance } from "axios";
import { client, root } from "../index.js";
import config from "../config.js";
import { GuildMember } from "discord.js";

export class QuestSolver extends EventEmitter {
    private userid: string;
    private quest: Quest;
    questConfig: SwitchQuestResult;
    childProcess: ChildProcess | null = null;
    axiosInstance: AxiosInstance;
    token: string;
    stopped: boolean = false;
    status: Record<string, any> = {};

    constructor(userid: string, quest: Quest, questConfig: SwitchQuestResult, axiosInstance: AxiosInstance, token: string) {
        super();
        this.userid = userid;
        this.quest = quest;
        this.questConfig = questConfig;
        this.axiosInstance = axiosInstance;
        this.token = token;
        this.start();
    }

    /**
     * Starts the quest-solving process.
     */
    async start() {
        const { questConfig, quest, userid, token } = this;

        if (questConfig.model.requireLogin) {
            await this.startChildProcess();
        } else {
            await questConfig.model.run(client, this.axiosInstance, quest, this);
        }
    }

    /**
     * Starts the child process for quests that require login.
     */
    private async startChildProcess() {
        const filePath = path.join(root,"childProcess","childProcess.js");
        

        const child = fork(filePath, [JSON.stringify({
            questConfig: this.questConfig,
            quest: this.quest,
            userid: this.userid,
            token: this.token,
        })], { silent: false });

        this.childProcess = child;

        // Handle child process events
        this.childProcess.on("exit", (code) => this.handleChildProcessExit(code));
        this.childProcess.on("close", (code) => this.handleChildProcessClose(code));
        this.childProcess.on("message", (message) => this.handleChildProcessMessage(message));
    }

    /**
     * Handles child process exit events.
     */
    private handleChildProcessExit(code: number) {
        this.stop(`Child process exited with code ${code}`);
    }

    /**
     * Handles child process close events.
     */
    private handleChildProcessClose(code: number) {
        this.stop(`Child process closed with code ${code}`);
    }

    /**
     * Handles messages from the child process.
     */
    private handleChildProcessMessage(message: any) {
        const { code, ...data } = message;

        switch (code) {
            case "clientReady":
                this.handleClientReady(data.message);
                break;
            case "requireRole":
                this.handleRequireRole();
                break;
            case "voiceChannelJoined":
                this.handleVoiceChannelJoined();
                break;
            case "setRunningGame":
                this.handleSetRunningGame(data.message);
                break;
            case "streamCreated":
                this.handleStreamCreated(data.streamKey);
                break;
            case "error":
                this.handleError(data.message);
                break;
            case "startQuest":
                this.handleStartQuest();
                break;
            default:
                console.warn(`Unknown message code: ${code}`);
        }
    }

    /**
     * Handles the "clientReady" event from the child process.
     */
    private handleClientReady(sessionId: string) {
        this.status.sessionId = sessionId;
        this.emit("transferMessage", "Client is ready");
    }

    /**
     * Handles the "requireRole" event from the child process.
     */
    private async handleRequireRole() {
        this.emit("transferMessage", "Required role");

        const guild = client.guilds.cache.get(config.server.serverid);
        const role = guild?.roles.cache.get(config.server.roleId);

        if (!guild || !role) {
            this.stop("Role or guild not found");
            return;
        }

        const member: GuildMember | null = await guild.members.fetch(this.userid).catch(() => null);
        if (!member) {
            this.stop("Member not found");
            return;
        }

        if (member.roles.cache.has(role.id)) {
            this.childProcess?.send({ code: "roleAdded" });
        } else {
            await member.roles.add(role)
                .then(() => {
                    this.childProcess?.send({ code: "roleAdded" });
                    this.emit("transferMessage", "Role added");
                })
                .catch((err) => {
                    this.stop("Failed to add role");
                });
        }
    }

    /**
     * Handles the "voiceChannelJoined" event from the child process.
     */
    private handleVoiceChannelJoined() {
        this.status.voiceChannelJoined = true;
        this.emit("transferMessage", "Voice channel joined");
    }

    /**
     * Handles the "setRunningGame" event from the child process.
     */
    private handleSetRunningGame(gameName: string) {
        this.emit("transferMessage", `Game ${gameName} started`);
    }

    /**
     * Handles the "streamCreated" event from the child process.
     */
    private handleStreamCreated(streamKey: string) {
        this.status.streamCreated = { streamKey, created: true };
        this.emit("transferMessage", "Stream created");
    }

    /**
     * Handles the "error" event from the child process.
     */
    private handleError(errorMessage: string) {
        console.fullLog(errorMessage);
        this.emit("error", errorMessage);
        this.stop(`Error: ${errorMessage}`);
    }

    /**
     * Handles the "startQuest" event from the child process.
     */
    private async handleStartQuest() {
        await this.questConfig.model.run(client, this.axiosInstance, this.quest, this, this.childProcess);
    }

    /**
     * Stops the quest-solving process.
     */
    stop(reason: string = "Stopped with no reason") {
        if (this.stopped) return;
        this.stopped = true;

        if (this.childProcess) {
            this.childProcess.kill();
            this.childProcess = null;
        }

        console.log(`Stopped: ${reason}`);
        this.emit("stop", reason);
        this.destroy();
    }

    /**
     * Cleans up resources.
     */
    destroy() {
        (globalThis as any).instance = null;
    }
}