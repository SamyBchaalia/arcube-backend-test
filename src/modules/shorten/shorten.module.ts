import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShortenSchema, Shorten } from '../../entities/shorten.entity';
import { ShortenController } from './controllers/shorten.controller';
import { ShortenService } from './services/shorten.service';
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Shorten.name, schema: ShortenSchema }]),
  ],
  controllers: [ShortenController],
  providers: [ShortenService],
})
export class ShortenModule {}
