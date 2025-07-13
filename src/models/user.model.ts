import {
  HydratedDocumentFromSchema,
  InferSchemaType,
  Schema,
  model
} from 'mongoose'

const UserSettingsSchema = new Schema(
  {
    trackingStyle: {
      type: String,
      enum: ['once', 'always']
    },
    maxNotifyCount: {
      // Maximum number of notifications to show per tracked product
      type: Number,
      default: 3,
      min: 1, // At least one notification
      max: 100 // Arbitrary upper limit
    }
  },
  {
    _id: false, // Prevents creation of a separate collection for settings
    timestamps: false // No need for timestamps in settings
  }
)

const UserSchema = new Schema(
  {
    tgUsername: {
      type: String,
      required: false,
      unique: true,
      sparse: true // Allows multiple users without username
    },
    tgId: {
      type: Number,
      required: false,
      unique: true,
      sparse: true // Allows multiple users without username
    },
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String,
      required: false
    },
    isBlocked: {
      type: Boolean,
      default: false
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    pincode: {
      type: String,
      required: false,
      index: true // Index for faster lookups
    },
    substore: {
      type: String,
      required: false,
      index: true // Index for faster lookups
    },
    settings: {
      type: UserSettingsSchema,
      default: () => ({
        trackingStyle: 'once', // Default tracking style
        maxNotifyCount: 3 // Default maximum notifications
      })
    },
    favSkus: [
      {
        type: String,
        required: false,
        default: []
      }
    ]
  },
  {
    timestamps: true
  }
)

const UserModel = model<IUser>('User', UserSchema, 'users')

export type HydratedUser = HydratedDocumentFromSchema<typeof UserSchema>
export type IUser = InferSchemaType<typeof UserSchema>

export default UserModel
