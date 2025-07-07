import {
  HydratedDocumentFromSchema,
  InferSchemaType,
  Schema,
  model
} from 'mongoose'
import ProductModel from './product.model'

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
    }
  },
  {
    timestamps: true
  }
)

// Cascade delete for related documents
UserSchema.pre('deleteOne', async function (next) {
  const userId = this.getQuery()._id
  await ProductModel.deleteMany({ userId }).exec()
  next()
})

const UserModel = model<IUser>('User', UserSchema, 'users')

export type HydratedUser = HydratedDocumentFromSchema<typeof UserSchema>
export type IUser = InferSchemaType<typeof UserSchema>

export default UserModel
