import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { ContactController } from './controllers/contact.controller';

@Module({
  imports: [EmailModule],
  controllers: [ContactController],
})
export class ContactModule {}
