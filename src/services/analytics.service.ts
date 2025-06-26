import ProductModel from '@/models/product.model'
import { SubstoreSkuCount } from '@/types/analytics.types'

export const getSkusWithSubstoresCountSorted = async (): Promise<
  SubstoreSkuCount[]
> => {
  const results = await ProductModel.aggregate<SubstoreSkuCount>([
    // 1) bring in the user to get substore
    {
      $lookup: {
        from: 'users',
        localField: 'trackedBy',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },

    // 2) count each (substore, sku)
    {
      $group: {
        _id: {
          substore: '$user.substore',
          sku: '$sku'
        },
        count: { $sum: 1 }
      }
    },

    // 3) sort by substore asc, then count desc → ensures pushes in order
    {
      $sort: {
        '_id.substore': 1,
        count: -1
      }
    },

    // 4) regroup by substore, pushing skus in sorted order & sum up total
    {
      $group: {
        _id: '$_id.substore',
        skus: {
          $push: {
            sku: '$_id.sku',
            count: '$count'
          }
        },
        total: { $sum: '$count' }
      }
    },

    // 5) format output and sort substores by total desc
    {
      $project: {
        _id: 0,
        substore: '$_id',
        total: 1,
        skus: 1
      }
    },
    { $sort: { total: -1 } }
  ])

  return results
}
