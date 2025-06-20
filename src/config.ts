import { BotCommand } from 'telegraf/typings/core/types/typegram'

export const LOG_CHANNEL = 124

export const userCommands: readonly BotCommand[] = [
  { command: 'products', description: 'List all protein products' }
]

export const adminCommands: readonly BotCommand[] = []
