import {
  HydratedDocumentFromSchema,
  InferSchemaType,
  model,
  Schema
} from 'mongoose'

const ProductSchema = new Schema(
  {
    sku: {
      type: String,
      required: true,
      index: true // Index for faster lookups
    },
    trackedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    remainingNotifyCount: {
      type: Number,
      default: 1 // Default to 1 notification
    }
  },
  {
    timestamps: true
  }
)

const ProductModel = model('Product', ProductSchema, 'products')

export type HydratedProduct = HydratedDocumentFromSchema<typeof ProductSchema>

export type IProduct = InferSchemaType<typeof ProductSchema>

export default ProductModel
