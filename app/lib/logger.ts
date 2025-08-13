import { createLogger, transports, format } from "winston";
import path from "path";

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`)
  ),
  transports: [
    new transports.File({ filename: path.join(process.cwd(), "logs", "server.log") }), // Log to file
    new transports.Console(), // Log to console
  ],
});

export default logger;
