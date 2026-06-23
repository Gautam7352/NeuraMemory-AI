import winston from 'winston';
import { env } from '../config/env.js';

const { combine, timestamp, printf, colorize, json } = winston.format;

// Custom log format for development (looks similar to previous console output but with timestamps)
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}] : ${message}`;

  // If there are additional metadata object keys, append them (e.g., error objects)
  const metaKeys = Object.keys(metadata);
  if (metaKeys.length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  return msg;
});

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format:
    env.NODE_ENV === 'production'
      ? combine(timestamp(), json())
      : combine(
          colorize({ all: true }),
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          devFormat,
        ),
  transports: [new winston.transports.Console()],
});
