import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { Logtail } from "@logtail/node";
import { LogtailTransport } from "@logtail/winston";
import path from "path";
import { fileURLToPath } from "url";
import util from "util";
import chalk from "chalk";
import config from "../config/config.js";

export class Logger {
  private static logger: winston.Logger = Logger.createLogger();

  private static createLogger(): winston.Logger {
    const fileTransport = new DailyRotateFile({
      filename: "logs/%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",   // each log file ≤ 5 MB
      maxFiles: "5",   //
    });

    const customConsoleFormat = winston.format.printf((info) => {
      const { level, message } = info;
      const time = new Date();
      const timeStr = chalk.gray(
        `[${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}:${String(time.getSeconds()).padStart(2, "0")}]`
      );

      let tagColored = "";
      switch (level) {
        case "info":
          tagColored = chalk.green(`[LOG]`);
          break;
        case "warn":
          tagColored = chalk.yellow(`[WARN]`);
          break;
        case "error":
          tagColored = chalk.red(`[ERROR]`);
          break;
        case "debug":
          tagColored = chalk.magenta(`[DEBUG]`);
          break;
        default:
          tagColored = chalk.white(`[${level.toUpperCase()}]`);
          break;
      }

      let formattedMsg =
        typeof message === "object"
          ? util.inspect(message, { depth: null, colors: true })
          : message;

      const source = info.source ? chalk.blue(info.source) : chalk.blue("[unknown]");

      return `${timeStr} ${tagColored} ${source} ${formattedMsg}`;
    });

    const consoleTransport = new winston.transports.Console({
      format: winston.format.combine(
        customConsoleFormat,
        winston.format.colorize({ all: true })
      ),
    });

    const logger = winston.createLogger({
      level: "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: "discord-bot" },
      transports: [fileTransport],
      exitOnError: false,
    });

    // Handle uncaught exceptions and rejections with separate transports
    logger.exceptions.handle(
      new winston.transports.File({ filename: "logs/exceptions.log" })
    );

    logger.rejections.handle(
      new winston.transports.File({ filename: "logs/rejections.log" })
    );

    // Catch internal logger errors (e.g. "write after end")
    logger.on("error", (err) => {
      console.error("Logger internal error:", err);
    });

    // Add console transport in non-production
    if (process.env.NODE_ENV !== "production") {
      logger.add(consoleTransport);
    }

    // Add Logtail transport if enabled
    if (process.env?.LOGTAIL_ENABLE === "true") {
      try {
        const token = process.env["LOGTAIL_SOURCE_TOKEN"];
        const endpoint = process.env["LOGTAIL_INGESTION_HOST"];

        if (!token || token.length <= 1) {
          throw new Error("Logtail source token is missing");
        }

        if (!endpoint || !endpoint.includes("https://")) {
          throw new Error("Logtail ingestion host is missing or invalid format (https://)");
        }

        const logtail = new Logtail(token, { endpoint });
        logger.add(new LogtailTransport(logtail, { level: "info" }));
      } catch (error) {
        console.error("Failed to initialize Logtail:", error);
      }
    }

    return logger;
  }

  private static getCallerFile(): string {
    try {
      const originalFunc = Error.prepareStackTrace;
      const err = new Error();
      Error.prepareStackTrace = (_, stack) => stack;
      const stack = err.stack as unknown as NodeJS.CallSite[];
      Error.prepareStackTrace = originalFunc;

      const caller = stack[3];
      let fileName = caller?.getFileName();
      const line = caller?.getLineNumber();

      if (fileName) {
        if (fileName.startsWith("file://")) {
          fileName = fileURLToPath(fileName);
        }
        fileName = path.relative(process.cwd(), fileName);
        return `[${fileName}:${line}]`;
      }
    } catch {}

    return "[unknown]";
  }

  private static formatArgs(args: any[]): string {
    return args
      .map((arg) => {
        if (typeof arg === "object") {
          return util.inspect(arg, { depth: null, colors: true });
        }
        return String(arg);
      })
      .join(" ");
  }

  public static info(...args: any[]): void {
    const message = this.formatArgs(args);
    this.logger.info(message, { source: this.getCallerFile() });
  }

  public static error(...args: any[]): void {
    const message = this.formatArgs(args);
    this.logger.error(message, { source: this.getCallerFile() });
  }

  public static warn(...args: any[]): void {
    const message = this.formatArgs(args);
    this.logger.warn(message, { source: this.getCallerFile() });
  }

  public static debug(...args: any[]): void {
    const message = this.formatArgs(args);
    if(config?.debugMode === true) {
      this.logger.info(message, { source: this.getCallerFile() });
    }
    this.logger.debug(message, { source: this.getCallerFile() });
  }
}
process.on("unhandledRejection", (reason) => {
  Logger.error("Unhandled rejection", reason);
});

process.on("uncaughtException", (err) => {
  Logger.error("Uncaught exception", err);
});
