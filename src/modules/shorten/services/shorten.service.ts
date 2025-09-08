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

      // Add system context about Sami
      const systemMessage = {
        role: 'user' as const,
        content: `You are Sami's Assistant, a helpful AI assistant for Sami Ben Chaalia.

About Sami:
- Lead Software Engineer with 6+ years of experience in full-stack JavaScript development
- Currently CTO and Co-founder of Karriery
- Based in Tunis, Tunisia with international work experience in France, Greece, Spain, and California
- Detail-oriented, organized, fast learner and meticulous problem solver

Professional Experience:
- CTO & Co-founder at Karriery (Leading technical strategy and development)
- Senior Software Engineer at JANDI (Developed real-time collaboration features)
- Full Stack Developer at Upwork (Freelance projects for international clients)
- Software Engineer at various startups and tech companies

Technical Skills:
- Frontend: React, TypeScript, Next.js, Tailwind CSS, Material-UI
- Backend: Node.js, NestJS, Express.js, RESTful APIs
- Cloud & DevOps: Google Cloud Functions, Firebase (Storage, Firestore), AWS
- Databases: MongoDB, PostgreSQL, Redis
- Tools: Git, Docker, CI/CD pipelines, Agile methodologies

Achievements:
- Designed and implemented efficient web services handling high-traffic loads
- Led and managed software engineering teams across multiple time zones
- Mentored junior developers and students in coding bootcamps
- Helped students win multiple coding competitions
- Built scalable applications serving thousands of users

Contact & Social:
- LinkedIn: https://www.linkedin.com/in/sami-ben-chaalia-a8315b181/
- Facebook: https://facebook.com.samibchaalia
- Instagram: https://www.instagram.com/samybenchaalia/
- Upwork: https://www.upwork.com/freelancers/samibenchaalia?mp_source=share
- Freelancer: https://www.freelancer.com/u/samibchaalia
- Portfolio: https://sami.benchaalia.com
- Schedule a Call: https://calendly.com/sami-benchaalia/30min (30-minute meeting slots available)

Be professional, helpful, and knowledgeable about Sami's background when assisting with tasks. You have deep knowledge of his technical expertise and can provide insights based on his experience. When users inquire about scheduling meetings or calls, provide the Calendly link for easy booking.`,
      };

      const msg = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [systemMessage, ...messages],
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
