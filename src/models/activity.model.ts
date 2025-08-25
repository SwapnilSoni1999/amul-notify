import { model, Schema } from 'mongoose'

const ActivitySchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      ref: 'User',
      index: true // Index for faster lookups
    },
    dayKey: {
      type: String,
      required: true,
      index: true // Index for faster lookups
    },
    day: {
      type: Date,
      required: true,
      index: true // Index for faster lookups
    }
  },
  {
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: false
    }
  }
)

ActivitySchema.index({ dayKey: 1, userId: 1 }, { unique: true })
ActivitySchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 90 }
) // 90d

const ActivityModel = model('Activity', ActivitySchema, 'activities')

export default ActivityModel
