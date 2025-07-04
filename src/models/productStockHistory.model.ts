import {
  HydratedDocumentFromSchema,
  InferSchemaType,
  Schema,
  model
} from 'mongoose'

const ProductStockHistorySchema = new Schema(
  {
    sku: {
      type: String,
      required: true,
      index: true // Index for faster lookups
    },
    substore: {
      type: String,
      required: true,
      index: true // Index for faster lookups
    },
    lastSeenInStockAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
)

ProductStockHistorySchema.index({ sku: 1, substore: 1 }, { unique: true })

const ProductStockHistoryModel = model(
  'ProductStockHistory',
  ProductStockHistorySchema,
  'product_stock_history'
)

export type IProductStockHistory = InferSchemaType<
  typeof ProductStockHistorySchema
>

export type HydratedProductStockHistory = HydratedDocumentFromSchema<
  typeof ProductStockHistorySchema
>

export default ProductStockHistoryModel
