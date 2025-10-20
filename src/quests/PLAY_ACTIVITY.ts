import { ChildUser } from "../childProcess/childUser.js";
import questsConfig from "../config/questsConfig.js";
import { QuestConfig } from "../lib/questConfig.js";
import ms from "ms";


export default new QuestConfig({
    name: "PLAY_ACTIVITY",
    requireLogin: false,
    requireVoiceChannel: false,
    async run(user: ChildUser) {

        const secondsNeeded = user.target;
        let progress = user.current || 0;
        const streamKey = `call:${user.id}:1`
        while (!user.stoped) {
            const heartbeat = await user.api
                .post(`quests/${user.quest}/heartbeat`, {
                    stream_key: streamKey,
                    terminal: false
                }).catch((err) => err.response);
                console.log(heartbeat?.data)
            if (!heartbeat?.data?.user_id) {
                user.stop("Error sending heartbeat");
                break;
            }
        

            const response = user.extractProgress(heartbeat.data);

            progress = response.value
            user.sendUpdate(progress, response.completed === true);

            if (
                progress >= secondsNeeded ||
                response?.completed === true
            ) {
                user.stop();
                user.completed = true;
                break;
            }

            await user.delay(ms("30s"));
        }

    },
});

