import { HydratedDocument, InferSchemaType, model, Schema } from 'mongoose'

const GeometrySchema = new Schema(
  {
    type: {
      type: String,
      enum: ['Polygon', 'MultiPolygon'],
      required: true
    },
    // Use Mixed or a raw Array — because Polygon is [[[number]]], MultiPolygon is [[[[number]]]]
    coordinates: {
      type: Schema.Types.Mixed,
      required: true
    }
  },
  { _id: false }
)

const BoundarySchema = new Schema(
  {
    // GeoJSON Feature wrapper
    type: { type: String, default: 'Feature', enum: ['Feature'] },

    properties: {
      Pincode: { type: String, required: true },
      Office_Name: { type: String },
      Division: { type: String },
      Region: { type: String },
      Circle: { type: String }
    },

    geometry: { type: GeometrySchema, required: true }
  },
  { versionKey: false }
)

// Fast lookups & spatial queries
BoundarySchema.index({ 'properties.Pincode': 1 }, { unique: true })
BoundarySchema.index({ geometry: '2dsphere' })

export type IBoundary = InferSchemaType<typeof BoundarySchema>
export type HydratedBoundary = HydratedDocument<IBoundary>
const BoundaryModel = model<IBoundary>('Boundary', BoundarySchema, 'boundaries')

export default BoundaryModel
