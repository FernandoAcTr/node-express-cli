import { colorize, ShellColors } from "@/utils/colorize"

type LogLevel = "log" | "debug" | "info" | "warn" | "error" | "fatal"
const envLogLevel = process.env.LOG_LEVEL
const LEVEL_ORDER: LogLevel[] = ["log", "debug", "info", "warn", "error", "fatal"]
const MIN_LEVEL: LogLevel = LEVEL_ORDER.includes(envLogLevel as LogLevel) ? (envLogLevel as LogLevel) : "log"
const MIN_LEVEL_INDEX = LEVEL_ORDER.indexOf(MIN_LEVEL)

const COLORS: Record<LogLevel, keyof typeof ShellColors> = {
  log: "WHITE",
  debug: "CYAN",
  info: "GREEN",
  warn: "YELLOW",
  error: "RED",
  fatal: "RED_BACKGROUND_WHITE_TEXT",
}

const logFn = {
  log: console.log,
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
  fatal: console.error,
}

const formatDate = (): string =>
  new Date().toLocaleDateString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })

const logToConsole = (level: LogLevel, ...args: unknown[]) => {
  if (LEVEL_ORDER.indexOf(level) < MIN_LEVEL_INDEX) return
  const date = formatDate()
  const color = COLORS[level]
  const prefix = colorize(`[${date}][${level}]`, color)
  const log = logFn[level]
  log(prefix, ...args)
}

export default {
  log: (...args: unknown[]) => logToConsole("log", ...args),
  debug: (...args: unknown[]) => logToConsole("debug", ...args),
  info: (...args: unknown[]) => logToConsole("info", ...args),
  warn: (...args: unknown[]) => logToConsole("warn", ...args),
  error: (...args: unknown[]) => logToConsole("error", ...args),
  fatal: (...args: unknown[]) => logToConsole("fatal", ...args),
}
