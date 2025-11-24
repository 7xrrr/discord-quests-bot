interface HeaderOptions {
    authToken: string;
    accept?: string;
    acceptLanguage?: string;
    superProperties?: string;
}


function generateHeaders(token: string, options?: HeaderOptions): { [key: string]: string } {
    const headers: { [key: string]: string } = {
        'accept': options?.accept || '*/*',
        'accept-language': 'en,en-US;q=0.9,ar;q=0.8',
        "authorization": token.trim(),
        'priority': 'u=1, i',
        'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9044 Chrome/120.0.6099.291 Electron/28.2.10 Safari/537.36',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'x-discord-locale': 'en-US',
        'x-super-properties': generateSuperProperties(),
        'x-debug-options': 'bugReporterEnabled',
        'content-type': 'application/json',
        'origin': 'https://discord.com',
        'referer': 'https://discord.com/quest-home',
        'x-discord-timezone': 'Africa/Algiers',
    };

    if (options?.superProperties) {
        headers['x-super-properties'] = options?.superProperties;
    }

    return headers;
}

function generateSuperProperties() {
    const superProperties = {
        "os": "Windows",
        "browser": "Chrome",
        "device": "",
        "system_locale": "en",
        "has_client_mods": false,
        "browser_user_agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9044 Chrome/120.0.6099.291 Electron/28.2.10 Safari/537.36",
        "browser_version": "142.0.0.0",
        "os_version": "10",
        "referrer": "",
        "referring_domain": "",
        "referrer_current": "https://discord.com/",
        "referring_domain_current": "discord.com",
        "release_channel": "stable",
        "client_build_number": 971383, "client_event_source": null, "client_launch_id": "5b23fbc5-78bc-4900-91bd-cb0992a602bb",
        "launch_signature": "1572e1e6-27cc-4750-9d1a-d485e6dde7b4",
        "client_app_state": "focused",
        "client_heartbeat_session_id": "c9b8bb07-d438-4400-aed9-e95341ff6a65"
    }


    const base64Encoded = btoa(JSON.stringify(superProperties));

    return base64Encoded;
};
export { generateHeaders };
