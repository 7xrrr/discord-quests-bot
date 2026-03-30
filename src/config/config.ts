import { SupportedDatabaseTypes } from "../core/databaseConfig.js";
import { config as dotenvConfig } from "dotenv";
import { Config } from "../interface/config.js";

dotenvConfig();

export default {
    // Discord Bot Token
    token: process.env.TOKEN || "",

    // شكل الإيمبد
    embedColor: "#06c2fb",

    // اللغة الافتراضية
    defaultLanguage: process.env.LANG || "en",

    // وضع الديبق
    debugMode: true,

    // البرفكس
    prefix: process.env.PREFIX || "!",

    // المطورين
    developers: ["1408893736192180268"],

    // قاعدة البيانات
    database: {
        type: SupportedDatabaseTypes.MongoDB,
        url: process.env.MONGO_URI || "mongodb://mongo:AkofLnGOYNkivehfGXEaDsNsXEvHXiAv@mongodb.railway.internal:27017",
    },
} as Config;
