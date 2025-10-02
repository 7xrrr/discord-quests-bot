interface HeaderOptions {
    authToken: string;
    accept?: string;
    acceptLanguage?: string;
    superProperties?: string;
}


function generateHeaders(token: string, options?: HeaderOptions): { [key: string]: string } {
    const headers: { [key: string]: string } = {
        'accept': options?.accept || '*/*',
        'accept-language': options?.acceptLanguage || 'en,en-US;q=0.9,ar;q=0.8',
        "authorization": token.trim(),
        'priority': 'u=1, i',
        'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9044 Chrome/120.0.6099.291 Electron/28.2.10 Safari/537.36',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'x-discord-locale': 'en-US',
        'x-super-properties': generateSuperProperties(),
        "content-type": "application/json"

    };

    if (options?.superProperties) {
        headers['x-super-properties'] = options?.superProperties;
    }

    return headers;
}

function generateSuperProperties() {
    const superProperties = {
        os: "Windows",
        browser: "Chrome",
        device: "",
        system_locale: "en-US",
        browser_user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9146 Chrome/120.0.6099.291 Electron/28.2.10 Safari/537.36",
        browser_version: "124.0.0.0",
        os_version: "10",
        referrer: "",
        referring_domain: "",
        referrer_current: "",
        referring_domain_current: "",
        release_channel: "stable",
        client_build_number: 9298544,
        client_event_source: null,
        design_id: 0
    };


    const base64Encoded = btoa(JSON.stringify(superProperties));

    return base64Encoded;
};
export { generateHeaders };
