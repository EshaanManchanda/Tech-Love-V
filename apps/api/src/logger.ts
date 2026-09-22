import pino from "pino";

const isProd = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

export const logger = pino({
  level: isProd ? "info" : "debug",
  enabled: !isTest, // keep test output clean
  transport: isProd ? undefined : { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } },
});
