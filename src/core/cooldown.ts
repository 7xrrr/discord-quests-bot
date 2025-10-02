import { Collection } from "discord.js";
import ms from "ms";
import Cooldown from "../entities/cooldown.js";
import { AppDataSource } from "../index.js";

const cooldowns = new Collection<string, cooldown>();









export class cooldown {
    public timeout: NodeJS.Timeout | null = null;
    public key: string;
    public startDate: Date = new Date();
    public endDate: Date | null = null;
    public isDatabaseCooldown: boolean = false;
    public doc_: Cooldown | null = null;
    public time: number;
    static create(key: string, time: number | string, saveDb: boolean = false) {
        const cd = new cooldown(key, time, saveDb);
        return cd;
    }
    static has(key: string) {
        return cooldowns.has(key);
    }
    static async get(key: string, databaseCooldowns: boolean = false) {
        const cd = cooldowns.get(key);
        if (!databaseCooldowns || cd) return cd;
        return await this.getFromDatabase(key);
    }
    static async getFromDatabase(key: string) {

  
        const cdDataBase = AppDataSource?.getRepo(Cooldown);


        const cd = await cdDataBase?.findOneBy({ cdKey: key });

        if (cd) {
            const cooldownInstance = new cooldown(cd.cdKey, cd.time);
            cooldownInstance.setDoc(cd);
            if(cooldownInstance.getRemaining() <= 0) return null;
            return cooldownInstance;


        }


        else return null;
    }
    static delete(key: string) {
        const cd = cooldowns.get(key);
        if (cd) {
            cd.kill();
        }
        return true
    }
    constructor(key: string, time: number | string, saveDb: boolean = false) {
        if (typeof time === "string") {
            const parsedTime = ms(time);
            if (!parsedTime) throw new Error("Invalid time format");
            this.time = parsedTime;
        } else if (typeof time === "number") {
            this.time = time;
        } else {
            throw new Error("Time must be a number or a string");
        }
        this.key = key;
        this.startDate = new Date();
        this.timeout = setTimeout(() => {
            this.kill();
        }, this.time);
        cooldowns.set(this.key, this);
        this.endDate = new Date(this.startDate.getTime() + this.time);
        if (saveDb) this.saveDatebase();

    }
    async saveDatebase() {
        const cdDataBase = AppDataSource.getRepo(Cooldown);
        const cd = cdDataBase.create({
            cdKey: this.key,
            expireDate: this.endDate,
            time: this.time,
        })
        this.doc_ = cd;
        const doc = await cdDataBase.save(cd);
        this.setDoc(doc);
        return cd;
    }
    getRemaining() {
        return Math.max(this.endDate.getTime() - Date.now(), 0)
    }
    getInfo() {
        return {
            key: this.key,
            time: this.time,
            remaining: this.getRemaining(),
            startDate: this.startDate,
            endDate: this.endDate,
            isActive: this.timeout !== null
        };


    }

    setDoc(doc: Cooldown) {
        this.doc_ = doc;
        this.isDatabaseCooldown = true;
        this.endDate = doc.expireDate;
        // @ts-ignore
        this.startDate = doc.createdAt
        this.time = doc.time;
        this.reloadTimeout()




    }
    reloadTimeout() {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        this.timeout = setTimeout(() => {
            this.kill();
        }, this.getRemaining());
        return this.timeout;
    }

    kill() {
        cooldowns.delete(this.key);
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        cooldowns.delete(this.key);
        if (this.isDatabaseCooldown && this.doc_) {
            // @ts-ignore
            AppDataSource.getRepo(Cooldown).delete(this.doc_.id);
        }


    }





}