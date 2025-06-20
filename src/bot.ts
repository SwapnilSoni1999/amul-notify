import { Telegraf } from 'telegraf'
import { MyContext } from '@/types/context.types'
import env from '@/env'
import { startCommand } from './commands/start.command'
import { sessionMiddleware } from './middlewares/session.middleware'
import { setCommands } from './middlewares/setCommands.middleware'
import { withCatchAsync } from './utils/withCatchAsync.util'
import { productsCommand } from './commands/products.command'
import { onlyPvtChat } from './middlewares/onlyPvtChat.middleware'
import { trackedCommand } from './commands/tracked.command'

const bot = new Telegraf<MyContext>(env.BOT_TOKEN)

bot.use(withCatchAsync(onlyPvtChat))
bot.use(withCatchAsync(sessionMiddleware))
bot.use(withCatchAsync(setCommands))

bot.start(withCatchAsync(startCommand))

bot.command('products', withCatchAsync(productsCommand))
bot.command('tracked', withCatchAsync(trackedCommand))

bot.catch((err, ctx) => {
  console.error('Error in bot:', err)
  ctx.reply('❌ An error occurred. Please try again later.')
})

export default bot
