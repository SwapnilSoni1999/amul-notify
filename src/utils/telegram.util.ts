import bot from '@/bot'

export const startCommandLink = async (payload: string): Promise<string> => {
  const info = bot.botInfo || (await bot.telegram.getMe())

  return `https://t.me/${info.username}?start=${payload}`
}
