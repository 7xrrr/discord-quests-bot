import {
    TextInputBuilder as DiscordTextInputBuilder,
    TextInputStyle,
    APITextInputComponent,
} from "discord.js";

export class TextInputBuilder extends DiscordTextInputBuilder {
    constructor(options?: Partial<APITextInputComponent>) {
        super();

        if (options) {
            if (options.custom_id) this.setCustomId(options.custom_id);
            if (options.label) this.setLabel(options.label);
            if (options.style !== undefined) this.setStyle(options.style as TextInputStyle);
            if (options.value) this.setValue(options.value);
            if (options.placeholder) this.setPlaceholder(options.placeholder);
            // @ts-ignore
            if (options.required !== undefined) this.setRequired(options.required);
            if (options.max_length !== undefined) this.setMaxLength(options.max_length);
            if (options.min_length !== undefined) this.setMinLength(options.min_length);
        }
    }

    override setLabel(label: string): this {
        const maxLength = 45;
        const trimmed = label.slice(0, maxLength);
        return super.setLabel(trimmed);
    }
    override setPlaceholder(placeholder: string): this {
        const maxLength = 100;
        const trimmed = placeholder.slice(0, maxLength);
        return super.setPlaceholder(trimmed);
    }
    override setCustomId(customId: string): this {
        const maxLength = 100;
        const trimmed = customId.slice(0, maxLength);
        return super.setCustomId(trimmed);
    }
    override setValue(value: string): this {
        const maxLength = this.data.max_length || 4000;
        const trimmed = value.slice(0, maxLength);
        return super.setValue(trimmed);
    }
// @ts-ignore
    override setRequired(required: boolean): this {
        // @ts-ignore
        return super.setRequired(required);
    }

    override toJSON(): ReturnType<DiscordTextInputBuilder["toJSON"]> {
        // @ts-ignore
        return super.toJSON();
    }
}
