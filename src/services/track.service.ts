import ProductModel, { HydratedProduct, IProduct } from '@/models/product.model'
import UserModel, { HydratedUser } from '@/models/user.model'
import { MyContext } from '@/types/context.types'
import { emojis } from '@/utils/emoji.util'
import { logToChannel } from '@/utils/logger.util'
import { AnyBulkWriteOperation } from 'mongoose'

export const toggleFavouriteProduct = async (ctx: MyContext, sku: string) => {
  const products = await ctx.amul.getProteinProducts()

  if (ctx.user.favSkus.includes(sku)) {
    ctx.user.favSkus = ctx.user.favSkus.filter((s) => s !== sku)
    await ctx.user.save()
    return ctx.reply(
      `${emojis.crossMark} <b>Removed from favourites:</b> ${
        products.find((p) => p.sku === sku)?.name || sku
      }`,
      { parse_mode: 'HTML' }
    )
  } else {
    ctx.user.favSkus.push(sku)
    await ctx.user.save()
    return ctx.reply(
      `${emojis.checkMark} <b>Added to favourites:</b> ${
        products.find((p) => p.sku === sku)?.name || sku
      }`,
      {
        parse_mode: 'HTML'
      }
    )
  }
}

export const untrackProduct = async (ctx: MyContext, sku: string) => {
  const existingProduct = await ProductModel.findOneAndDelete({
    sku,
    trackedBy: ctx.user._id
  })

  const products = await ctx.amul.getProteinProducts()
  const product = products.find((p) => p.sku === sku)

  if (!existingProduct) {
    return ctx.reply(
      `${emojis.crossMark} You are not tracking the product: <b>${product?.name}</b>`,
      { parse_mode: 'HTML' }
    )
  }
  ctx.trackedProducts = ctx.trackedProducts.filter((p) => p.sku !== sku)

  return ctx.reply(
    `${emojis.search} <b>Untracking product: ${product?.name}</b>\n` +
      `You will no longer receive updates for this product.`,
    { parse_mode: 'HTML' }
  )
}

export const trackProduct = async (ctx: MyContext, sku: string) => {
  const existingProduct = await ProductModel.findOne({
    sku,
    trackedBy: ctx.user._id
  })

  const products = await ctx.amul.getProteinProducts()
  const product = products.find((p) => p.sku === sku)!

  if (existingProduct) {
    return ctx.reply(
      `${emojis.checkMark} You are already tracking the product: <b>${product?.name}</b>`,
      { parse_mode: 'HTML' }
    )
  }

  const newProduct = await ProductModel.create({
    sku,
    trackedBy: ctx.user._id
  })

  ctx.trackedProducts.push(newProduct)

  return ctx.reply(
    `${emojis.search} <b>Tracking product: ${product.name}</b>\n` +
      `You will receive updates when the product is available.`,
    { parse_mode: 'HTML' }
  )
}

export const findAndUpdateProductsWithAlwaysTracking = async (sku: string) => {
  const products = await ProductModel.aggregate<
    HydratedProduct & { user: HydratedUser }
  >([
    {
      $match: { sku }
    },
    {
      $lookup: {
        from: UserModel.collection.name,
        localField: 'trackedBy',
        foreignField: '_id',
        as: 'user'
      }
    },
    // 2. Unwind the resulting array to get a single object
    { $unwind: '$user' },
    // 3. Keep only those where settings.trackingStyle is 'always'
    { $match: { 'user.settings.trackingStyle': 'always' } }
  ]).exec()

  const bulkOp = products.map<AnyBulkWriteOperation<IProduct>>((product) => ({
    updateOne: {
      filter: { _id: product._id },
      update: {
        $set: {
          remainingNotifyCount: product.user.settings.maxNotifyCount || 1
        }
      }
    }
  }))

  await ProductModel.bulkWrite(bulkOp).catch((err) => {
    console.error('Error updating remainingNotifyCount:', err)
    logToChannel(
      `${emojis.crossMark} Error updating remainingNotifyCount: ${
        err instanceof Error ? err.message : String(err)
      }`
    )
  })
}
