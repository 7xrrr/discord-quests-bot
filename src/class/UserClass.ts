import { APIUser } from "discord.js";
import { Quest } from "../interface/quest.js";
import { AxiosInstance } from "axios";
import { makeAxiosInstance } from "../questFunc/axiosInstance.js";
import { client } from "../index.js";
import config from "../config.js";

// Cache for Axios instances to avoid recreating them unnecessarily
const axiosInstanceCache = new WeakMap<QuestUser, AxiosInstance>();

export class QuestUser {
    private _user: APIUser | null = null;
    private _quests: Quest[] = [];
    private _token: string;
    private _disableCache: boolean;

    constructor(config: { token: string; disableCache?: boolean }) {
        this._token = config.token;
        this._disableCache = config.disableCache || false;
    }

    get token(): string {
        return this._token;
    }

    get api(): AxiosInstance {
        if (!axiosInstanceCache.has(this)) {
            axiosInstanceCache.set(this, makeAxiosInstance(this.token));
        }
        return axiosInstanceCache.get(this)!;
    }

    get user(): APIUser | null {
        return this._user;
    }

    get id(): string | null {
        return this._user?.id || null;
    }

    async fetch(): Promise<APIUser | null> {
        try {
            const response = await this.api.get("/users/@me");
            this._user = response.data;
            return this._user;
        } catch (err) {
            console.error("Error fetching user:", err);
            return null;
        }
    }

    async fetchQuests(): Promise<Quest[] | null> {
        try {
            const response = await this.api.get("/quests/@me");
            this._quests = response.data?.quests || [];
            this.checkForNewQuests();
            if (this._disableCache) this._quests = []; 
            return response.data?.quests || [];
        } catch (err) {
            console.error("Error fetching quests:", err);
            return null;
        }
    }

    private checkForNewQuests(): void {
        const newQuests = this._quests.filter(
            (quest) =>
                Math.floor(Date.now() - new Date(quest?.config?.starts_at).getTime()) <= config.minQuestTime &&
                !client.newQuests.get(quest.id)
        );

        if (newQuests.length > 0) {
        
            client.emit("newQuests", newQuests);
        }
    }

    get quests() {
        return {
            fetch: () => this.fetchQuests(),
            list: this._quests,
            check: () => this.checkForNewQuests(),
        };
    }

    destroy(): void {
        axiosInstanceCache.delete(this);
        this._user = null;
        this._quests = [];
    }
}