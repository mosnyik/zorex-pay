import winston from "winston";
import config from "config";

const logLevels = {
  error: 0,
  warning: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const logLevel: string = config.get("logLevel");

const logger = winston.createLogger({
  levels: logLevels,
  level: logLevel,
  format: winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.errors({ stack: true }),
    winston.format.timestamp({
      format: "YYYY-MM-DD hh:mm:ss.SSS A",
    }),
    winston.format.printf(
      ({ timestamp, level, message, logMetadata, stack }) => {
        return `${timestamp} ${level}: ${logMetadata || ""} ${message} ${
          stack || ""
        }`;
      }
    )
  ),

  transports: [new winston.transports.Console()],
});

export default logger;
