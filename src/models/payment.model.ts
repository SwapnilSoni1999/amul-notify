import {
  HydratedDocumentFromSchema,
  InferSchemaType,
  Schema,
  model
} from 'mongoose'

const PaymentSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    tgId: {
      type: Number,
      required: false,
      index: true
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      required: true,
      default: 'INR'
    },
    status: {
      type: String,
      enum: ['created', 'paid', 'expired', 'cancelled', 'partially_paid'],
      required: true,
      default: 'created',
      index: true
    },
    referenceId: {
      type: String,
      required: true,
      unique: true
    },
    razorpayPaymentLinkId: {
      type: String,
      required: true,
      unique: true
    },
    razorpayPaymentId: {
      type: String,
      required: false,
      unique: true,
      sparse: true
    },
    shortUrl: {
      type: String,
      required: true
    },
    paidAt: {
      type: Date,
      required: false
    },
    validUntil: {
      type: Date,
      required: false,
      index: true
    },
    expiredNotifiedAt: {
      type: Date,
      required: false
    },
    callbackPayload: {
      type: Schema.Types.Mixed,
      required: false
    }
  },
  {
    timestamps: true
  }
)

PaymentSchema.index({ user: 1, status: 1, validUntil: 1 })

const PaymentModel = model<IPayment>('Payment', PaymentSchema, 'payments')

export type HydratedPayment = HydratedDocumentFromSchema<typeof PaymentSchema>
export type IPayment = InferSchemaType<typeof PaymentSchema>

export default PaymentModel
