import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  userId: string;
  title: string;
  description: string;
  readmeContent: string;
  tokensUsed?: number;
  modelId?: string;
  executionMode?: 'platform' | 'byok';
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true },
    description: { type: String, required: false },
    readmeContent: { type: String, required: true },
    tokensUsed: { type: Number, required: false },
    modelId: { type: String, required: false },
    executionMode: { type: String, enum: ['platform', 'byok'], required: false },
  },
  { timestamps: true }
);

export default mongoose.model<IProject>('Project', ProjectSchema);
