import { HydratedDocumentFromSchema, model, Schema } from 'mongoose'

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
    trackAlways: {
      type: Boolean,
      default: false,
      index: true // Index for faster lookups in job queries
    }
  },
  {
    timestamps: true
  }
)

const ProductModel = model('Product', ProductSchema, 'products')

export type HydratedProduct = HydratedDocumentFromSchema<typeof ProductSchema>

export default ProductModel
