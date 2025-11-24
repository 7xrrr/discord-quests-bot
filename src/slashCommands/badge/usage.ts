import { ChatInputCommandInteraction } from "discord.js";
import { SlashCommand, slashCommandFlags } from "../../lib/handler/slashCommand.js";
import { CustomClient } from "../../core/customClient.js";
import { permissionList } from "../../lib/handler/messageCommand.js";
import { I18nInstance } from "../../core/i18n.js";
import { ChildManager } from "../../core/ChildManager.js";
import { EmbedBuilder } from "../../lib/handler/embedBuilder.js";
import numeral from 'numeral';
import pidusage from 'pidusage';
import { usersCache } from "../../core/cache.js";

export default class setLang extends SlashCommand {
    public name: string = "usage";
    public description: string = "Show the bot's process usage";
    public options = [];
    public cooldown: number | string = "1m";
    public allowedRoles?: string[] = [];
    public allowedServers?: string[] = [];
    public allowedUsers?: string[] = [];
    public allowedChannels?: string[] = [];
    public permissions: permissionList[] = [];
    public bot_permissions: permissionList[] = [];
    public flags: slashCommandFlags[] = ["devOnly", "ephemeral", "onlyDm", "onlyGuild"];
    public async execute({
        interaction,
        client,
        i18n,
        lang
    }: {
        interaction: ChatInputCommandInteraction;
        client: CustomClient;
        i18n: I18nInstance;
        lang: string;
    }): Promise<any> {
        const ids = [process.pid, ...ChildManager.pids]

        const ram = await Promise.all(ids.map(e => getProcessUsage(e)));
        const totalRam = ram.reduce((acc, curr) => acc + curr.memory, 0);
        const totalCpu = ram.reduce((acc, curr) => acc + curr.cpu, 0);
        let text = ``
        const usersCacheSize = usersCache.size;
        const questsCacheSize = usersCache.reduce((acc, curr) => acc + curr.quests.size, 0);
        text += `- **Total Users Cache:** \`${usersCacheSize}\`\n- **Total Quests Cache:** \`${questsCacheSize}\`\n`
        text += `- **${i18n.t("usage.totalRam")}:** \`${totalRam.toFixed(2)} MB\`\n- **${i18n.t("usage.totalCpu")}**: \`${totalCpu.toFixed(2)}%\`\n- **${i18n.t("usage.currentSolvers")}:** \`${ChildManager.TotalUsage}\`\n`;
        text += `- **${i18n.t("usage.childProcess")}**: \`${ram.length - 1}\`\n`
        text += `# **${i18n.t("usage.processUsage")}**:\n\n`

        ram.forEach((e, i) => {
            text += `-# - **${i18n.t("usage.PID")}:** \`${ids[i]}\` - **${i18n.t("usage.ram")}:** \`${e.memory.toFixed(2)} ${i18n.t("usage.mb")}\` - **${i18n.t("usage.cpu")}:** \`${e.cpu.toFixed(2)}%\` ${ids[i] === process.pid ? `(${i18n.t("usage.main")})` : ""}\n`
        })

        interaction.editReply({
            embeds: [new EmbedBuilder().setDescription(text).setColor("Random")]
        })
    }
}
async function getProcessUsage(pid: number): Promise<{ cpu: number, memory: number }> {
    try {
        const stats = await pidusage(pid);
        return {
            cpu: stats.cpu,
            memory: numeral(stats.memory / 1024 / 1024).value(),

        }


    } catch (error) {
        console.error('Error:', error);
    }
}