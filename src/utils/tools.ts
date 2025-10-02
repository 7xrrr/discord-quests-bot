import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import humanizeDuration from "humanize-duration";
import config from "../config/config.js";
import { ActionRowBuilder, ComponentType, Guild, RGBTuple, SnowflakeUtil } from "discord.js";
import { i18n } from "../providers/i18n.js";


import numeral from "numeral";
import axios from "axios";
import ini from "ini";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let root = null;
let indexFolder = null;
indexFolder = findClosestIndexFolder();
interface DiffResultMap {
    [key: string]: DiffResult;
}
export function capitalizeWords(str: string): string {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  }

interface DiffResult {
    old?: any;
    new?: any;
    added?: any[];
    removed?: any[];
    updated?: Record<string, DiffResult>;
    // nested diffs
    [key: string]: any;
}
/**
 * Retries an async function until it resolves or max retries are reached
 * @param fn - async function to retry
 * @param retries - number of attempts
 * @param delayMs - optional delay between attempts in milliseconds
 */
// A generic retry helper
export async function tryAgain<T>(
    fn: () => Promise<T>,
    retries = 3,
    delayMs = 0
): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (attempt < retries && delayMs > 0) {
                await new Promise(res => setTimeout(res, delayMs));
            }
        }
    }

    throw lastError;
}



export function toTimestamp(dateStr: string, inSeconds = false, id = false): number | string {
    const ts = new Date(dateStr).getTime();
    if (isNaN(ts)) {
        throw new Error(`Invalid date string: ${dateStr}`);
    }
    let time = inSeconds ? Math.floor(ts / 1000) : ts as number;
    if (id) {
        if (inSeconds) time = time * 1000;
        return SnowflakeUtil.generate({ timestamp: time }).toString() as string;
    }

    return time;
}


function isObject(val: any): val is Record<string, any> {
    return typeof val === "object" && val !== null && !Array.isArray(val);
}

export function deepDiff(oldObj: any, newObj: any): DiffResult | {} {
    if (oldObj === newObj) return {};

    // Handle arrays
    if (Array.isArray(oldObj) && Array.isArray(newObj)) {
        // Case 1: array of primitives
        if (
            oldObj.every(v => typeof v !== "object") &&
            newObj.every(v => typeof v !== "object")
        ) {
            const removed = oldObj.filter(v => !newObj.includes(v));
            const added = newObj.filter(v => !oldObj.includes(v));
            return { added, removed };
        }

        // Case 2: array of objects with `id`
        if (
            oldObj.every(v => isObject(v) && "id" in v) &&
            newObj.every(v => isObject(v) && "id" in v)
        ) {
            const oldMap = new Map(oldObj.map(v => [v.id, v]));
            const newMap = new Map(newObj.map(v => [v.id, v]));

            const removed: any[] = [];
            const added: any[] = [];
            const updated: Record<string, DiffResult> = {};

            for (const [id, oldVal] of oldMap.entries()) {
                if (!newMap.has(id)) {
                    removed.push(oldVal);
                } else {
                    const nestedDiff = deepDiff(oldVal, newMap.get(id));
                    if (Object.keys(nestedDiff).length > 0) {
                        updated[id] = nestedDiff as DiffResult;
                    }
                }
            }

            for (const [id, newVal] of newMap.entries()) {
                if (!oldMap.has(id)) {
                    added.push(newVal);
                }
            }

            const result: DiffResult = {};
            if (added.length) result.added = added;
            if (removed.length) result.removed = removed;
            if (Object.keys(updated).length) result.updated = updated;

            return result;
        }

        // Fallback: compare by index
        if (oldObj.length !== newObj.length) {
            return { old: oldObj, new: newObj };
        }
        const diffs: any[] = [];
        oldObj.forEach((val, i) => {
            const diff = deepDiff(val, newObj[i]);
            if (Object.keys(diff).length > 0) {
                diffs[i] = diff;
            }
        });
        return diffs.length > 0 ? diffs : {};
    }

    // Handle objects
    if (isObject(oldObj) && isObject(newObj)) {
        const diff: DiffResultMap = {};
        const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

        for (const key of keys) {
            if (!(key in newObj)) {
                diff[key] = { old: oldObj[key], new: undefined };
            } else if (!(key in oldObj)) {
                diff[key] = { old: undefined, new: newObj[key] };
            } else {
                const nestedDiff = deepDiff(oldObj[key], newObj[key]);
                if (Object.keys(nestedDiff).length > 0) {
                    diff[key] = nestedDiff as DiffResult;
                }
            }
        }

        return Object.keys(diff).length > 0 ? diff : {};
    }

    // Primitive mismatch
    return { old: oldObj, new: newObj };
}

export function readJsonFile<T>(path: string, fallback: T): T {
    try {
        if (!fs.existsSync(path)) {
            console.warn(`File not found: ${path}`);
            return fallback;
        }

        const content = fs.readFileSync(path, "utf-8");
        return JSON.parse(content) as T;
    } catch (error) {
        console.error(`Error reading JSON file at ${path}:`, error);
        return fallback;
    }
}
export type UnitName = "y" | "mo" | "w" | "d" | "h" | "m" | "s" | "ms";
export function hexToRGB(hex: string): RGBTuple {
    // Remove # if it exists
    hex = hex.replace(/^#/, "");

    // Handle shorthand (#fff → #ffffff)
    if (hex.length === 3) {
        hex = hex.split("").map(char => char + char).join("");
    }

    if (hex.length !== 6) {
        throw new Error("Invalid hex color format");
    }

    const red = parseInt(hex.slice(0, 2), 16);
    const green = parseInt(hex.slice(2, 4), 16);
    const blue = parseInt(hex.slice(4, 6), 16);

    return [red, green, blue];
}
export function findProjectRoot(): string {
    let dir = __dirname;
    if (!root) {
        while (!fs.existsSync(path.join(dir, 'package.json'))) {
            const parentDir = path.dirname(dir);
            if (parentDir === dir) break; // We have reached the root, no package.json found
            dir = parentDir;
        }
        root = dir;

        return dir;
    }
    else return root


}
const customFormats: Record<string, (timestampSeconds: number) => string> = {
    Date: (timestampSeconds) => `<t:${timestampSeconds}:d> <t:${timestampSeconds}:t>`,
};
export function splitByLines(text: string, maxChunkSize: number): string[] {
    const lines: string[] = text.split("\n");
    const chunks: string[] = [];
    let currentChunk: string = "";

    for (const line of lines) {
        const lineWithBreak = line + "\n";

        // If adding the next line would exceed the chunk size
        if ((currentChunk + lineWithBreak).length > maxChunkSize) {
            if (currentChunk) {
                chunks.push(currentChunk);
                currentChunk = "";
            }

            // If single line is too long, push it alone
            if (lineWithBreak.length > maxChunkSize) {
                chunks.push(lineWithBreak);
            } else {
                currentChunk = lineWithBreak;
            }
        } else {
            currentChunk += lineWithBreak;
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk);
    }

    return chunks;
}
export function getStars(count) {
    const star = "⭐";
    return star.repeat(count);
}

export function splitByEmptyLines(text: string, maxChunkSize: number): string[] {
    const paragraphs = text.split(/\n\s*\n/); // Split on empty lines
    const chunks: string[] = [];
    let currentChunk = "";

    for (const paragraph of paragraphs) {
        const para = paragraph.trim();
        if (!para) continue;

        const withSpacing = currentChunk ? currentChunk + "\n\n" + para : para;

        if (withSpacing.length > maxChunkSize) {
            if (currentChunk) chunks.push(currentChunk);
            if (para.length > maxChunkSize) {
                // If paragraph is larger than chunk limit, force it in as its own chunk
                chunks.push(para);
                currentChunk = "";
            } else {
                currentChunk = para;
            }
        } else {
            currentChunk = withSpacing;
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk);
    }

    return chunks;
}
export function formatDiscordTimestamp(
    timestampMs: number,
    styleOrFormat: "Date" | 't' | 'T' | 'd' | 'D' | 'f' | 'F' | 'R' | string = 'R',
): string {
    const timestampSeconds = Math.floor(timestampMs / 1000);

    if (customFormats[styleOrFormat]) {
        return customFormats[styleOrFormat](timestampSeconds);
    }

    if (['t', 'T', 'd', 'D', 'f', 'F', 'R'].includes(styleOrFormat)) {
        return `<t:${timestampSeconds}:${styleOrFormat}>`;
    }


    return `<t:${timestampSeconds}:R>`;
}
export async function downloadAndParseIni(url) {

    try {
        const response = await axios.get(url, { responseType: 'text' });
        const iniString = response.data;

        // Parse the INI string to an object
        const config = ini.parse(iniString);

        return config;
    } catch (error) {
        console.error('Error downloading or parsing INI:', error);
        throw error;
    }
}
export function stringifyIni(data: Record<string, any>): string {
    return `;METADATA=(Diff=true, UseCommands=true)\n${ini.stringify(data)}`;
}



export function readableBytes(bytes: number) {
    return numeral(bytes).format("0.0b");

}
export function mbToBytes(mb: number): number {
    return mb * 1024 * 1024;
}

export function chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
export function saveText(name: string, content: any): string {
    if (typeof content !== "string") {
        content = JSON.stringify(content, null, 2);
    }
    if (name.split(".").length === 1) {
        name += ".json";
    }
    name = name.replace(".", "_").toLowerCase().replace("_json", ".json");
    const folderPath = path.join(findProjectRoot(), "json");
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
    }
    const filePath = path.join(folderPath, `${name}`);

    fs.writeFileSync(filePath, content, { encoding: "utf8" });
    return filePath;

}
/**
 * Sets a nested value in an object by path string.
 * If the path does not exist, it creates the necessary objects.
 */
export function setByPath<T extends object>(
    obj: T,
    path: string,
    value: any
): T {
    const keys = path.split(".").filter(Boolean);
    let current: any = obj;

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const isLast = i === keys.length - 1;

        if (isLast) {
            current[key] = value;
        } else {
            if (typeof current[key] !== "object" || current[key] === null) {
                current[key] = {};
            }
            current = current[key];
        }
    }

    return obj;
}

export function hasWordInsideParentheses(text: string, word: string): boolean {
    const regex = new RegExp(`\\(${word}\\)`);
    return regex.test(text);
}
export const duration = (time: number, lang?: string, untis: UnitName[] = ["y", "mo", "w", "d", "h", "m", "s"]) => humanizeDuration(time, { language: lang || config.defaultLanguage, round: true, units: untis }) || "0";
/**
 * Replaces characters at the start or end of a string with asterisks.
 *
 * @param str - The input string.
 * @param count - Number of characters to mask.
 * @param position - 'start' or 'end' to indicate which side to mask.
 * @returns The masked string.
 */
export function maskString(str: string, count: number, position: "start" | "end" = "end"): string {
    const mask = "*".repeat(Math.min(count, str.length));

    if (position === "start") {
        return mask + str.slice(count);
    } else {
        return str.slice(0, str.length - count) + mask;
    }
}
type Values = Record<string, any>;
type CustomFunctions = Record<string, (value: any, arg?: string, context?: any) => any>;

export function replaceKeysWithValues(
    data: any,
    values: Values,
    customFuncs: CustomFunctions = {}
): any {

    // Built-in text transformations
    const textTransforms: Record<string, (v: any, arg?: string) => any> = {
        upper: v => String(v).toUpperCase(),
        lower: v => String(v).toLowerCase(),
        capitalize: v => String(v).replace(/\b\w/g, c => c.toUpperCase()),
        truncate: (v, arg) => String(v).substring(0, arg ? parseInt(arg) : 10),
        date: (v, arg) => {
            if (!v) return '';
            const d = new Date(v);
            return arg ? d.toISOString().split("T")[0] : d.toISOString();
        },
        currency: (v, arg) => `${arg || '$'}${v}`,
        round: (v, arg) => Number(v).toFixed(arg ? parseInt(arg) : 0)
    };

    function getValue(path: string, obj: Values, context?: any): any {
        let separator = ", ";
        let wrapper = "";
        let defaultValue: any = "";
        let transform: string | undefined;
        let transformArg: string | undefined;
        let customFuncName: string | undefined;

        // Check for default value: {prop|default=Guest}
        const defaultMatch = path.match(/\|default=(.*)$/);
        if (defaultMatch) {
            defaultValue = defaultMatch[1];
            path = path.replace(/\|default=.*$/, '');
        }

        // Split by | for separator, wrapper, transform, custom function
        const parts = path.split("|").map(p => p.trim());
        path = parts[0];
        if (parts[1] && !parts[1].startsWith("default=")) separator = parts[1];
        if (parts[2]) wrapper = parts[2];
        if (parts[3]) {
            if (customFuncs[parts[3]]) customFuncName = parts[3];
            else {
                const [t, arg] = parts[3].split(":");
                transform = t;
                transformArg = arg;
            }
        }

        // Conditional placeholders {value?Yes:No}
        if (path.includes("?")) {
            const [cond, trueFalse] = path.split("?");
            const [trueVal, falseVal] = trueFalse.split(":");
            const condValue = getValue(cond, obj, context);
            return condValue ? trueVal : falseVal;
        }

        // Loop syntax products[*].name
        if (path.includes("[*]")) {
            const arrayPath = path.replace("[*]", "");
            const arr = getValue(arrayPath, obj, context);
            if (Array.isArray(arr)) {
                const property = path.split("[*].")[1];
                return arr
                    .map(item => {
                        let val = property ? item[property] : item;
                        // Apply transform
                        if (transform && textTransforms[transform]) {
                            val = textTransforms[transform](val, transformArg);
                        }
                        // Apply custom function
                        if (customFuncName && customFuncs[customFuncName]) {
                            val = customFuncs[customFuncName](val, transformArg, context);
                        }
                        return wrapper + val + wrapper;
                    })
                    .join(separator);
            }
            return defaultValue;
        }

        // Nested properties & array indices
        const keys = path.split(".");
        let current: any = obj;
        for (const key of keys) {
            const arrayMatch = key.match(/(\w+)\[(\d+)\]/);
            if (arrayMatch) {
                const [, arrName, index] = arrayMatch;
                current = current?.[arrName]?.[parseInt(index)];
            } else {
                current = current?.[key];
            }
            if (current === undefined) break;
        }

        if ((current === undefined || current === null) && defaultValue) {
            current = defaultValue;
        }

        if (transform && textTransforms[transform]) {
            current = textTransforms[transform](current, transformArg);
        }

        if (customFuncName && customFuncs[customFuncName]) {
            current = customFuncs[customFuncName](current, transformArg, context);
        }

        return current;
    }

    // Recursive object/array processing
    if (typeof data === "object" && data !== null) {
        if (Array.isArray(data)) {
            return data.map(item => replaceKeysWithValues(item, values, customFuncs));
        }

        const updatedObject: Record<string, any> = {};
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                if (key === "timestamp") {
                    updatedObject[key] = new Date().toISOString();
                } else {
                    updatedObject[key] = replaceKeysWithValues(data[key], values, customFuncs);
                }
            }
        }
        return updatedObject;
    }

    // Replace placeholders in strings
    if (typeof data === "string") {
        return data.replace(/{([^}]+)}/g, (match, key) => {
            // Escape braces
            if (match.startsWith("{{") && match.endsWith("}}")) return match.slice(1, -1);
            const result = getValue(key, values);
            return result !== undefined && result !== null ? result : match;
        });
    }

    return data;
}


export function generateRandomNumberWithDigits(digits: number = 4): number {
    if (digits < 1) throw new Error("Digits must be at least 1");

    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;

    return Math.floor(Math.random() * (max - min + 1)) + min;
}
export function findClosestIndexFolder(): string | null {
    if (indexFolder) {
        return indexFolder;
    }

    let dir = __dirname;

    while (true) {
        const tsPath = path.join(dir, "index.ts");
        const jsPath = path.join(dir, "index.js");

        if (fs.existsSync(tsPath) || fs.existsSync(jsPath)) {
            indexFolder = dir;
            return dir;
        }

        const parentDir = path.dirname(dir);
        if (parentDir === dir) {
            // Reached root, no index file found
            break;
        }

        dir = parentDir;
    }

    return null;
}


export const delay = async (ms: number): Promise<void> => { return new Promise(resolve => setTimeout(resolve, ms)); };
(Guild.prototype as any).getI18n = function () {
    return i18n.get(this.getLanguage());
};


export function disableComponents(components: any, defult?: String | String[]) {
    let componentsArray = components.map(d => {

        let x = d.components.map((c) => {
            c.data.disabled = true

            if (c.type === ComponentType.StringSelect && defult && c.data.options.find(d => defult.includes(d.value))) {
                c.data.options = c.data.options.map(o => ({ ...o, default: defult.includes(o.value) }));
            };
            return c;
        });
        return new ActionRowBuilder<any>().setComponents(x);
    })
    return componentsArray
}