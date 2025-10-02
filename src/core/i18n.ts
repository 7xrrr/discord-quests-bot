import fs from 'fs';
import path from 'path';

export default class I18nManager {
    private translations: Record<string, any> = {};
    private defaultLang: string;
    private cache: Map<string, I18nInstance> = new Map();

    constructor(defaultLang: string = 'en') {
        this.defaultLang = defaultLang;
        this.loadTranslations();
    }

    private loadTranslations() {
        const langDir = path.resolve(process.cwd(), 'lang');
        const files = fs.readdirSync(langDir);

        for (const file of files) {
            if (file.endsWith('.json')) {
                const lang = file.replace('.json', '');
                const content = JSON.parse(fs.readFileSync(path.join(langDir, file), 'utf-8'));
                this.translations[lang] = content;
            }
        }
    }

    // ✅ Existing method — keeps lang parameter
    public t(lang: string, key: string, variables: Record<string, string | number> = {}): string {
        const value = this.getNestedValue(this.translations[lang], key)

            ?? this.getNestedValue(this.translations[this.defaultLang], key)
            ?? key;
  
        if (typeof value !== 'string') return key;

        return value.replace(/\{(\w+)\}/g, (_, varName) => String(variables[varName] ?? `{${varName}}`));
    }

    // ✅ NEW: Uses the default language automatically
    public tDefault(key: string, variables: Record<string, string | number> = {}): string {
        return this.t(this.defaultLang, key, variables);
    }

    private getNestedValue(obj: any, key: string): any {
        return key.split('.').reduce((acc, part) => acc?.[part], obj);
    }

    public getAvailableLanguages() {
        return Object.entries(this.translations).map(([lang, data]) => ({
            lang,
            name: data?.langConfig?.name ?? lang,
            flag: data?.langConfig?.flag ?? '',
            short: data?.langConfig?.short ?? lang
        }));
    }

    public get(lang: string): I18nInstance {
        if (!this.cache.has(lang)) {
            this.cache.set(lang, new I18nInstance(lang, this));
        }
        return this.cache.get(lang)!;
    }
}

export class I18nInstance {
    constructor(
        private lang: string,
        private manager: I18nManager
    ) { }

    public t(key: string, variables: Record<string, string | number> = {}): string {
        return this.manager.t(this.lang, key, variables);
    }

    public getLang(): string {
        return this.lang;
    }
}
