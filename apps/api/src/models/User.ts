import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password?: string;
  provider: 'local' | 'google' | 'github';
  providerId?: string;
  displayName: string;
  avatarUrl?: string;
  plan: 'free' | 'pro';
  usage: {
    generationsUsed: number;
    generationsLimit: number;
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
    usage: {
      generationsUsed: { type: Number, default: 0 },
      generationsLimit: { type: Number, default: 5 },
    },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
