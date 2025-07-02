import ProductModel from '@/models/product.model'
import { CommandContext } from '@/types/context.types'
import { MiddlewareFn } from 'telegraf'

interface SkuCount {
  sku: string
  count: number
}

export const productCountCommand: MiddlewareFn<CommandContext> = async (
  ctx,
  next
) => {
  const results = await ProductModel.aggregate<SkuCount>([
    // 1) Group all documents by sku, summing 1 per document
    {
      $group: {
        _id: '$sku',
        count: { $sum: 1 }
      }
    },
    // 2) Project into a nice shape
    {
      $project: {
        _id: 0,
        sku: '$_id',
        count: 1
      }
    },
    // 3) (Optional) Sort by count descending
    {
      $sort: { count: -1 }
    }
  ])

  const products = await ctx.amul.getProteinProducts()

  const message = results
    .map(
      (item, index) =>
        `${index + 1}. <u>${
          products.find((p) => p.sku === item.sku)?.name
        }</u> <b>(${item.count})</b>`
    )
    .join('\n')

  if (message.length === 0) {
    ctx.reply('No products found.')
    return next()
  }

  ctx.reply(`<b>Product Count</b>\n\n${message}`, { parse_mode: 'HTML' })
  return next()
}
