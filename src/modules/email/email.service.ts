import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<boolean>('SMTP_SECURE') === true,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
    });
  }

  async sendContactFormEmail(formData: {
    name: string;
    email: string;
    subject?: string;
    message: string;
    [key: string]: any;
  }): Promise<void> {
    try {
      const recipientEmail = this.configService.get<string>('CONTACT_EMAIL');

      // Build email content from form data
      const emailContent = this.buildEmailContent(formData);

      const mailOptions = {
        from: this.configService.get<string>('SMTP_FROM'),
        to: recipientEmail,
        subject: formData.subject || 'New Contact Form Submission',
        html: emailContent,
        replyTo: formData.email,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw new Error('Failed to send email');
    }
  }

  private buildEmailContent(formData: any): string {
    let html = '<h2>New Contact Form Submission</h2>';
    html += '<table style="border-collapse: collapse; width: 100%;">';

    // Iterate through all form fields
    for (const [key, value] of Object.entries(formData)) {
      if (value) {
        const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
        html += `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">${label}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${value}</td>
          </tr>
        `;
      }
    }

    html += '</table>';
    return html;
  }
}
