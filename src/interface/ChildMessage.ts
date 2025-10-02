import { ProxyInterface } from "../utils/loadProxy.js";

// --- Specific messages ---
export interface StartMessage {
    type: "start";
    data: {
        token: string;
        questId: string;
        proxy?: ProxyInterface;
        method: string;
        current: number,
        target: number
    };
}
export  interface progressMessage {
    type: "progress_update";
    target: string;
    data: {
        userId: string;
        questId: string;
        
        progress: number;
        completed: boolean;
        target: number;

    };
}

export interface PingMessage {
    type: "PING";
}

export interface ReadyMessage {
    type: "ready";
}
export interface killMessage {
    type: "kill";
    target: string;
    message?: string;
}
export interface loggedIn {
    type: "logged_in";
    target: string;
}
export interface loggedOut {
    type: "logged_out";
    target: string;
}
export interface loginError {
    type: "login_error";
    target: string;
}
export interface ErrorMessage {
    type: "ERROR";
    error: string;
    stack?: string;
}
export interface badChannel {
    type: "bad_channel";
    target: string;
}
export interface roleRequired {
    type: "role_required";
    target: string;
}
export interface roleReceived {
    type: "role_received";
    target: string;
}
export interface connectedToChannel {
    type: "connected_to_channel";
    target: string;
}
export interface roleTimeout {
    type: "role_timeout";
    target: string;
}
export interface process_update {
    type: "process_update";
    count: number;
}
export interface devlopers_message {
    type: "devlopers_message";
    message: string;
}
// --- Union of all messages ---
export type ChildMessage =
    | StartMessage
    | PingMessage
    | ReadyMessage
    | ErrorMessage | progressMessage | killMessage | loggedIn | loggedOut | loginError | badChannel
    | roleReceived | connectedToChannel
    | roleRequired | roleTimeout | process_update | devlopers_message
