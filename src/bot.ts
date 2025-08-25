import { Scenes, session, Telegraf } from 'telegraf'
import { MyContext } from '@/types/context.types'
import env from '@/env'
import { startCommand } from '@/commands/start.command'
import { sessionMiddleware } from '@/middlewares/session.middleware'
import { setCommands } from '@/middlewares/setCommands.middleware'
import { withCatchAsync } from '@/utils/withCatchAsync.util'
import { emojis } from '@/utils/emoji.util'
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
import { statsCommand } from './commands/stats.command'
import { analyticsCommand } from './commands/analytics.command'
import { productCountCommand } from './commands/productCount.command'
import { settingsCommand } from './commands/settings.command'
import { ACTIONS } from './config'
import { toggleTrackingStyleAction } from './actions/toggleTrackingStyle.action'
import { changeMaxNotifyCount } from './actions/changeMaxNotifyCount.action'
import { changeMaxNotifyCountWizard } from './wizards/changeMaxNotifyCount.wizard'
import { favouritesCommand } from './commands/favourites.command'
import { mapCommand } from './commands/map.command'
import { analyticsMiddleware } from './middlewares/analytics.middleware'

const bot = new Telegraf<MyContext>(env.BOT_TOKEN)

const stage = new Scenes.Stage<MyContext>([changeMaxNotifyCountWizard])
bot.use(session())

bot.use(withCatchAsync(onlyPvtChat))
bot.use(withCatchAsync(sessionMiddleware))
bot.use(withCatchAsync(analyticsMiddleware))
bot.use(withCatchAsync(setCommands))

bot.use(stage.middleware())

bot.start(withCatchAsync(startCommand))

bot.command('setpincode', withCatchAsync(setPincodeCommand))

bot.use(withCatchAsync(pincodeGuard))

bot.command('products', withCatchAsync(productsCommand))
bot.command('tracked', withCatchAsync(trackedCommand))
bot.command('support', withCatchAsync(supportCommand))
bot.command('pincode', withCatchAsync(pincodeCommand))
bot.command('settings', settingsCommand)
bot.command('favourites', withCatchAsync(favouritesCommand))
bot.command('map', withCatchAsync(mapCommand))

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
bot.command('stats', withCatchAsync(isAdmin), withCatchAsync(statsCommand))
bot.command(
  'analytics',
  withCatchAsync(isAdmin),
  withCatchAsync(analyticsCommand)
)
bot.command(
  'productcount',
  withCatchAsync(isAdmin),
  withCatchAsync(productCountCommand)
)

bot.action(
  ACTIONS.settings.trackingStyle.toggle,
  withCatchAsync(toggleTrackingStyleAction)
)

bot.action(
  ACTIONS.settings.trackingStyle.changeMaxNotifyCount,
  withCatchAsync(changeMaxNotifyCount)
)

bot.use(withCatchAsync(loggerMiddleware))

bot.catch((err, ctx) => {
  console.error('Error in bot:', err)
  ctx.reply(`${emojis.crossMark} An error occurred. Please try again later.`)
})

export default bot
