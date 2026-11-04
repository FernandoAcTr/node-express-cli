import 'colors'

export interface Logger {
  info(message: string): void
  success(message: string): void
  warn(message: string): void
  error(message: string): void
}

export class ConsoleLogger implements Logger {
  info(message: string): void {
    console.log(message)
  }

  success(message: string): void {
    console.log(message.green)
  }

  warn(message: string): void {
    console.warn(message.yellow)
  }

  error(message: string): void {
    console.error(message.red)
  }
}

export const consoleLogger = new ConsoleLogger()
