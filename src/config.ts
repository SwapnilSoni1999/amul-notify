import { BotCommand } from 'telegraf/typings/core/types/typegram'

export const LOG_CHANNEL = -4963360663

export const userCommands: readonly BotCommand[] = [
  { command: 'start', description: 'Start the bot' },
  { command: 'setpincode', description: 'Set your pincode' },
  { command: 'pincode', description: 'Get your current pincode' },
  { command: 'products', description: 'List all protein products' },
  { command: 'autoorder', description: 'Toggle auto-ordering of products' },
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
export const AUTO_BOOKING_PAYMENT_CURRENCY = 'INR'
export const AUTO_BOOKING_PAYMENT_PLANS = [
  {
    id: '30d',
    amount: 1900,
    validityInDays: 30,
    label: '30 days | 19 INR'
  },
  {
    id: '12d',
    amount: 900,
    validityInDays: 12,
    label: '12 days | 9 INR'
  },
  {
    id: '3d',
    amount: 500,
    validityInDays: 3,
    label: '3 days | 5 INR'
  }
] as const
export type AutoBookingPaymentPlan = (typeof AUTO_BOOKING_PAYMENT_PLANS)[number]
export const DEFAULT_AUTO_BOOKING_PAYMENT_PLAN = AUTO_BOOKING_PAYMENT_PLANS[0]

export const ACTIONS = {
  home: 'home',
  settings: {
    trackingStyle: {
      toggle: 'settings:trackingStyle:toggle',
      changeMaxNotifyCount: 'settings:trackingStyle:changeMaxNotifyCount'
    },
    autoOrder: {
      toggleEnabled: 'autoOrder:toggleEnabled',
      login: 'autoOrder:login',
      logout: 'autoOrder:logout',
      setAddress: 'autoOrder:setAddress'
    }
  }
}
