import { Client } from "discord.js-selfbot-v13";
import { Quest } from "../interface/quest.js";
import { QuestConfig } from "../interface/questConfig.js";
import { AxiosInstance } from "axios";
import { QuestSolver } from "../class/questSolver.js";
import ms from "ms";
import { delay } from "../utils/tools.js";
import { getQuestProgressInforamtion } from "../questFunc/switchQuests.js";
export default {
    name: "WATCH_VIDEO_ON_MOBILE",

    filterKey: (quest: Quest) => {
        return ["WATCH_VIDEO_ON_MOBILE"].some(x => quest?.config?.task_config?.tasks[x] != null) ? true : false;
    },

    config: (quest: Quest) => ({
        quest_name: quest.config?.messages?.quest_name,
        game: quest?.config?.messages?.game_title,
        game_id: quest?.config.application.id,
        game_name: quest?.config.application.name,

    }),

    requireStream: false,
    requireLogin: false,
    requireVoiceChannel: false,
    run: async (client: Client, axios: AxiosInstance, quest: Quest, QuestSolver: QuestSolver) => {
        const taskName = "WATCH_VIDEO_ON_MOBILE"
        const secondsNeeded = QuestSolver.questConfig.secondsNeeded;
        let progress = getQuestProgressInforamtion(quest, taskName)?.secondsDone || 0;
        let stoped = false;
        const startDate = (Date.now() - (progress * 1000)) / 1000;
        QuestSolver.on("stop", () => {
            stoped = true;

        })
        while (!stoped) {
            const heartbeat = await axios.post(`quests/${quest.id}/video-progress`, {
                timestamp: Math.floor(Date.now() / 1000) - startDate,
            }).catch((err) => err.response);
            if (!heartbeat?.data?.user_id) {
                QuestSolver.stop("Error sending heartbeat");
                console.log(heartbeat);
                break;
            }
            const response = heartbeat?.data;
            progress = Math.floor(response?.progress[`${taskName}`]?.value || 0);
            QuestSolver.emit("progress", { progress, target: secondsNeeded, task: taskName, response: response });
            if (progress >= secondsNeeded || response?.progress[`${taskName}`]?.completed_at != null) {
                QuestSolver.stop("Quest completed");
                break;
            };
            await delay(ms("5s"));
        }


    }

} as QuestConfig