import moment from "moment-timezone";
import { client, CustomClient } from "../index.js";
import { Quest } from "../interface/quest.js";
import { QuestConfig } from "../interface/questConfig.js";
import config from "../config.js";
import imageData from "../models/images.js";
import { extractFirstFrame } from "../utils/loadEmoji.js";
import axios from "axios";
import { AttachmentBuilder } from "discord.js";
import { getEmojiFromClient } from "./Message.js";


export interface SwitchQuestResult {
  questId: string;
  quest: Quest;
  model: QuestConfig | null;
  support: boolean;
  taskName: string | undefined;
  secondsNeeded: number;
  secondsDone: number;
  enrolled: boolean;
  completed?: boolean
}
export function getQuestProgressInforamtion(quest: Quest, customTaskName?: string): SwitchQuestResult {



  const support = client.questsConfig.find(o => o.filterKey(quest) !== undefined) || null;

  const taskName = customTaskName || config.quests.find(x => quest.config.task_config.tasks[x] != null)
  const secondsNeeded = quest.config?.task_config?.tasks[taskName]?.target;
  if(!secondsNeeded) return
  const secondsDone = quest.user_status?.progress?.[taskName]?.value ?? 0;
  const enrolled = quest?.user_status?.enrolled_at ? true : false;
  const completed = secondsDone >= secondsNeeded || quest?.user_status?.completed_at != null;


  return {
    questId: quest.id,
    quest: quest,
    model: support,
    support: support ? true : false,
    taskName: taskName,
    secondsNeeded: secondsNeeded,
    secondsDone: secondsDone,
    enrolled: enrolled,
    completed


  }

}
export function switchQuest(newQuestId, quests, customTaskName?: string): SwitchQuestResult {

  const quest: Quest = quests.find((q: Quest) => q.id === newQuestId);

  const support = client.questsConfig.find(o => o.filterKey(quest) === true) || null;


  const taskName = customTaskName || config.quests.find(x => quest.config.task_config.tasks[x] != null)
  const secondsNeeded = quest.config.task_config.tasks[taskName].target;
  const secondsDone = quest.user_status?.progress?.[taskName]?.value ?? 0;
  const enrolled = quest?.user_status?.enrolled_at ? true : false;
  const completed = secondsDone >= secondsNeeded || quest?.user_status?.completed_at != null;

  return {
    questId: newQuestId,
    quest: quest,
    model: support,
    support: support ? true : false,
    taskName: taskName,
    secondsNeeded: secondsNeeded,
    secondsDone: secondsDone,
    enrolled: enrolled,
    completed


  }

}
export function formatRewards(quest: Quest, client: CustomClient): string {
  const rewards = quest.config.rewards_config.rewards.map((reward) => {
    let rewardText = reward.messages.name;
    if(reward.type === 3 && [1,3].includes(reward.expiration_mode)) {
      rewardText += ` For ${moment(reward.expires_at).diff(moment(),"months")} months`;
      
    }
    if (reward.type === 3) {
      const emoji = getEmojiFromClient(client,"discord",true);
      rewardText += ` ${emoji || ""}`;
    }
    else if(reward.type === 5) {
      const emoji = getEmojiFromClient(client,"nitro_level_stone",true);
      rewardText += ` ${emoji || ""}`;

    }

    return rewardText;
  });

  return `- **${rewards.join("\n- ").trim()}**`;
}
export function formatProgress_2(quest: Quest, client: CustomClient): string {
  const tasks = Object.keys(quest.config.task_config.tasks).map((taskKey) => {
    const task = quest.config.task_config.tasks[taskKey];
    const target = task.target;
    const current = quest.user_status?.progress[taskKey]?.value || 0;


    const timeCurrent = target < 60 || current< 60 ? `${current}` : moment.duration(current, "seconds").minutes();
    const timeRequired = target < 60 || current< 60? `${target}` : moment.duration(target, "seconds").minutes();
    const timeFormat = target < 60 || current < 60 ? "seconds" : "minutes";

    const emoji = getEmoji(client, taskKey);
    const taskDescription = config.events.includes(taskKey)
      ? `${timeCurrent}/${timeRequired} ${timeFormat}`
      : task.title || task.description || `${current}/${target}`;





    return `-# ${emoji} ${taskDescription}`;
  });

  return `${tasks.join("\n").trim()}`;
}
const getEmoji = (client: CustomClient, emojiName: string): string => {
  const emoji = client.application.emojis.cache.find((e) => e.name.toLowerCase().trim() === emojiName.toLowerCase().trim())?.toString();

  return emoji && emoji.toString() || "";


}
export function formatTasks(quest: Quest, client: CustomClient): string {
  const tasks = Object.keys(quest.config.task_config.tasks).map((taskKey) => {
    const task = quest.config.task_config.tasks[taskKey];
    const target = task.target;
    const name = task.event_name;


    const formattedName = name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
    const requiredTime = target < 60 ? `${target} seconds` : moment.duration(target, "seconds").humanize(true);

    const taskDescription = config.events.includes(
      taskKey
    )
      ? `For ${requiredTime.replace("in ","").trim()}`
      : task.title || task.description || `${target}`;


    const emoji = client.application.emojis.cache.find((e) => e.name.toLowerCase().trim() === taskKey.toLowerCase().trim())?.toString();

    return `- ${formattedName} ${taskDescription} ${emoji || ""}`;
  });

  return `**${tasks.join("\n")}**`;
}
export function getQuestImage(questID: string, imageName: string,round:boolean): string {
  const imageConfigUrl = config.rewardImages[imageName];
  if(imageConfigUrl) return imageConfigUrl
  
  const url = `https://cdn.discordapp.com/quests/${questID}/${imageName}`;

  if (config.videoFormats.find(e => url.toLowerCase().endsWith(url.toLowerCase().trim()))) {
    const imageUrl = checkCacheForImage(questID, imageName,round);
    return imageUrl || url;
  }
  else return url
}
function checkCacheForImage(questID: string, imageName: string,round:boolean) {
  const imageKey = `${questID}-${imageName.split(".")[0]}`;
  let questImage = client.images.get(imageKey);
  const isExpired = questImage && decodeTimestampFromUrl(questImage.link) < Date.now();
  if (!questImage || isExpired) {
    getUrlFromDatabase(questID, imageName,round);
    return null
  }
  else return questImage?.link;

}




export async function getUrlFromDatabase(questID: string, imageName: string,round:boolean) {

  const imageKey = `${questID}-${imageName.split(".")[0]}`;
  let questImage = client.images.get(imageKey);
  const isExpired = questImage && decodeTimestampFromUrl(questImage.link) < Date.now();

  if (!questImage || isExpired) {
    if (isExpired) {
      const newUrl = await config.WebhookUrl.fetchMessage(questImage.messageID);
      const newImage = newUrl?.attachments?.find(e => e.url);

      if (newImage) {
        // @ts-ignore
        await imageData.findByIdAndUpdate(questImage.id, { $set: { link: newImage.url } });
        client.images.set(imageKey, { ...questImage, link: newImage.url });
        return newImage.url;
      }
    }
    const url = `https://cdn.discordapp.com/quests/${questID}/${imageName}`;
    const response = await axios.get(url, { responseType: "arraybuffer" }).catch((err) => null);
    if (!response) return null;



    const buffer = await extractFirstFrame(response?.data, 512,round,).catch((err) => null);
    if (!buffer) return null;
    const attachment = new AttachmentBuilder(buffer).setName(`${imageName.split(".")[0]}.png`);
    const newMessage = await config.WebhookUrl.send({ files: [attachment] });
    const uploadedImage = newMessage?.attachments?.find(e => e.url);

    if (uploadedImage) {
      const newImageData = await imageData.create({ questID, imageName, link: uploadedImage.url, messageID: newMessage.id });
      client.images.set(imageKey, newImageData);
      return uploadedImage.url;
    }
  }
  return questImage?.link || null;
}
export function decodeTimestampFromUrl(url) {
  const urlParams = new URLSearchParams(new URL(url).search);
  const hexTimestamp = urlParams.get('ex');

  if (hexTimestamp) {
    const timestamp = parseInt(hexTimestamp, 16);  // Convert hex to decimal
    return new Date(timestamp * 1000).getTime();;  // Convert to milliseconds (JavaScript uses ms)
  }

  return null;
}