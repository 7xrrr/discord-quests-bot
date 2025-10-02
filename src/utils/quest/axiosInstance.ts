import axios, { AxiosInstance, AxiosProxyConfig, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";

import { ProxyInterface } from "../loadProxy.js";
import { generateHeaders } from "./genrateHeaders.js";


export const customAxiosWithProxy = (
  token: string,
  useProxy?: ProxyInterface,
): AxiosInstance => {
  const headers = generateHeaders(token);
  let config = {
    baseURL: "https://discord.com/api/v9/",
    headers: headers,
    timeout: 10000,
  } as AxiosRequestConfig;
  if (useProxy) {



    config.proxy = {
      protocol: "http",
      host: useProxy.ip.split(":")[0],
      port: parseInt(useProxy.ip.split(":")[1]),
      auth: {
        username: useProxy.authentication.split(":")[0],
        password: useProxy.authentication.split(":")[1],
      },
    } as AxiosProxyConfig;


  }
  //   if (config.proxy) console.log(`Using proxy: ${config.proxy.host}:${config.proxy.port}`);
  const axiosInstance: AxiosInstance = axios.create(config);

  axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  axiosInstance.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  return axiosInstance;
};