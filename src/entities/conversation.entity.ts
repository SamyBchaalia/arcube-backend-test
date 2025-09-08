import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

@Schema()
export class Conversation extends Document {
  @Prop({ required: true, unique: true })
  sessionId: string;

  @Prop({ type: [{ role: String, content: String, timestamp: Date }], default: [] })
  messages: Message[];

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ updatedAt: -1 });
ConversationSchema.index({ sessionId: 1 });