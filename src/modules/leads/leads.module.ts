import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { Lead } from './entities/lead.entity';
import { ChatSession } from '../chat-history/entities/chat-session.entity';
import { LeadsService } from './services/leads.service';
import { AdminLeadsController } from './controllers/admin-leads.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lead, ChatSession]),
    PassportModule,
    AuthModule,
  ],
  controllers: [AdminLeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
