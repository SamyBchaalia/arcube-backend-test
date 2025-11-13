import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmailService } from './email.service';
import { ContactFormDto } from './dto/contact-form.dto';

@ApiTags('email')
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('contact')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send contact form email' })
  @ApiResponse({
    status: 200,
    description: 'Email sent successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid form data',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to send email',
  })
  async sendContactForm(@Body() contactFormDto: ContactFormDto) {
    await this.emailService.sendContactFormEmail(contactFormDto);
    return {
      success: true,
      message: 'Email sent successfully',
    };
  }
}
