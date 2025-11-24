import axios, {
  AxiosInstance,
  AxiosProxyConfig,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosError
} from "axios";

import { ProxyInterface } from "../loadProxy.js";
import { generateHeaders } from "./genrateHeaders.js";

interface RateLimitInfo {
  remaining: number | null;
  resetAfter: number | null;  // in seconds
  bucket?: string;
  global?: boolean;
}

// Simple in‐memory last reset timestamp & remaining count per bucket
const bucketMap = new Map<string, RateLimitInfo>();

export const customAxiosWithProxy = (
  token: string,
  useProxy?: ProxyInterface,
): AxiosInstance => {
  const headers = generateHeaders(token);

  const config = {
    baseURL: "https://discord.com/api/v9/",
    headers,
    timeout: 30000,
  } as AxiosRequestConfig;

  if (useProxy) {
    const [host, portStr] = useProxy.ip.split(":");
    const [username, password] = useProxy.authentication.split(":");
    config.proxy = {
      protocol: "http",
      host,
      port: parseInt(portStr, 10),
      auth: {
        username,
        password,
      },
    } as AxiosProxyConfig;
  }

  const axiosInstance: AxiosInstance = axios.create(config);

  // Request interceptor: optionally delay if bucket says we must wait
  axiosInstance.interceptors.request.use(
    async (req: InternalAxiosRequestConfig) => {
      // Determine bucket key (for simplicity: route + method)
      const bucketKey = `${req.method || "GET"}:${req.url}`;

      const info = bucketMap.get(bucketKey);
      if (info && info.remaining !== null && info.remaining <= 0 && info.resetAfter !== null) {
        // Wait until resetAfter has passed
        await new Promise(resolve => setTimeout(resolve, info.resetAfter * 1000));
      }

      return req;
    },
    error => Promise.reject(error)
  );

  // Response interceptor: capture rate-limit headers & handle 429
  axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => {
      const headers = response.headers;

      // Parse rate limit headers if present
      const bucketKey = `${response.config.method || "GET"}:${response.config.url}`;
      const remaining = headers["x-ratelimit-remaining"] !== undefined ?
        parseInt(headers["x-ratelimit-remaining"], 10) : null;
      const resetAfter = headers["x-ratelimit-reset-after"] !== undefined ?
        parseFloat(headers["x-ratelimit-reset-after"]) : null;
      const bucket = headers["x-ratelimit-bucket"];
      const global = headers["x-ratelimit-global"] === "true";

      bucketMap.set(bucketKey, { remaining, resetAfter, bucket, global });

      return response;
    },
    async (error: AxiosError) => {
      if (error.response && error.response.status === 429) {
        // Rate limited: parse retry_after
        const retryAfter = error.response.headers["retry-after"] !== undefined ?
          parseFloat(error.response.headers["retry-after"]) : null;

        if (retryAfter !== null) {
          // Wait and retry
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          // Retry original request
          return axiosInstance.request(error.config as any);
        }
      }
      return Promise.reject(error);
    }
  );

  return axiosInstance;
};
