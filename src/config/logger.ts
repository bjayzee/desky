import pino from "pino";

const logger = pino({
  transport: process.env.NODE_ENV === "development" ? {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname", // Exclude unnecessary fields
    },
  } : undefined,
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: [
      "req.headers.authorization", 
      "req.body.password",         
      "req.body.token",       
    ],
    censor: "[REDACTED]", // Custom replacement text
  },
});

export default logger;
