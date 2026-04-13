export const ShellColors = {
  WHITE: "\x1b[37m", // Blanco
  CYAN: "\x1b[36m", // Cyan
  GREEN: "\x1b[32m", // Verde
  YELLOW: "\x1b[33m", // Amarillo
  RED: "\x1b[31m", // Rojo
  RED_BACKGROUND_WHITE_TEXT: "\x1b[41m\x1b[37m", // Fondo rojo, texto blanco
  BLACK: "\x1b[30m", // Negro
  BLUE: "\x1b[34m", // Azul
  MAGENTA: "\x1b[35m", // Magenta
  BRIGHT_BLACK: "\x1b[90m", // Negro brillante (gris oscuro)
  BRIGHT_RED: "\x1b[91m", // Rojo brillante
  BRIGHT_GREEN: "\x1b[92m", // Verde brillante
  BRIGHT_YELLOW: "\x1b[93m", // Amarillo brillante
  BRIGHT_BLUE: "\x1b[94m", // Azul brillante
  BRIGHT_MAGENTA: "\x1b[95m", // Magenta brillante
  BRIGHT_CYAN: "\x1b[96m", // Cyan brillante
  BRIGHT_WHITE: "\x1b[97m", // Blanco brillante
  BG_BLACK: "\x1b[40m", // Fondo negro
  BG_WHITE: "\x1b[47m", // Fondo blanco
  BG_BLUE: "\x1b[44m", // Fondo azul
}

const RESET = "\x1b[0m" // Resetear colores

export function colorize(string: string, color: keyof typeof ShellColors) {
  const colorCode = ShellColors[color]
  if (typeof colorCode !== "string" || colorCode === "") {
    throw new Error(`Color '${color}' is not supported.`)
  }
  return `${colorCode}${string}${RESET}`
}
