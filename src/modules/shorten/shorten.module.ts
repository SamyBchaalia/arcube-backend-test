import { Module } from '@nestjs/common';
import { ShortenController } from './controllers/shorten.controller';
import { ShortenService } from './services/shorten.service';
import { ChatHistoryModule } from '../chat-history/chat-history.module';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [ChatHistoryModule, AuthModule, EmailModule],
  controllers: [ShortenController],
  providers: [ShortenService],
})
export class ShortenModule {}
