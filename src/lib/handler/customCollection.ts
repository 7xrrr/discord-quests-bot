import { Collection } from "discord.js";
import { Logger } from "../../core/logger.js";
import { client } from "../../index.js";


export class customCollection<K, V> extends Collection<K, V> {
    private timeouts: Map<K, NodeJS.Timeout>;

    constructor() {
        super();
        this.timeouts = new Map();
    }

    tempSet(
        key: K,
        value: V,
        time: number = client.clientMs( "30m")
    ) {
        this.set(key, value);

        // clear old timeout if exists
        if (this.timeouts.has(key)) {
            clearTimeout(this.timeouts.get(key)!);
        }

        if (time >= Number.MAX_SAFE_INTEGER) {
            Logger.warn(
                `Time for tempSet is too long: ${time}ms, it may cause memory issues.`
            );
            return;
        }

        // create new timeout
        const timeout = setTimeout(() => {
            this.delete(key);
            this.timeouts.delete(key);
        }, time);

        this.timeouts.set(key, timeout);
    }

    autoSet(key: K, value: V) {
        this.tempSet(key, value, client.clientMs("10m"));
    }

    // optional: cleanup timeout when manually deleting
    override delete(key: K): boolean {
        if (this.timeouts.has(key)) {
            clearTimeout(this.timeouts.get(key)!);
            this.timeouts.delete(key);
        }
        return super.delete(key);
    }

    // optional: cleanup all
    override clear(): void {
        for (const timeout of this.timeouts.values()) {
            clearTimeout(timeout);
        }
        this.timeouts.clear();
        super.clear();
    }
}
