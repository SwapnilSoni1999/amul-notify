import { Telegraf } from 'telegraf'
import { MyContext } from '@/types/context.types'
import env from '@/env'
import { startCommand } from '@/commands/start.command'
import { sessionMiddleware } from '@/middlewares/session.middleware'
import { setCommands } from '@/middlewares/setCommands.middleware'
import { withCatchAsync } from '@/utils/withCatchAsync.util'
import { productsCommand } from '@/commands/products.command'
import { onlyPvtChat } from '@/middlewares/onlyPvtChat.middleware'
import { trackedCommand } from '@/commands/tracked.command'
import { loggerMiddleware } from '@/middlewares/logger.middleware'
import { supportCommand } from '@/commands/support.command'
import { setPincodeCommand } from './commands/setPincode.command'
import { pincodeGuard } from './middlewares/pincodeGuard.middleware'
import { pincodeCommand } from './commands/pincode.command'
import { isAdmin } from './middlewares/isAdmin.middleware'
import { broadcastCommand } from './commands/broadcast.command'
import { amulSessionsCommand } from './commands/amulSessions.command'

const bot = new Telegraf<MyContext>(env.BOT_TOKEN)

bot.use(withCatchAsync(onlyPvtChat))
bot.use(withCatchAsync(sessionMiddleware))
bot.use(withCatchAsync(setCommands))

bot.start(withCatchAsync(startCommand))

bot.command('setpincode', withCatchAsync(setPincodeCommand))

bot.use(withCatchAsync(pincodeGuard))

bot.command('products', withCatchAsync(productsCommand))
bot.command('tracked', withCatchAsync(trackedCommand))
bot.command('support', withCatchAsync(supportCommand))
bot.command('pincode', withCatchAsync(pincodeCommand))

bot.command(
  'broadcast',
  withCatchAsync(isAdmin),
  withCatchAsync(broadcastCommand)
)
bot.command(
  'sessions',
  withCatchAsync(isAdmin),
  withCatchAsync(amulSessionsCommand)
)

bot.use(loggerMiddleware)

bot.catch((err, ctx) => {
  console.error('Error in bot:', err)
  ctx.reply('❌ An error occurred. Please try again later.')
})

export default bot
