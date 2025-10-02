import { AxiosInstance } from "axios";
import { ProxyInterface } from "../utils/loadProxy.js";
import { getIdFromToken } from "../utils/quest/tokenUtils.js";
import { customAxiosWithProxy } from "../utils/quest/axiosInstance.js";
import { QuestConfig } from "../lib/questConfig.js";
import { sendToProcess } from "./tools.js";
import { customSelfClient } from "./client.js";
import { Logger } from "../core/logger.js";
import questsConfig from "../config/questsConfig.js";
import { Guild, VoiceChannel } from "discord.js-selfbot-v13";
import { ChildMessage } from "../interface/ChildMessage.js";
import { removeClient } from "./childProcess.js";

export class ChildUser {
    token: string;
    id: string;
    proxy: ProxyInterface | null;
    _api: AxiosInstance | null;
    client: customSelfClient = null;
    rolePromise: Promise<boolean> | null = null;
    started = false;
    completed = false;
    stoped = false;
    questConfig: QuestConfig;
    quest: string;
    current = 0;
    target = 0;

    private abortController: AbortController | null = null;

    constructor(
        token: string,
        proxy: ProxyInterface,
        questId: string,
        questConfig: QuestConfig,
        current: number,
        target: number
    ) {
        this.token = token;
        this.quest = questId;
        this.proxy = proxy || null;
        this._api = null;
        this.id = getIdFromToken(this.token);
        this.questConfig = questConfig;
        this.current = current;
        this.target = target;
    }

    get api(): AxiosInstance {
        if (!this._api) {
            this.abortController = new AbortController();
            this._api = customAxiosWithProxy(this.token, this.proxy);

            // attach abort signal to all requests
            this._api.interceptors.request.use((config) => {
                if (this.abortController) {
                    config.signal = this.abortController.signal;
                }
                return config;
            });
        }
        return this._api;
    }

    sendUpdate(progress: number, completed: boolean) {
        sendToProcess?.({
            type: "progress_update",
            target: this.id,
            data: {
                userId: this.id,
                questId: this.quest,
                progress,
                completed,
                target: this.target,
            },
        });
    }


    async start() {
        if (this.started) return false;
        this.started = true;

        try {
            if (this.questConfig.requireLogin || this.questConfig.requireVoiceChannel) {
                const loginOk = await this.initializeClient();
                if (!loginOk) return false;

                if (this.questConfig.requireVoiceChannel) {
                    const voiceOk = await this.handleVoiceRequirements();
                    if (!voiceOk) return false;
                }
            }

            // Kick off quest logic
            await this.questConfig.run(this);
            return true;
        } catch (err) {
            Logger.error(`Error while starting quest for user ${this.id}:`, err);
            this.stop();
            return false;
        }
    }

    /**
     * Destroy old client and log in a new one.
     */
    private async initializeClient(): Promise<boolean> {
        if (this.client) {
            try {
                this.client.destroy?.();
            } catch (err) {
                Logger.warn(`Failed to destroy existing client for user ${this.id}:`, err);
            }
        }

        this.client = new customSelfClient(this?.proxy);

        try {
            await this.client.login(this.token);

            if (!this.client.sessionId) {
                Logger.error(`User ${this.id} login failed — no sessionId returned.`);
                this.stop();
                return false;
            }

            Logger.info(`User ${this.id} logged in successfully.`);
            sendToProcess({ type: "logged_in", target: this.id });

            this.client.once("invalidated", () => {
                Logger.warn(`User ${this.id} session invalidated.`);
                this.stop();
            });

            return true;
        } catch (error) {
            Logger.error(`User ${this.id} login error:`, error);
            sendToProcess({ type: "login_error", target: this.id });
            this.stop();
            return false;
        }
    }

    /**
     * Check voice requirements: guild, channel, role, join.
     */
    private async handleVoiceRequirements(): Promise<boolean> {
        const { serverId, voice } = questsConfig;
        Logger.debug(`[Voice] Checking voice requirements for user ${this.id}`);

        if (!voice?.channel || !voice?.role) {
            Logger.debug(`[Voice] Missing channel or role config for user ${this.id}`);
            return false;
        }

        Logger.debug(`[Voice] Fetching guild ${serverId} for user ${this.id}`);
        const guild: Guild =
            this.client.guilds.cache.get(serverId) ??
            (await this.client.guilds.fetch(serverId).catch((err) => {
                Logger.warn(`[Voice] Failed to fetch guild ${serverId} for user ${this.id}:`, err);
                return null;
            }));

        if (!guild) {
            Logger.debug(`[Voice] Guild not found for user ${this.id}`);
            return false;
        }

        Logger.debug(`[Voice] Fetching member ${this.client.user!.id} in guild ${serverId}`);
        const member = await guild.members.fetch(this.client.user!.id).catch((err) => {
            Logger.warn(`[Voice] Failed to fetch member ${this.client.user!.id} in guild ${serverId}:`, err);
            return null;
        });

        if (!member) {
            Logger.error(`[Voice] User ${this.id} failed to fetch member data.`);
            this.stop("Failed to fetch member data");
            return false;
        }

        Logger.debug(`[Voice] Fetching channel ${voice.channel} for user ${this.id}`);
        const channel: VoiceChannel =
            guild.channels.cache.get(voice.channel) ??
            (await guild.channels.fetch(voice.channel).catch((err) => {
                Logger.warn(`[Voice] Failed to fetch channel ${voice.channel} in guild ${serverId}:`, err);
                return null;
            }));

            console.log(
                channel.name,
                channel.type,
                this.client.user.tag
            )
        if (!channel || !channel.isVoice() || channel.type !== "GUILD_VOICE") {
            Logger.warn(`[Voice] Invalid or non-voice channel ${voice.channel} for user ${this.id}`);
            this.destroy();
            sendToProcess({ type: "bad_channel", target: this.id });
            return false;
        }

        Logger.debug(`[Voice] Checking if user ${this.id} has role ${voice.role}`);
        if (!member.roles.cache.has(voice.role)) {
            Logger.debug(`[Voice] User ${this.id} missing role ${voice.role}, waiting...`);
            const gotRole = await this.waitForRole();
            if (!gotRole) {
                Logger.warn(`[Voice] User ${this.id} did not receive role ${voice.role} in time`);
                sendToProcess({ type: "role_timeout", target: this.id });
                return false;
            }
            Logger.debug(`[Voice] User ${this.id} received role ${voice.role}`);
        }

        Logger.debug(`[Voice] Attempting to join channel ${channel.id} for user ${this.id}`);
        try {
            
            await this.client.ws.broadcast({
                op: 4,
                d: {
                  guild_id: guild.id,
                  channel_id: channel.id,
                  self_mute: true,
                  self_deaf: true,
                },
            });
            Logger.debug(`[Voice] User ${this.id} successfully joined channel ${channel.id}`);
            sendToProcess({ type: "connected_to_channel", target: this.id });
            return true;
        } catch (err) {
            Logger.error(`[Voice] User ${this.id} failed to join voice channel ${channel.id}:`, err);
            sendToProcess({ type: "bad_channel", target: this.id });
            return false;
        }
    }


    /**
     * Wait for the process to confirm role assignment, with timeout.
     */
    private waitForRole(): Promise<boolean> {
        sendToProcess({ type: "role_required", target: this.id });

        const rolePromise = new Promise<boolean>((resolve) => {
            const onReceiveRole = (message: ChildMessage) => {
                if (message.type === "role_received" && message.target === this.id) {
                    process.off("message", onReceiveRole);
                    resolve(true);
                }
            };
            process.on("message", onReceiveRole);
        });

        const timeoutPromise = new Promise<boolean>((resolve) =>
            setTimeout(() => resolve(false), 30_000)
        );

        return Promise.race([rolePromise, timeoutPromise]);
    }




    async delay(time: number) {
        return new Promise((resolve) => setTimeout(resolve, time));
    }

    stop(message: string = "Stopped by user") {
        if (this.stoped) return;
        this.stoped = true;
        //this.sendUpdate(this.current, this.completed);
        this.destroy();
        sendToProcess({
            type: "kill",
            target: this.id,
            message,
        });

    }

    extractProgress(quest: any): QuestProgress | null {
        const progress = quest?.progress?.[this.questConfig.name];
        if (!progress) {
            return {
                value: 0,
                completed: false,
            }
        }

        return {
            value: progress?.value ?? 0,
            completed: progress?.completed_at != null,
        };
    }

    destroy() {
        // Cancel ongoing axios requests
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        removeClient(this)

        this?.client?.destroy?.();
        // Drop refs for GC
        this._api = null;
        this.proxy = null;
        this.questConfig = null as any;

    }
}

interface QuestProgress {
    value: number;
    completed: boolean;
}
