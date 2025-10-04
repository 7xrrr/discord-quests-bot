---

## 🧠 About the Bot

This Discord bot is designed to **automate quest completions** for users using their **account tokens**.
Users can trigger the process by running the command:

```
/badge
```

Once the quest is accepted manually by the user, the bot automatically performs the required actions on their behalf.

> ⚠️ **Important:**
> The bot **does not automatically accept quests** — users must accept them first.
> After acceptance, the `/badge` command will handle the rest automatically.

---

## ⚙️ Development & Configuration

All configuration files are located inside:

```
src/config
```

Whenever you modify any configuration file, you need to rebuild the project:

```bash
npm run build
```

After building, use the compiled files inside the `dist` folder to run the bot.

If you’re actively developing or testing, you can run the bot in development mode:

```bash
npm run dev
```

---
---

### 🧩 **config.ts**

This is the **main configuration file** that defines the bot’s core settings — such as the token, database, and default appearance.

```ts
export default {
    token: process.env.Token, // Loaded from .env
    embedColor: "#06c2fb",
    defaultLanguage: "en",
    debugMode: true,
    prefix: "!",
    developers: ["527826654660132890"],
    database: {
        type: SupportedDatabaseTypes.MongoDB,
        url: "mongodb://localhost:27017/badge2",
    },
};
```

**What it does:**

* Loads the **bot token** from `.env` (`token=your_token_here`) — can be changed manually in this file.
* Sets the **embed color**, **default language**, and **command prefix**.
* Defines **developer IDs** with extra permissions.
* Connects the bot to a **MongoDB database**.

---

### 😄 **emojis.ts**

Handles all **emoji configurations** for the bot — both custom Discord emojis and fallback Unicode ones.

```ts
const defaults = {
    discord: { name: "discord", alt: "💬" },
    quest: { name: "quest", alt: "🗺️" },
    "5": { name: "nitro_level_stone", alt: "💎" },
};
```

**What it does:**

* Each emoji has a `name` (custom Discord emoji) and an `alt` (fallback emoji).
* If a custom emoji isn’t found, the bot automatically uses the fallback.
* Keeps embeds and messages looking consistent across all servers.

---

### 🎯 **questsConfig.ts**

Controls all **quest-related settings** — like notifications, channels, rewards, and automation behavior.

```ts
export default {
    notification: {
        token: "--", // self account token (not bot)
        channel: "1414963290391707779",
        dm: { enabled: true, dmRoles: ["1405572212403994684"] },
    },
    bypassLimit: ["1423422187372544081"], // Bypass quest limits
    durationQuests: ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP"],
    image: { channelId: "1421221274721456242", guildId: "1399471603003428966" },
    voice: { channel: "1421938834651742270", role: "1405572212403994684" },
    proxyType: "http",
    buttons: [{ url: "https://youtu.be/eJoa4obHhng", emoji: "▶️" }],
};
```

**What it does:**

* Manages **quest notifications** and DM settings.
* Lists **quest types** that require duration tracking.
* Defines **channels** for uploads, voice quests, and completions.
* Configures **proxy** options and **bypass roles**.
* Adds **custom buttons, rewards, and invite messages**.


---

### 🎯 `questsConfig.ts`

This file defines **how the bot handles quests**, including notifications, limits, proxy settings, and custom visuals.
It’s one of the most important configuration files for controlling quest automation and behavior.

```ts
import { CustomClient } from "../core/customClient.js";

export default {
    notification: {
        token: "--", // The self account token used to send quest notifications (not the bot token)
        channel: "1414963290391707779", // Channel ID where quest notifications are sent
        role: "1405572212403994684", // Role to mention when a new quest is posted
        dm: {
            enabled: true, // Whether to send DMs about new quests
            dmRoles: ["1405572212403994684"], // Roles that should receive quest DMs
        },
    },

    // Roles that can bypass the bot's maximum concurrent quest limit (e.g. 15/15)
    // Members with these roles can still start quests even if the bot reached its cap
    bypassLimit: ["1423422187372544081"],

    // List of quest types that require tracking over time
    durationQuests: [
        "WATCH_VIDEO",
        "PLAY_ON_DESKTOP",
        "STREAM_ON_DESKTOP",
        "PLAY_ACTIVITY",
        "WATCH_VIDEO_ON_MOBILE",
        "PLAY_ON_XBOX",
        "PLAY_ON_PLAYSTATION",
    ],

    image: {
        channelId: "1421221274721456242", // Channel where the bot uploads quest-related images
        guildId: "1399471603003428966", // Server that contains the image upload channel
    },

    serverId: "1399471603003428966", // Main server where the bot operates
    completedQuestsChannel: "1414963290391707779", // Channel used to log completed quests

    voice: {
        channel: "1421938834651742270", // Voice channel used for voice-related quests
        role: "1405572212403994684", // Role required to access the voice quest channel
    },

    logStrings: [], // Custom strings for logging (optional)
    childProcessCount: 1, // Number of child processes the bot spawns for quest handling
    questsPerChildProcess: 15, // Number of quests handled per process

    useProxy: true, // Whether to use proxies for requests
    proxyType: "http", // Proxy type: "http", "socks5", or "socks4"

    buttons: [
        {
            url: "https://youtu.be/eJoa4obHhng", // Link to a tutorial or helpful guide
            emoji: (e: CustomClient) => e.getEmoji("youtube", false) ?? "▶️", // Emoji displayed on the button
        },
    ],

    customRewardsImage: {
        // Custom reward images mapped by reward ID
        "1298745361602449479": "https://i.ibb.co/rRNztwKq/reward.webp",
        "1287881739531976815": "https://i.ibb.co/vxTHNqsS/eff35518172b971fa47c521ca21c7576d3a245433a669a6765f63b744b7b733a.png",
    },

    customRewardsEmoji: {
        // Custom reward emojis mapped by reward ID
        "1287881739531976815": "orbIcon",
        "1298745361602449479": "nitro_level_stone",
    },

    inviteUrl: "https://discord.gg/kZHHmhKE", // Main invite link for the server

    joinMessage: `## انت مو داخل السيرفر
    - **عشان تستعمل البوت لازم تدخل السيرفر ب الحساب الي تبي تسوي فيه المهمة**
    - **ملاحظة البوت مجاني 100%**
    
    ## You are not in the server
    - **To use the bot, you need to join the server with the account you want to complete the task with.**
    - **Note: The bot is 100% free.**
    
    - ** https://discord.gg/39c2c3jVbN **`, // Message shown when the user is not in the server
};
```

---

### 🧾 Summary of Options

| Option                                            | Description                                                                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **`notification`**                                | Handles quest notifications via channel, role, and DM. Uses a self-account token (not the bot token).        |
| **`bypassLimit`**                                 | Array of **role IDs** that can bypass the bot’s max quest limit (e.g., 15/15). Ideal for staff or VIP roles. |
| **`durationQuests`**                              | Defines quest types that require activity tracking (like watching or playing for a certain duration).        |
| **`image`**                                       | Channels and server where quest images are uploaded.                                                         |
| **`serverId`**                                    | The main server ID the bot operates in.                                                                      |
| **`completedQuestsChannel`**                      | Channel for posting logs of completed quests.                                                                |
| **`voice`**                                       | Configuration for voice-based quests — required role and channel.                                            |
| **`childProcessCount` / `questsPerChildProcess`** | Controls performance and workload distribution across processes.                                             |
| **`useProxy` / `proxyType`**                      | Enables proxy support to protect requests or access restricted regions.                                      |
| **`buttons`**                                     | Adds custom buttons with emojis and tutorial links to embeds.                                                |
| **`customRewardsImage` / `customRewardsEmoji`**   | Allows custom visuals for specific reward IDs.                                                               |
| **`inviteUrl` / `joinMessage`**                   | Server join information shown to users not currently in the server.                                          |

---
؟

## 🎨 Screenshots

![image1](https://i.ibb.co/3JgHfFy/image.png)
![image2](https://i.ibb.co/HTn49GG/image.png)
![image3](https://i.ibb.co/chPF7zJ/image.png)
![image4](https://i.ibb.co/yFSZtRmk/image.png)
![image5](https://i.ibb.co/TqJZpqgT/image.png)
![image6](https://i.ibb.co/4g01Rc8/image.png)

---
