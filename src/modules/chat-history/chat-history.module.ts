import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { ChatSession } from './entities/chat-session.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatHistoryService } from './services/chat-history.service';
import { ChatHistoryController } from './controllers/chat-history.controller';
import { AdminChatHistoryController } from './controllers/admin-chat-history.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatSession, ChatMessage]),
    PassportModule,
    AuthModule,
  ],
  controllers: [ChatHistoryController, AdminChatHistoryController],
  providers: [ChatHistoryService],
  exports: [ChatHistoryService],
})
export class ChatHistoryModule {}
