# Discord Quest Bot

## Overview
Discord Quest Bot is an automated system designed to help users complete various Discord tasks efficiently. The bot supports quests such as watching videos, playing on desktop, and streaming, providing users with an easy way to track and complete their tasks.

**Note:** The bot does *not* support PlayStation or Xbox quests.

## Setup Guide
### 1. Configure the Bot
Before running the bot, you need to edit the `config.ts` file and fill in the required options:

- **Bot Token**: Your bot's authentication token.
- **Self Account Token**: Any Discord account token that is in the bot's server, used for boost/Nitro badge calculation.
- **MongoDB Connection**: Database URL for storing quest data.
- **Allowed Guilds**: Specify which servers can use the bot.
- **Webhook URL**: Used to upload images of quests after converting them from video format to image.
- **Server Configuration**:
  - **Server ID**: The Discord server where play activity quests/streams happen.
  - **Voice Channel ID**: The voice channel used for play activity quests/streams.
  - **Role ID**: The role required to join the voice channel.
  - **Log Channel ID**: The log channel for bot activities.
  - **Join Message**:
    ```
    ## أنت لست داخل السيرفر
    - **للاستفادة من البوت، يجب أن تنضم إلى السيرفر بالحساب الذي تريد إكمال المهمة به.**
    - **ملاحظة: البوت مجاني 100%.**

    ## You are not in the server
    - **To use the bot, you need to join the server with the account you want to complete the task with.**
    - **Note: The bot is 100% free.**

    - ** https://discord.gg/39c2c3jVbN **
    ```

Ensure all required fields are properly filled before starting the bot.

### 2. Accepting Quests Manually (Mobile Only)
To use the bot, you must manually accept the quests on Discord using your mobile device. Since mobile browsers may not support this properly, use the **Via Browser** to accept the quests:

1. Download **Via Browser**.
2. Log in with your Discord account.
3. Enable **Request Desktop Site** in browser settings.
4. Open the **Discord website** and navigate to the quest section.

### 3. Using the Bot
Once you've accepted a quest, follow these steps to start:

1. Retrieve a **Discord account token** from an account that is in the bot's server.
2. Use the command `/badge`.
3. Select a quest from the available options.
4. Press **Start** to begin the quest.

The bot will track your progress and update accordingly.

## Important Notes
- The bot does *not* support PlayStation or Xbox quests.
- Quest acceptance must be done manually using **Via Browser** on mobile devices.
- Ensure your configuration is correctly set up before running the bot.
- The code is not perfect or 100% professional, and improvements may be needed.
- There may be updates in the future to enhance functionality and fix issues.

For any issues or further assistance, feel free to reach out to the support team.

## Support & Demo Server
You can test the bot and get support in our official server: [Join Here](https://discord.gg/4WStuuHj39)

---

## 🎨 Screenshots

![image1](https://i.ibb.co/3JgHfFy/image.png)
![image2](https://i.ibb.co/HTn49GG/image.png)
![image3](https://i.ibb.co/chPF7zJ/image.png)
![image4](https://i.ibb.co/yFSZtRmk/image.png)
![image5](https://i.ibb.co/TqJZpqgT/image.png)
![image6](https://i.ibb.co/4g01Rc8/image.png)

---
