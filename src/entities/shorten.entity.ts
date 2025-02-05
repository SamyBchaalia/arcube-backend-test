// import { SchemaFactory, Schema, Prop } from '@nestjs/mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Shorten extends Document {
  @Prop({ type: String, required: true })
  originalUrl: string;

  @Prop({ required: true, unique: true })
  shortId: string;

  @Prop({ required: true })
  qrCode: string;

  @Prop({ default: 0 })
  clicks: number;

  @Prop({ required: true })
  createdAt: Date;
}

export const ShortenSchema = SchemaFactory.createForClass(Shorten);
