import { WebhookClient } from "discord.js";
import ms from "ms";

export default {
    // Bot configuration
    token: "", // Discord Bot Token (move to .env in production)
    prefix: "-", // Bot prefix (currently unused)

    // MongoDB connection URI
    mongoDB: "mongodb://127.0.0.1:27017/badge", // Replace with .env for production

    // Custom reward images by type key
    rewardImages: {
        "1298745361602449479": "https://i.ibb.co/rRNztwKq/reward.webp",
        "1287881739531976815": "https://i.ibb.co/vxTHNqsS/eff35518172b971fa47c521ca21c7576d3a245433a669a6765f63b744b7b733a.png"

    },
    // Custom emojis by ID
    customEmojis: {
        "1287881739531976815": "orbIcon",
        "1298745361602449479": "nitro_level_stone"

    },
    // Reward types with their IDs and names
    rewardTypes: {
        5: "Nitro",
        3: "Discord Decorations",
        4: "Discord Orb",
    },
    // Guilds allowed to use the bot
    whiteListedGuildes: ["947363468414160916"],

    // Self account token (used for additional Discord API actions; keep private)
    selfAccountToken: "",

    // Available quest types
    quests: [
        "WATCH_VIDEO",
        "PLAY_ON_DESKTOP",
        "STREAM_ON_DESKTOP",
        "PLAY_ACTIVITY",
        "WATCH_VIDEO_ON_MOBILE"
    ],

    // Event types tracked by the bot
    events: [
        "STREAM_ON_DESKTOP",
        "PLAY_ON_DESKTOP",
        "PLAY_ON_PLAYSTATION",
        "PLAY_ON_XBOX",
        "WATCH_VIDEO",
        "WATCH_VIDEO_ON_MOBILE"
    ],

    // Max number of quests a user can take simultaneously
    questsLimit: 15,

    // Minimum duration required to complete a quest
    minQuestTime: ms("30m"),

    // Initial log string on bot start or quest start
    logString: "Developed by 7xr For Euiz Server",

    // Notification settings (e.g. for role pings or logs)
    notification: {
        sendDm: true, // Send DM to users on quest notifications
        serverid: "947363468414160916", // Server for notifications
        channelid: "1343257911870230538", // Notification channel ID
        role: "1343547598543519774" // Role to mention
    },

    // Server-specific settings related to quest interaction
    server: {
        serverid: "947363468414160916", // Main server ID
        channelid: "1235946958611284069", // Voice channel ID required
        roleId: "1279032632859951185", // Role needed to participate
        logChannel: "1247620593914740908", // Channel for internal logs

        // Message shown when a user isn't in the server
        joinMessage: `## انت مو داخل السيرفر
- **عشان تستعمل البوت لازم تدخل السيرفر ب الحساب الي تبي تسوي فيه المهمة**
- **ملاحظة البوت مجاني 100%**

## You are not in the server
- **To use the bot, you need to join the server with the account you want to complete the task with.**
- **Note: The bot is 100% free.**

- ** https://discord.gg/39c2c3jVbN **`
    },

    // Webhook used for image uploads/logs (move to .env)
    WebhookUrl: new WebhookClient({
        url: process.env.WEBHOOK_URL || "" // Secure in environment variable
    }),

    // Developer-only access mode
    debugMode: false,

    // Accepted video formats for video quests
    videoFormats: [".mp4", ".mov", ".avi", ".mkv", ".webm"],

    // Developer IDs with full access to bot
    devlopers: [
        "622486784038666242", // Main dev
        "527826654660132890"  // Co-dev/support
    ],

    // Button section shown in bot embeds
    withButtons: {
        active: true,
        buttons: [
            {
                url: "https://youtu.be/eJoa4obHhng", // Tutorial or guide
                emoji: "📺",
                text: "How To Use"
            }
        ]
    },
};
