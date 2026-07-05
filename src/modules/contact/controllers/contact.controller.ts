import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EmailService } from '../../email/services/email.service';
import { ContactDto } from '../dto/contact.dto';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly emailService: EmailService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a contact request' })
  async contact(@Body() body: ContactDto): Promise<{ message: string }> {
    await this.emailService.sendContactEmails(body);
    return { message: 'Your request has been received. We will be in touch shortly.' };
  }
}
