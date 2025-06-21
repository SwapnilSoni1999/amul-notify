import { MiddlewareFn } from 'telegraf'
import UserModel, { HydratedUser } from '@/models/user.model'
import { MyContext } from '@/types/context.types'
import ProductModel, { HydratedProduct } from '@/models/product.model'
import { AmulApi, getOrCreateAmulApi } from '@/libs/amulApi.lib'

export const sessionMiddleware: MiddlewareFn<MyContext> = async (ctx, next) => {
  if (!ctx.from) {
    return ctx.reply('❌ Unable to identify user.')
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
    amul: await getOrCreateAmulApi(user.pincode) // Note: pincode should be set before this middleware is called (exception for /setpincode)
  })

  return next()
}
