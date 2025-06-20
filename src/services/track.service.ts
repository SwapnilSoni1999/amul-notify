import ProductModel from '@/models/product.model'
import { MyContext } from '@/types/context.types'
import amulService from './amul.service'

export const untrackProduct = async (ctx: MyContext, sku: string) => {
  const existingProduct = await ProductModel.findOneAndDelete({
    sku,
    trackedBy: ctx.user._id
  })

  const products = await amulService.getProteinProducts()
  const product = products.find((p) => p.sku === sku)

  if (!existingProduct) {
    return ctx.reply(
      `❌ You are not tracking the product: <b>${product?.name}</b>`,
      { parse_mode: 'HTML' }
    )
  }
  ctx.trackedProducts = ctx.trackedProducts.filter((p) => p.sku !== sku)

  return ctx.reply(
    `🔍 <b>Untracking product: ${product?.name}</b>\n` +
      `You will no longer receive updates for this product.`,
    { parse_mode: 'HTML' }
  )
}

export const trackProduct = async (ctx: MyContext, sku: string) => {
  const existingProduct = await ProductModel.findOne({
    sku,
    trackedBy: ctx.user._id
  })

  const products = await amulService.getProteinProducts()
  const product = products.find((p) => p.sku === sku)!

  if (existingProduct) {
    return ctx.reply(
      `✅ You are already tracking the product: <b>${product?.name}</b>`,
      { parse_mode: 'HTML' }
    )
  }

  const newProduct = await ProductModel.create({
    sku,
    trackedBy: ctx.user._id
  })

  ctx.trackedProducts.push(newProduct)

  return ctx.reply(
    `🔍 <b>Tracking product: ${product.name}</b>\n` +
      `You will receive updates when the product is available.`,
    { parse_mode: 'HTML' }
  )
}
