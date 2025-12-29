type LogLevel = 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  data?: unknown
  timestamp: string
}

export const logger = {
  info: (message: string, data?: unknown) => {
    const entry: LogEntry = {
      level: 'info',
      message,
      data,
      timestamp: new Date().toISOString(),
    }
    console.log(JSON.stringify(entry))
  },

  warn: (message: string, data?: unknown) => {
    const entry: LogEntry = {
      level: 'warn',
      message,
      data,
      timestamp: new Date().toISOString(),
    }
    console.warn(JSON.stringify(entry))
  },

  error: (message: string, data?: unknown) => {
    const entry: LogEntry = {
      level: 'error',
      message,
      data,
      timestamp: new Date().toISOString(),
    }
    console.error(JSON.stringify(entry))
  },
}
