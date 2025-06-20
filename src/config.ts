import { BotCommand } from 'telegraf/typings/core/types/typegram'

export const LOG_CHANNEL = -1002703449959

export const userCommands: readonly BotCommand[] = [
  { command: 'start', description: 'Start the bot' },
  { command: 'products', description: 'List all protein products' },
  { command: 'tracked', description: 'List all tracked products' },
  { command: 'support', description: 'Get support' }
]

export const adminCommands: readonly BotCommand[] = []
