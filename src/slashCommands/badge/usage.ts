import { ChatInputCommandInteraction, EmbedBuilder, InteractionContextType } from "discord.js";
import ms from "ms";
import { client } from "../../index.js";
import config from "../../config.js";
import numeral from 'numeral';
import pidusage from 'pidusage';

export default {
    name: "usage",
    description: "امر الي تجيب منه شارة المهمات",
    permissions: [],
    roleRequired: [],
    cooldown: ms("5s"),
    allowAllGuilds: true,
    dmCommand: true,
    contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
    options: [],
    
    function: async function ({ interaction }: { interaction: ChatInputCommandInteraction }) {
        if(!config.devlopers.includes(interaction.user.id)) return;
        await interaction.deferReply();
        const ids = [process.pid, ...client.questSolvoer.map(e => e?.childProcess?.pid).filter(e => e)];
        const ram = await Promise.all(ids.map(e => getProcessUsage(e)));
        const totalRam = ram.reduce((acc, curr) => acc + curr.memory, 0);
        const totalCpu = ram.reduce((acc, curr) => acc + curr.cpu, 0);
        let text = ``
        text += `- **Total Ram:** \`${totalRam.toFixed(2)} MB\`\n- **Total CPU**: \`${totalCpu.toFixed(2)}%\`\n- **Current Solovers:** \`${client.questSolvoer.size}\`\n`;
        text += `- **Child Processes**: \`${ram.length-1}\`\n`
        text += `# **Process Usage**:\n\n`
        
        ram.forEach((e, i) => {
            text += `-# - **PID:** \`${ids[i]}\` - **Ram:** \`${e.memory.toFixed(2)} MB\` - **CPU:** \`${e.cpu.toFixed(2)}%\` ${ids[i] === process.pid ? "(Main)" : ""}\n`
        })

        interaction.editReply({
            embeds: [new EmbedBuilder().setDescription(text).setColor("Random")]
        })



    }
};


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