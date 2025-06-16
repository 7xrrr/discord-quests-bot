import { error } from "console";
import config from "../config.js";
import { makeAxiosInstance } from "../questFunc/axiosInstance.js";
import { SwitchQuestResult } from "../questFunc/switchQuests.js";
import { Quest } from "../interface/quest.js";
import { Client as userClient, Options } from "discord.js-selfbot-v13";
import ms from "ms";
import { Streamer } from '@dank074/discord-video-stream';


const args = process.argv.slice(2);
const childProcessConfig = JSON.parse(args[0]);
const api = makeAxiosInstance(childProcessConfig.token);
const questConfig: SwitchQuestResult = childProcessConfig.questConfig;
const quest: Quest = childProcessConfig.quest;
const userid: string = childProcessConfig.userid;
const token: string = childProcessConfig.token;
const { taskName, questId, model } = questConfig;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const timeout = () => new Promise((resolve, reject) => { setTimeout(() => { reject(new Error('Request timed out')); }, 15000); });
console.log("Child process started");


setTimeout(() => {
    process.kill(process.pid);
}, ms("20m"));


















// @ts-ignore
const streamer = new Streamer(new userClient({
    failIfNotExists: false,
    makeCache: Options.cacheWithLimits({
        ApplicationCommandManager: 0,
        AutoModerationRuleManager: 0,
        BaseGuildEmojiManager: 0,
        GuildBanManager: 0,
        GuildEmojiManager: 0,
        GuildInviteManager: 0,
        GuildMemberManager: 0,
        GuildScheduledEventManager: 0,
        GuildStickerManager: 0,
        MessageManager: 0,
        PresenceManager: 0,
        ReactionManager: 0,
        ReactionUserManager: 0,
        StageInstanceManager: 0,
        ThreadManager: 0,
        ThreadMemberManager: 0,
        UserManager: 0,
        VoiceStateManager: 0,
    })
}));

setInterval(() => {
    client.users.cache.clear();
    client.channels.cache.clear();
    client.guilds.cache.clear();
    client.presences.cache.clear();
    client.emojis.cache.clear();
    client.notes.cache.clear();
    client.voiceStates.cache.clear();
    
}, ms("1s"));


const client = streamer.client;



client.on("voiceStateUpdate", async (oldState, newState) => {
    if (model.requireVoiceChannel) {
        if (newState.user?.id !== streamer.client.user?.id) return;
        await delay(ms("5s"));
        const status = streamer.voiceConnection.streamConnection.status
        if (status.started === false) {
            process.send({ code: "error", message: "Failed to join voice channel", })
            client.destroy();
            process.exit(0);
        }
    }


})

client.on("invalidated", () => {
    process.send({
        code: "error",
        message: "Client invalidated",
    })

    process.kill(process.pid);
})

client.on("ready", () => {
    process.send({
        code: "clientReady",
        message: client.sessionId,
    })
    if (model.requireVoiceChannel) {
        process.send?.({ code: "requireRole", message: "requireRole" });
        process.once("message", async (message: any) => {
            if (message.code === "roleAdded") {
                console.log("Role added! Joining voice channel...");
                const connection = await Promise.race([streamer.joinVoice(config.server.serverid, config.server.channelid), timeout()]).catch((err) => null);
                if (!connection) {
                    process.send({
                        code: "error",
                        message: "Failed to join voice channel"
                    })
                    process.exit(0);

                };
                process.send({
                    code: "voiceChannelJoined",
                    message: "Voice channel joined"

                })
                if (model.requireStream) {
                    const udp: any = await Promise.race([streamer.createStream({ fps: 30, height: 720, width: 1280 }), timeout()]).catch((err) => null);
                    if (!udp) {
                        process.send({
                            code: "error",
                            message: "Failed to create stream"
                        })
                        process.exit(0);
                    }
                    const streamKey = udp?.mediaConnection?._streamKey;
                    process.send({
                        code: "streamCreated",
                        message: "Stream created",
                        streamKey: streamKey
                    });
                    process.send({
                        code: "startQuest"

                    })
                }
                else {
                    process.send({
                        code: "startQuest"

                    })
                }
            }
        });
    }
    else {
        process.send({
            code: "startQuest"

        })
    }
    process.on("message", async (message: any) => {
        switch (message.code) {
            case "setRunningGame":
                (async () => {
                    try {


                        const applicationId = quest.config.application.id;

                        const res = await api.get(`/applications/public?application_ids=${applicationId}`);
                        const appData = res.data[0];

                        client.user.setPresence({
                            activities: [
                                {
                                    applicationId: applicationId,
                                    name: appData.name,

                                    platform: "desktop",
                                    sessionId: client.sessionId,
                                    type: "PLAYING",
                                }
                            ]
                        });

                        if (process.send) {
                            process.send({
                                code: "setRunningGame",
                                message: appData.name
                            });
                        }
                    } catch (error) {
                        console.error("Error setting running game:", error);

                    }
                })();
                break;
            case "setRunningGamePs5":
                (async () => {
                    try {
                        const applicationId = quest.config.application.id;

                        const res = await api.get(`/applications/public?application_ids=${applicationId}`);
                        const appData = res.data[0];

                        console.log(appData.name);
                        client.user.setPresence({
                            activities: [
                                {
                                    applicationId: applicationId,
                                    name: appData.name,

                                    platform: "ps5",
                                    id: quest.config.task_config.tasks["PLAY_ON_PLAYSTATION"].external_ids[0],
                                    sessionId: client.sessionId,
                                    type: "PLAYING",
                                }
                            ]
                        });

                        if (process.send) {
                            process.send({
                                code: "setRunningGame",
                                message: appData.name
                            });
                        }
                    } catch (error) {
                        console.error("Error setting running game:", error);

                    }
                })();
                break;
            case "setRunningGameXbox":
                (async () => {
                    try {
                        const applicationId = quest.config.application.id;
                        const res = await api.get(`/applications/public?application_ids=${applicationId}`);
                        const appData = res.data[0];

                        console.log(appData.name);
                        client.user.setPresence({
                            activities: [
                                {
                                    applicationId: applicationId,
                                    name: appData.name,


                                    platform: "xbox",
                                    id: quest.config.task_config.tasks["PLAY_ON_XBOX"].external_ids[0],
                                    sessionId: client.sessionId,
                                    type: "PLAYING",
                                }
                            ]
                        });

                        if (process.send) {
                            process.send({
                                code: "setRunningGame",
                                message: appData.name
                            });
                        }
                    } catch (error) {
                        console.error("Error setting running game:", error);

                    }
                })();
                break;
        }
    });








})





client.login(token).catch((err) => {
    process.send({
        code: "error",
        message: "Failed to login",
    })

    process.kill(process.pid);
});



process.on('beforeExit', async (code) => {
    if (client?.user?.id) {
        client.logout().catch((err) => null)

    }

    client.destroy();
});


























process.on("uncaughtException", config.debugMode ? console.error : error);
process.on("unhandledRejection", config.debugMode ? console.error : error);