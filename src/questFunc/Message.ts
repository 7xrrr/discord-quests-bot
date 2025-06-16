import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } from "discord.js";
import { formatProgress_2, formatRewards, formatTasks, getQuestImage, getUrlFromDatabase, SwitchQuestResult } from "./switchQuests.js";
import { Quest } from "../interface/quest.js";
import { formatDiscordTimestamp } from "../utils/tools.js";
import moment from "moment-timezone";
import { client, CustomClient } from "../index.js";
import { createEmojiFromUrl } from "../utils/loadEmoji.js";
import config from "../config.js";

export function genreate_message(quest: SwitchQuestResult, quests: Quest[], started?: boolean, logsEmbed?: {
  enabled?: boolean,

  logs?: string,
  completed?: boolean
}): any {


  const button = generateButton(quest, started || false);
  const files = [];




  const tasks = formatTasks(quest.quest, client);
  const rewards = formatRewards(quest.quest, client);
  const progress = formatProgress_2(quest.quest, client);
  const round = quest.quest.config.rewards_config.rewards.find(e => [3].includes(e.type)) ? true : false;

  const enrolled = quest?.quest?.user_status?.enrolled_at;
  const expiresAt = quest?.quest?.config?.expires_at;



  const embed = new EmbedBuilder()
    .addFields(
      {
        name: `Game Name:`,
        value: `**${quest.quest.config.messages.game_title}**`,
        inline: true
      },
      {
        name: `Publisher:`,
        value: `**${quest.quest.config.messages.game_publisher}**`,
        inline: true
      },
      {
        name: `Quest Name:`,
        value: `**${quest.quest.config.messages.quest_name}**`,
        inline: true
      },
      {
        name: `Enrolled At:`,
        value: `${enrolled ? formatDiscordTimestamp(new Date(enrolled).getTime(), "Date") : "-"}`,
        inline: true
      },
      {
        name: `Expires At:`,
        value: `${expiresAt ? formatDiscordTimestamp(new Date(expiresAt).getTime(), "Date") : "-"}`,
        inline: true
      },
      {
        name: `Progress:`,
        value: `${progress}`,
        inline: true
      },)

    .setColor(`#${quest.quest.config.colors.primary.replace("#", "")}`)
    .setImage(getQuestImage(quest.questId, quest?.quest?.config?.assets?.hero, round))
    .setThumbnail(getQuestImage(quest.questId, quest?.quest?.config.rewards_config.rewards.find(d => d.asset)?.asset, round))
    .setTimestamp(moment(quest.quest.config.starts_at).toDate())
    .setFooter({ text: quest.quest.config.application.name, iconURL: getQuestImage(quest.questId, quest?.quest?.config?.assets?.logotype, false) })
    .setDescription(`## Rewards: \n${rewards}\n\n## Tasks:\n${tasks}`);


  const questsEmoji = quests.reduce((acc, quest) => {
    const emoji = getRewardEmoji(quest);
    acc[quest.id] = emoji;
    return acc;
  }, {} as Record<string, string>);
  const menu = new StringSelectMenuBuilder()
    .setCustomId("switchQuests")
    .setPlaceholder("Select a quest")
    .setMaxValues(1)
    .setMinValues(1)
    .setDisabled(false)

    .addOptions(quests.map((q) => ({
      label: q.config.messages.quest_name,
      value: q.id,
      default: q.id === quest.questId,
      description: q.config.rewards_config.rewards.map(d => `${d.messages.name} ${config.rewardTypes[d.type] ? `(${config.rewardTypes[d.type]})` : ""}`).join(",").trim().slice(0, 99),
      emoji: questsEmoji[q.id] || undefined
    }))
    )



  let embeds = [embed];
  if (logsEmbed?.enabled) {

    let logEmbed = new EmbedBuilder().setTitle("Logs:").setDescription(`\`\`\`prolog\n======================================================\n${ConsoleString(logsEmbed?.logs)}\`\`\``).setColor(embed.data.color);
    embeds.push(logEmbed);

  }
  if (logsEmbed && logsEmbed?.completed) {
    let password = new EmbedBuilder().setColor(embed.data.color).setDescription(`## Please remember to change your account password.\n\n## يرجى  تغيير كلمة المرور الخاصة بحسابك.`)
    embeds.push(password);
  };
  const refreshButton = new ButtonBuilder()
    .setCustomId("refresh").setEmoji("🔄").setStyle(ButtonStyle.Secondary).setDisabled(started === true);
  const buttonsRow = new ActionRowBuilder<any>().setComponents(button).addComponents(refreshButton);

  if (config.withButtons.active && config.withButtons.buttons.length > 0) {
    for (let index = 0; index < config.withButtons.buttons.length; index++) {
      const button = config.withButtons.buttons[index];
      let emoji = button?.emoji;
      if (emoji && typeof (emoji) == "function") {
        // @ts-ignore
        emoji = emoji(client);
      }
      const buttonBuilder = new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
      if (button.text) buttonBuilder.setLabel(button.text);
      if (button.url) buttonBuilder.setURL(button.url);
      if (emoji) buttonBuilder.setEmoji(`${emoji}`);
      buttonsRow.addComponents(buttonBuilder);
    }

  }

  return { files, embeds: embeds, components: [new ActionRowBuilder<any>().setComponents(menu), buttonsRow] };


}
const isVideo = (url: string) => {
  const videoFormats = config.videoFormats;
  return videoFormats.some((format) => url.endsWith(format));
}
export async function notification_message(quest: Quest): Promise<any> {



  const files = [];
  const tasks = formatTasks(quest, client);
  const rewards = formatRewards(quest, client);
  const created = quest?.config.starts_at;
  const expiresAt = quest?.config?.expires_at;
  const roundCurrent = quest.config.rewards_config.rewards.find(e => [3].includes(e.type)) ? true : false;


  const embed = new EmbedBuilder()
    .setTitle("New Quest")
    .addFields(
      {
        name: `Game Name:`,
        value: `**${quest.config.messages.game_title}**`,
        inline: true
      },
      {
        name: `Quest Name:`,
        value: `**${quest.config.messages.quest_name}**`,
        inline: true
      },
      {
        name: `Starts At:`,
        value: `${formatDiscordTimestamp(new Date(created).getTime(), "Date")} (${formatDiscordTimestamp(new Date(created).getTime(), "R")})`,
        inline: false
      },

      {
        name: `Expires At:`,
        value: `${expiresAt ? `${formatDiscordTimestamp(new Date(expiresAt).getTime(), "Date")} (${formatDiscordTimestamp(new Date(expiresAt).getTime(), "R")})` : "-"}`,
        inline: false
      },
    ).setColor(`#${quest.config.colors.primary.replace("#", "")}`)


    .setTimestamp(moment(quest.config.starts_at).toDate())
    .setFooter({ text: quest.config.application.name, iconURL: getQuestImage(quest.id, quest?.config?.assets?.logotype, false) })
    .setDescription(`## Rewards: \n${rewards}\n\n## Tasks:\n${tasks}`);

  const imageConfigUrl = quest?.config?.assets?.hero ? config.rewardImages[quest?.config?.assets?.hero] : null;
  const image = imageConfigUrl ? imageConfigUrl : `https://cdn.discordapp.com/quests/${quest.id}/${quest?.config?.assets?.hero}`;

  const thumbnail = isVideo(`${quest?.config.rewards_config.rewards.find(d => d.asset)?.asset}`) ? await getUrlFromDatabase(quest.id, `${quest?.config.rewards_config.rewards.find(d => d.asset)?.asset}`, roundCurrent).catch((err) => null) : `https://cdn.discordapp.com/quests/${quest.id}/${quest?.config.rewards_config.rewards.find(d => d.asset)?.asset}`;







  if (thumbnail) {
    const attachment = new AttachmentBuilder(thumbnail).setName(`thumbnail.png`);
    embed.setThumbnail(`attachment://${attachment.name}`)
    files.push(attachment);
  };
  if (image) {
    const attachment = new AttachmentBuilder(image).setName(`image.png`);
    embed.setImage(`attachment://${attachment.name}`)
    files.push(attachment);
  }



  let embeds = [embed];




  return { embeds: embeds, files };


}
function getRewardEmoji(quest: Quest) {
  let emojiName = "";
  let reward = quest?.config?.rewards_config?.rewards[0];
  const roundImage = [3].includes(reward.type);
  if (reward.type === 5) {
    emojiName = "nitro_level_stone";
  }

  else {


    if (reward) {
      emojiName = `${quest.id}_reward`;
    }


    if (!emojiName || emojiName?.trim()?.length === 0) emojiName = "quest";
  }


  const emoji = client.application.emojis.cache.find((e) => e.name.toLowerCase().trim() === emojiName.toLowerCase().trim())?.toString();
  if (!emoji && reward) {
    const emojiUrl = `https://cdn.discordapp.com/quests/${quest?.id}/${reward?.asset}`;
    createEmojiFromUrl(client, emojiUrl, emojiName, roundImage, roundImage);
  }
  return emoji || getEmojiFromClient(client, "quest", true);
}
function ConsoleString(inputString: string): string {
  let lines: string[] = inputString.split('\n').filter(d => d.trim().length > 0);
  lines = lines.map((line: string, i) => `[${i + 1}] ${line}`.trim());

  const maxLines: number = 15;
  if (lines.length > maxLines) {
    lines = lines.slice(lines.length - maxLines);
  }
  let output: string = config.logString + "\n";
  lines.map(d => output += `${d}\n`);
  return output;
}



export const getEmojiFromClient = (client: CustomClient, emojiName, returnBlank: boolean) => {
  const emoji = client.application.emojis.cache.find(
    (e) => e.name.toLowerCase().trim() === emojiName.toLowerCase().trim()
  );
  return emoji ? emoji.toString() : returnBlank ? "" : null
};




function generateButton(quest: SwitchQuestResult, started?: boolean): ButtonBuilder {
  const { enrolled, support: supported, completed } = quest;
  let customId: string;
  let label: string;
  let emoji: string;
  let style: ButtonStyle;
  let disabled = !enrolled || !supported;

  if (completed) {
    customId = "completed";
    label = "Completed";
    emoji = getEmojiFromClient(client, "completed", false) || "✅";
    style = ButtonStyle.Secondary;
    disabled = true;
  }
  else if(!supported) {
    customId = "notsupported";
    label = "Not Supported";
    emoji = getEmojiFromClient(client, "notsupported", false) || "❌";
    style = ButtonStyle.Secondary;
    disabled = true;
  }
  else if (enrolled) {
      if (started) {
        customId = "stop";
        label = "Stop";
        emoji = getEmojiFromClient(client, "stop", false) || "⏹️";
        style = ButtonStyle.Secondary;
      } else {
        customId = "start";
        label = "Start";
        emoji = getEmojiFromClient(client, "start", false) || "▶️";
        style = ButtonStyle.Secondary;
      }
  } else if(!enrolled && supported) {
    customId = "enroll";
    label = "Enroll";
    emoji = getEmojiFromClient(client, "enroll", false) || "➕";
    style = ButtonStyle.Secondary;
  }

  return new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setEmoji(emoji)
    .setStyle(style)
    .setDisabled(disabled);
}
