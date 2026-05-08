import {
  HydratedDocumentFromSchema,
  InferSchemaType,
  Schema,
  model
} from 'mongoose'

const AddressRecordSchema = new Schema({
  amulId: {
    type: String,
    required: true,
    unique: true
  },
  full_name: {
    type: String
  },
  address: {
    type: String
  },
  city: {
    type: String
  },
  state: {
    type: String
  },
  zip: {
    type: String
  },
  phone: {
    type: String
  }
})

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

const OrderSettingsSchema = new Schema(
  {
    enabled: {
      type: Boolean,
      default: false
    },
    permitted: {
      type: Boolean,
      default: false
    },
    skus: [
      {
        type: String,
        default: [],
        index: true
      }
    ]
  },
  {
    timestamps: false
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
    ],
    orderSettings: {
      type: OrderSettingsSchema,
      default: () => ({
        enabled: false,
        permitted: true,
        skus: []
      })
    },
    phone: {
      type: String,
      required: false,
      unique: true,
      sparse: true // Allows multiple with null phone
    },
    cookies: [
      {
        key: {
          type: String,
          required: true
        },
        value: {
          type: String,
          required: true
        },
        domain: {
          type: String,
          required: false
        },
        path: {
          type: String,
          required: false
        },
        expiresAt: {
          type: Date,
          required: false
        },
        ttlSeconds: {
          type: Number,
          required: false
        },
        isSession: {
          type: Boolean,
          required: false
        },
        isExpired: {
          type: Boolean,
          required: false
        }
      }
    ],
    amulUserId: {
      type: String,
      required: false
    },
    amulCartId: {
      type: String,
      required: false
    },
    address: {
      type: AddressRecordSchema,
      required: false
    }
  },
  {
    timestamps: true
  }
)

const UserModel = model<IUser>('User', UserSchema, 'users')

export type HydratedUser = HydratedDocumentFromSchema<typeof UserSchema>
export type IUser = InferSchemaType<typeof UserSchema>

export default UserModel
