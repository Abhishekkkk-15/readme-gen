import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password?: string;
  provider: 'local' | 'google' | 'github';
  providerId?: string;
  displayName: string;
  avatarUrl?: string;
  plan: 'free' | 'pro';
  billing?: {
    provider?: 'razorpay';
    planCode?: 'pro-monthly' | 'pro-annual';
    subscriptionId?: string;
    subscriptionStatus?: string;
    customerId?: string;
    currentStartAt?: Date;
    currentEndAt?: Date;
    cancelAtCycleEnd?: boolean;
    lastWebhookEventId?: string;
  };
  apiKeys: {
    provider: string;
    key: string;
    lastUsed: string;
  }[];
  usage: {
    generationsUsed: number;
    generationsLimit: number;
    tokensUsed: number;
    tokensLimit: number;
    lastResetDate: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    provider: { type: String, enum: ['local', 'google', 'github'], default: 'local' },
    providerId: { type: String, required: false },
    displayName: { type: String, required: true },
    avatarUrl: { type: String, required: false },
    plan: { type: String, enum: ['free', 'pro'], default: 'free' },
    billing: {
      provider: { type: String, enum: ['razorpay'], required: false },
      planCode: { type: String, enum: ['pro-monthly', 'pro-annual'], required: false },
      subscriptionId: { type: String, required: false },
      subscriptionStatus: { type: String, required: false },
      customerId: { type: String, required: false },
      currentStartAt: { type: Date, required: false },
      currentEndAt: { type: Date, required: false },
      cancelAtCycleEnd: { type: Boolean, default: false },
      lastWebhookEventId: { type: String, required: false },
    },
    apiKeys: [
      {
        provider: { type: String },
        key: { type: String },
        lastUsed: { type: String },
      },
    ],
    usage: {
      generationsUsed: { type: Number, default: 0 },
      generationsLimit: { type: Number, default: 2 },
      tokensUsed: { type: Number, default: 0 },
      tokensLimit: { type: Number, default: 5000 },
      lastResetDate: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
