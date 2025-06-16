import { Client } from "discord.js-selfbot-v13";
import { Quest } from "../interface/quest.js";
import { QuestConfig } from "../interface/questConfig.js";
import { AxiosInstance } from "axios";
import { ChildProcess } from "child_process";
import { QuestSolver } from "../class/questSolver.js";
import ms from "ms";
import { delay } from "../utils/tools.js";
import { getQuestProgressInforamtion } from "../questFunc/switchQuests.js";
export default {
    name: "STREAM_ON_DESKTOP",
    filterKey: (quest: Quest) => {
        return ["STREAM_ON_DESKTOP"].some(x => quest?.config?.task_config?.tasks[x] != null) ? true : false;
    },
    config: (quest: Quest) => ({
        quest_name: quest.config?.messages?.quest_name,
        game: quest?.config?.messages?.game_title,
        game_id: quest?.config.application.id,
        game_name: quest?.config.application.name,

    }),

    requireStream: true,
    requireLogin: true,
    requireVoiceChannel: true,
    run: async (client: Client, axios: AxiosInstance, quest: Quest, QuestSolver: QuestSolver, childProcess: ChildProcess) => {
        const taskName = "STREAM_ON_DESKTOP";
        const stream_key = QuestSolver.status["streamCreated"]?.streamKey;
        if (!stream_key) {
            QuestSolver.stop("Stream key not found");
        };

        const secondsNeeded = QuestSolver.questConfig.secondsNeeded;
        let progress = getQuestProgressInforamtion(quest, taskName)?.secondsDone || 0;
        let stoped = false;
        QuestSolver.on("stop", () => {
            stoped = true;
        })
        while (!stoped) {
            const heartbeat = await axios.post(`/quests/${quest.id}/heartbeat`,  {stream_key: stream_key, terminal: false}).catch((err) => err.response);
        
            if(heartbeat?.data?.code === 10049) {
              QuestSolver.stop(`Remember that you need at least 1 other person to be in the vc!`);
              break;
            }
            if (!heartbeat?.data?.user_id) {
                QuestSolver.stop("Error sending heartbeat");
                console.log(heartbeat);
                break;
            }

            const response = heartbeat?.data;
            progress = quest.config.config_version === 1 ? response.stream_progress_seconds : Math.floor(response.progress[`${taskName}`].value);
            QuestSolver.emit("progress", { progress, target: secondsNeeded, task: taskName, response: response });
            if (progress >= secondsNeeded || response?.progress[`${taskName}`]?.completed_at != null) {
                QuestSolver.stop("Quest completed");
                break;
            };
            await delay(ms("30s"));
        }


    }

} as QuestConfig