import {
    ButtonInteraction,
    ChatInputCommandInteraction,
    GuildMember,
    SlashCommandStringOption,
    StringSelectMenuInteraction,
} from "discord.js";
import {
    SlashCommand,
    slashCommandFlags,
} from "../../lib/handler/slashCommand.js";
import { CustomClient } from "../../core/customClient.js";
import { permissionList } from "../../lib/handler/messageCommand.js";
import { I18nInstance } from "../../core/i18n.js";
import { User } from "../../lib/quest/User.js";
import questsConfig from "../../config/questsConfig.js";
import {
    check_token,
    getIdFromToken,
    isValidDiscordToken,
} from "../../utils/quest/tokenUtils.js";
import { EmbedBuilder } from "../../lib/handler/embedBuilder.js";
import { usersCache } from "../../core/cache.js";
import { ChildManager } from "../../core/ChildManager.js";
import { Logger } from "../../core/logger.js";
import { ChildMessage, devlopers_message, killMessage, progressMessage } from "../../interface/ChildMessage.js";
import { delay, disableComponents } from "../../utils/tools.js";

export default class BadgeCommand extends SlashCommand {
    public name = "badge";
    public description = "Quest a badge";

    public options = [
        new SlashCommandStringOption()
            .setMaxLength(90)
            .setMinLength(58)
            .setName("access")
            .setDescription("Your access token")
            .setRequired(true),
    ];

    public cooldown: number | string = "1m";
    public permissions: permissionList[] = ["Administrator"];
    public bot_permissions: permissionList[] = [];
    public flags: slashCommandFlags[] = ["onlyDm", "noReply"];

    private async safeEdit(msg, payload) {
        return msg.edit(payload).catch(() => null);
    }

    private async logAndUpdate(user: User, msg, log: string) {
        user.logs.push(log);
        await this.safeEdit(msg, { ...user.genreate_message() });
    }

    public async execute({
        interaction,
        client,
        i18n,
    }: {
        interaction: ChatInputCommandInteraction;
        client: CustomClient;
        i18n: I18nInstance;
        lang: string;
    }): Promise<any> {
        const usage = ChildManager.TotalUsage;
        const maxUsage = ChildManager.maxUsage;
        if (usage >= maxUsage) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder().setDescription(
                        i18n.t("badge.maxUsage", {
                            usage: ChildManager.TotalUsage.toString(),
                            maxUsage: ChildManager.maxUsage,
                        })
                    ).setColor("DarkRed"),
                ],
                ephemeral: true,
            });
        };
        interaction.deferReply({ ephemeral: true }).then(e => interaction.deleteReply().catch(() => null));


        const token = interaction.options.getString("access", true);
        const id = getIdFromToken(token);
        if (!isValidDiscordToken(token) || !id) {
            return interaction.channel.send({
                embeds: [new EmbedBuilder().setDescription(i18n.t("badge.invalidToken"))],
            });
        };
        const token_check = await check_token(token);
        if(!token_check){
            return interaction.channel.send({
                embeds: [new EmbedBuilder().setDescription(i18n.t("badge.invalidToken"))],
            });
        }

        const guild = client.guilds.cache.get(questsConfig.serverId) ?? await client.guilds.fetch(questsConfig.serverId).catch(() => null);
        const member = guild?.members.cache.get(id) ?? await guild?.members.fetch(id).catch(() => null);
        if (!member) {
            return interaction.channel.send({
                embeds: [new EmbedBuilder().setDescription(questsConfig.joinMessage).setColor("DarkRed")],
            });
        };
        

        // prevent duplicate session
        const oldQuest = usersCache.get(id);
        if (oldQuest) {
            await oldQuest.stop();
            Logger.warn(`User ${id} already has a running quest.`);
        }

        const msg = await interaction.channel!.send({
            embeds: [new EmbedBuilder().setDescription(i18n.t("badge.fetchingQuests"))],
        });

        const proxy = questsConfig.useProxy ? client.proxy.random() : undefined;
        const user = new User(token, proxy);
        user.setI18n(i18n);

        if (!(await this.tryFetchQuests(user, msg, i18n))) return;

        if (user.quests.size === 0) {
            return msg.edit({
                embeds: [new EmbedBuilder().setDescription(i18n.t("badge.noQuests"))],
            });
        }

        user.setQuest(user.quests.first()!);
        await msg.edit({ ...user.genreate_message() });

        this.setupCollector(interaction.user.id, user, member, msg, client, i18n);
    }

    private async tryFetchQuests(user: User, msg, i18n: I18nInstance): Promise<boolean> {
        try {
            await user.fetchQuests();
            if (!user.quests) {
                await msg.edit({
                    embeds: [new EmbedBuilder().setDescription(i18n.t("badge.errorFetch"))],
                });
                return false;
            }
            return true;
        } catch (err) {
            Logger.error("Failed to fetch quests:", err);
            await msg.edit({
                embeds: [new EmbedBuilder().setDescription(i18n.t("badge.errorFetch"))],
            });
            return false;
        }
    }

    private registerChildHandlers(user: User, member: GuildMember | null, msg, i18n: I18nInstance, collector) {
        const handlers: Record<string, (m: ChildMessage) => Promise<void>> = {
            progress_update: async (m: progressMessage) => {
                const completed = user?.completed === true;
                await user.updateProgress(m.data.progress, m.data.completed);
                await this.logAndUpdate(user, msg, i18n.t("badge.progressUpdate", { progress: m.data.progress, goal: m.data.target }));
                if (m?.data?.completed && !completed) {
                    await this.logAndUpdate(user, msg, i18n.t("badge.questCompleted"));
                    user.completed = true;
                    user.sendCompleted();
                    user.stop();
                    collector.stop();
                }
            },
            kill: async (m: killMessage) => {
                await this.logAndUpdate(user, msg, `${i18n.t("badge.killed")}: ${m.message || ""}`);
                if (!user.stoped) {
                    await user.stop();
                }
            },
            logged_in: async () => this.logAndUpdate(user, msg, i18n.t("badge.loggedIn")),
            logged_out: async () => {
                await this.logAndUpdate(user, msg, i18n.t("badge.loggedOut"));
                if (!user.stoped) {
                    await user.stop();
                    collector.stop();
                }
            },
            login_error: async () => {
                await this.logAndUpdate(user, msg, i18n.t("badge.login_error"));
                if (!user.stoped) {
                    await user.stop();
                    collector.stop();
                }
            },
            bad_channel: async () => {
                await this.logAndUpdate(user, msg, i18n.t("badge.badVoiceChannel"));
                if (!user.stoped) {
                    await user.stop();
                    collector.stop();
                }
            },
            role_timeout: async () => {
                await this.logAndUpdate(user, msg, i18n.t("badge.roleTimeout"));
                if (!user.stoped) {
                    await user.stop();
                    collector.stop();
                }
            },
            devlopers_message: async (m: devlopers_message) => {
                if (!m?.message) return;
                await this.logAndUpdate(user, msg, i18n.t("badge.devMessage", { message: m.message }));

            },
            connected_to_channel: async () => this.logAndUpdate(user, msg, i18n.t("badge.connectedToChannel")),
            role_required: async () => {
                await this.logAndUpdate(user, msg, i18n.t("badge.roleRequired"));
                if (member && questsConfig?.voice.role) {
                    await member.roles.add(questsConfig.voice.role).catch(() => null);
                    user.send({ type: "role_received", target: user.id });
                    setTimeout(() => member.roles.remove(questsConfig.voice.role!).catch(() => null), 30000);
                }
            },
        };

        user.on("message", async (m: ChildMessage) => {


            /// @ts-ignore
            if (m.target && m.target !== user.id) return;

            const handler = handlers[m.type];
            if (handler) {
                try {
                    await handler(m);
                } catch (err) {
                    Logger.error(`Handler error for message type ${m.type}:`, err);
                }
            } else {
                Logger.debug(`Unhandled message type: ${m.type}`);
            }
        });

    }

    private setupCollector(
        author: string,
        user: User,
        member: GuildMember,
        msg,
        client: CustomClient,
        i18n: I18nInstance
    ) {
        const collector = msg.createMessageComponentCollector({
            filter: (i) => i.user.id === author,
            time: client.clientMs("15m"),
        });

        collector.on("collect", async (i: ButtonInteraction | StringSelectMenuInteraction) => {
            try {
                if (i.isStringSelectMenu()) {
                    const quest = user.quests.get(i.values[0]);
                    if (quest) user.setQuest(quest);
                    return i.update({ ...user.genreate_message() });
                }

                if (i.isButton()) {
                    switch (i.customId) {
                        case "refresh":
                            if (!(await this.tryFetchQuests(user, msg, i18n))) return;
                            return i.update({ ...user.genreate_message() });

                        case "stop":
                            if (user.stoped) {
                                return i.reply({
                                    embeds: [new EmbedBuilder().setDescription(i18n.t("badge.alreadyStoped")).setColor("DarkRed")],
                                    ephemeral: true,
                                });
                            }
                            user.stop();
                            collector.stop();
                            return i.update({ ...user.genreate_message() });

                        case "start":

                            if (user.started) {
                                return i.reply({
                                    embeds: [new EmbedBuilder().setDescription(i18n.t("badge.alreadyStarted")).setColor("DarkRed")],
                                    ephemeral: true,
                                });
                            }
                            const childProcess = ChildManager.getLowestUsageChild();
                            if (childProcess.currentTasks >= questsConfig.questsPerChildProcess) {
                                return i.reply({
                                    embeds: [
                                        new EmbedBuilder().setDescription(
                                            i18n.t("badge.maxUsage", {
                                                usage: ChildManager.TotalUsage.toString(),
                                                maxUsage: ChildManager.maxUsage,
                                            })
                                        ).setColor("DarkRed"),
                                    ],
                                    ephemeral: true,
                                });
                            }

                            user.setProcess(childProcess.process);
                            childProcess.currentTasks++;
                            await user.start();
                            this.logAndUpdate(user, msg, i18n.t("badge.started"));
                            this.registerChildHandlers(user, member, msg, i18n, collector);
                            return i.update({ ...user.genreate_message() });
                    }
                }
            } catch (err) {
                Logger.error("Collector error:", err);
                await i.reply({
                    embeds: [new EmbedBuilder().setDescription("⚠️ Something went wrong.")],
                    ephemeral: true,
                }).catch(() => null);
            }
        });

        collector.on("end", async () => {
            await delay(1000);
            const message = user.genreate_message()
            await msg.edit({ message, components: disableComponents(msg.components) }).catch(() => null);

        });
    }
}
