import { MiddlewareFn } from 'telegraf'
import UserModel, { HydratedUser } from '@/models/user.model'
import { MyContext } from '@/types/context.types'
import { emojis } from '@/utils/emoji.util'
import ProductModel, { HydratedProduct } from '@/models/product.model'
import {
  AmulApi,
  getAmulCloudflareRetryAt,
  getOrCreateAmulApi
} from '@/libs/amulApi.lib'
import { isCloudflareChallengeError } from '@/libs/amulError.lib'
import { isLoggedIn } from '@/utils/autoOrder.util'

export const sessionMiddleware: MiddlewareFn<MyContext> = async (ctx, next) => {
  if (!ctx.from) {
    return ctx.reply(`${emojis.crossMark} Unable to identify user.`)
  }

  const user = await UserModel.findOneAndUpdate(
    {
      $or: [
        { tgId: ctx.from.id },
        { tgUsername: { $regex: new RegExp(`^${ctx.from.username}$`, 'i') } }
      ]
    },
    {
      $setOnInsert: {
        tgId: ctx.from.id,
        isAdmin: false,
        isBlocked: false
      },
      $set: {
        tgUsername: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name || ''
      }
    },
    {
      upsert: true,
      new: true
    }
  )

  if (user.isBlocked) {
    return ctx.reply('🚫 You are blocked from using this service.')
  }

  const message = ctx.message
  const isSetPincodeCommand = Boolean(
    message &&
      'text' in message &&
      /^\/setpincode(?:@\w+)?(?:\s|$)/.test(message.text)
  )

  let amul = new AmulApi()
  if (user.pincode) {
    try {
      amul = await getOrCreateAmulApi(user.pincode)
    } catch (err) {
      console.error(
        `Unable to initialize Amul session for user ${user._id}:`,
        err
      )

      if (!isSetPincodeCommand) {
        if (isCloudflareChallengeError(err)) {
          const retryAt = getAmulCloudflareRetryAt()
          const retryMessage = retryAt
            ? ` Please try again after ${retryAt.toISOString()}.`
            : ' Please try again shortly.'
          return ctx.reply(
            `${emojis.warning} Amul is temporarily blocking requests from the bot.${retryMessage}`
          )
        }

        return ctx.reply(
          `${emojis.warning} Unable to connect to Amul right now. Please try again shortly.`
        )
      }
    }
  }

  // ctx.user = user
  Object.assign<
    typeof ctx,
    { user: HydratedUser; trackedProducts: HydratedProduct[]; amul: AmulApi }
  >(ctx, {
    user,
    trackedProducts: await ProductModel.find({
      trackedBy: user._id
    }).sort({
      createdAt: -1
    }),
    amul
  })

  const loggedIn = isLoggedIn(user)
  if (loggedIn) {
    ctx.amul.injectCookies(user.cookies)
  }

  return next()
}
