import moment from "moment-timezone";
import { ChildUser } from "../childProcess/childUser.js";
import { QuestConfig } from "../lib/questConfig.js";
import ms from "ms";


export default new QuestConfig({
    name: "WATCH_VIDEO_ON_MOBILE",


    async run(user: ChildUser) {
        const taskName = "WATCH_VIDEO";
        const secondsNeeded = user.target;
        let progress = user.current || 0;
        const startDate = moment().unix() - progress;

        while (!user.stoped) {
            const heartbeat = await user.api
                .post(`/quests/${user.quest}/video-progress`, {
                    timestamp: moment().unix() - startDate,
                })
                .catch((err) => err.response);

            if (!heartbeat?.data?.user_id) {
                user.stop("Error sending heartbeat");
                break;
            }
            const response = user.extractProgress(heartbeat.data);


            user.sendUpdate(progress, response.completed === true);

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

            await user.delay(ms("5s"));
        }
    },
});
