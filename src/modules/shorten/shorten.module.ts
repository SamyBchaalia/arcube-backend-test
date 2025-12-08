import { Module } from '@nestjs/common';
import { ShortenController } from './controllers/shorten.controller';
import { ShortenService } from './services/shorten.service';

@Module({
  controllers: [ShortenController],
  providers: [ShortenService],
})
export class ShortenModule {}
