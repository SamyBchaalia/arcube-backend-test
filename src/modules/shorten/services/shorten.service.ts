import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as shortid from 'shortid';
import { Shorten } from 'src/entities/shorten.entity';
import * as QRCode from 'qrcode';

@Injectable()
export class ShortenService {
  constructor(@InjectModel(Shorten.name) private urlModel: Model<Shorten>) {}

  async shortenUrl(originalUrl: string): Promise<Shorten | null> {
    try {
      const shortId: string = shortid.generate();
      const qrCode: string = await QRCode.toDataURL(shortId);
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
}
