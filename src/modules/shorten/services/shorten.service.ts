import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as shortid from 'shortid';
import { Shorten } from 'src/entities/shorten.entity';
import * as QRCode from 'qrcode';
import Anthropic from '@anthropic-ai/sdk';
import { TextBlock } from '@anthropic-ai/sdk/resources';

@Injectable()
export class ShortenService {
  constructor(@InjectModel(Shorten.name) private urlModel: Model<Shorten>) {}

  async shortenUrl(originalUrl: string): Promise<Shorten | null> {
    try {
      const shortId: string = shortid.generate();
      const qrCode: string = await QRCode.toDataURL(
        `${process.env.APP_URL}/api/shorten/${shortId}`,
      );
      const doc = await this.urlModel.create({
        originalUrl,
        shortId,
        qrCode,
        createdAt: new Date(),
      });
      return this.urlModel.findById(doc._id);
    } catch (error) {
      Logger.error(error);
      throw new Error('Short URL not found');
    }
  }

  async getOriginalUrl(shortId: string): Promise<string> {
    const url = await this.urlModel.findOne({ shortId });
    if (!url) {
      throw new NotFoundException('Short URL not found');
    }
    await this.urlModel.updateOne({ _id: url._id }, { clicks: url.clicks + 1 });
    return url.originalUrl;
  }
  async getShortenedUrls(ids: string[]): Promise<Shorten[]> {
    //order by creation date
    return await this.urlModel.find({ _id: { $in: ids } }).sort({
      createdAt: -1,
    });
  }
  async proxyChatBot(
    messages: { role: 'user' | 'assistant'; content: string }[],
  ) {
    try {
      const anthropic: Anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
        dangerouslyAllowBrowser: true,
      });
      const msg = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: messages,
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return msg.content.map((el: TextBlock) => {
        return el.text;
      });
    } catch (error) {
      return { error: error.response?.data || 'API request failed' };
    }
  }
}
