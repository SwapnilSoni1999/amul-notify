import ProductModel from '@/models/product.model'
import { MyContext } from '@/types/context.types'
import { emojis } from '@/utils/emoji.util'

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
