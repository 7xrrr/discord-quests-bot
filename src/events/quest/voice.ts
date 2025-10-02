import { ClientEvents, VoiceState } from "discord.js";

import questsConfig from "../../config/questsConfig.js";
import { baseDiscordEvent } from "../../lib/handler/baseClientEvent.js";




export default class readyEvent extends baseDiscordEvent {
    public name: keyof ClientEvents = "voiceStateUpdate";
    public once: boolean = true;

    async executeEvent(oldState: VoiceState, newState: VoiceState): Promise<void> {
        const guild = newState.guild;
        if (!guild) return;
        const member = newState.member;
        if (!member || !questsConfig?.voice?.role) return;
        if (member.roles.cache.has(questsConfig.voice.role)) {
            await member.roles.remove(questsConfig.voice.role).catch(() => null);
        }


    }


}