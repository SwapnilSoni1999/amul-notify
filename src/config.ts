import { BotCommand } from 'telegraf/typings/core/types/typegram'

export const LOG_CHANNEL = -4963360663

export const userCommands: readonly BotCommand[] = [
  { command: 'start', description: 'Start the bot' },
  { command: 'setpincode', description: 'Set your pincode' },
  { command: 'pincode', description: 'Get your current pincode' },
  { command: 'products', description: 'List all protein products' },
  { command: 'settings', description: 'View or change your settings' },
  { command: 'tracked', description: 'List all tracked products' },
  { command: 'favourites', description: 'List your favourite products' },
  { command: 'settings', description: 'View or change your settings' },
  { command: 'support', description: 'Get support' },
  { command: 'map', description: 'View interactive map' }
]

export const adminCommands: readonly BotCommand[] = [
  { command: 'broadcast', description: 'Broadcast a message to all users' },
  { command: 'sessions', description: 'List all Amul sessions' },
  { command: 'stats', description: 'Get bot statistics' },
  { command: 'analytics', description: 'Get analytics of products' },
  { command: 'productcount', description: 'Get product count by SKU' }
]

export const TIMEZONE = 'Asia/Kolkata'

export const ACTIONS = {
  settings: {
    trackingStyle: {
      toggle: 'settings:trackingStyle:toggle',
      changeMaxNotifyCount: 'settings:trackingStyle:changeMaxNotifyCount'
    }
  }
}
