import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../auth/entities/user.entity';
import { OrderStatus } from '../../orders/enums/order-status.enum';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private appUrl: string;

  constructor(private configService: ConfigService) {
    this.appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });

    Logger.log('[EmailService] Email service initialized');
  }

  async sendPurchaseConfirmation(user: User, order: Order): Promise<void> {
    try {
      Logger.log(`[sendPurchaseConfirmation] Sending purchase confirmation to ${user.email}`);

      const templatePath = join(__dirname, '../templates/purchase-confirmation.hbs');
      const templateSource = readFileSync(templatePath, 'utf8');
      const template = handlebars.compile(templateSource);

      // Prepare products with download links
      const products: Array<{
        name: string;
        downloadLink: string;
        contentLink: string;
        hasFile: boolean;
      }> = [];
      for (const item of order.items) {
        if (item.product) {
          products.push({
            name: item.itemName,
            downloadLink: `${this.appUrl}/api/products/${item.product.id}/download`,
            contentLink: `${this.appUrl}/api/products/${item.product.id}/content`,
            hasFile: !!item.product.fileUrl,
          });
        } else if (item.package) {
          // Add all products from the package
          for (const product of item.package.products) {
            products.push({
              name: product.name,
              downloadLink: `${this.appUrl}/api/products/${product.id}/download`,
              contentLink: `${this.appUrl}/api/products/${product.id}/content`,
              hasFile: !!product.fileUrl,
            });
          }
        }
      }

      const html = template({
        userName: user.name,
        orderNumber: order.orderNumber,
        products,
        total: Number(order.total).toFixed(2),
        appUrl: this.appUrl,
        appName: this.configService.get<string>('APP_NAME', 'NBV Sales Tools'),
      });

      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM'),
        to: user.email,
        subject: `Order Confirmation - ${order.orderNumber}`,
        html,
      });

      Logger.log(`[sendPurchaseConfirmation] Email sent successfully to ${user.email}`);
    } catch (error) {
      Logger.error(`[sendPurchaseConfirmation] Failed to send email: ${error.message}`);
      // Don't throw error, just log it - we don't want email failures to break the order flow
    }
  }

  async sendOrderStatusUpdate(
    user: User,
    order: Order,
    newStatus: OrderStatus,
  ): Promise<void> {
    try {
      Logger.log(`[sendOrderStatusUpdate] Sending status update to ${user.email}`);

      const templatePath = join(__dirname, '../templates/order-status-update.hbs');
      const templateSource = readFileSync(templatePath, 'utf8');
      const template = handlebars.compile(templateSource);

      const html = template({
        userName: user.name,
        orderNumber: order.orderNumber,
        status: newStatus,
        statusMessage: this.getStatusMessage(newStatus),
        total: Number(order.total).toFixed(2),
        appUrl: this.appUrl,
        appName: this.configService.get<string>('APP_NAME', 'NBV Sales Tools'),
      });

      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM'),
        to: user.email,
        subject: `Order ${order.orderNumber} - Status Update`,
        html,
      });

      Logger.log(`[sendOrderStatusUpdate] Email sent successfully to ${user.email}`);
    } catch (error) {
      Logger.error(`[sendOrderStatusUpdate] Failed to send email: ${error.message}`);
    }
  }

  async sendGuestWelcomeEmail(
    email: string,
    firstName: string,
    lastName: string,
    tempPassword: string,
  ): Promise<void> {
    try {
      Logger.log(`[sendGuestWelcomeEmail] Sending welcome email to ${email}`);

      const templatePath = join(__dirname, '../templates/guest-welcome.hbs');
      const templateSource = readFileSync(templatePath, 'utf8');
      const template = handlebars.compile(templateSource);

      const html = template({
        firstName,
        lastName,
        email,
        tempPassword,
        loginUrl: `${this.appUrl}/login`,
        appUrl: this.appUrl,
      });

      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM'),
        to: email,
        subject: 'Welcome to NBV Group - Your Account Credentials',
        html,
      });

      Logger.log(`[sendGuestWelcomeEmail] Email sent successfully to ${email}`);
    } catch (error) {
      Logger.error(`[sendGuestWelcomeEmail] Failed to send email: ${error.message}`);
      // Don't throw error, just log it - we don't want email failures to break the chat flow
    }
  }

  async sendContactEmails(data: {
    name: string;
    email: string;
    budget: string;
    message: string;
  }): Promise<void> {
    const fromAddress = this.configService.get<string>('EMAIL_FROM_ADDRESS') as string;
    const fromName = this.configService.get<string>('EMAIL_FROM_NAME') ?? 'No-Reply';
    const from = `"${fromName}" <${fromAddress}>`;
    const adminEmail = (this.configService.get<string>('CONTACT_RECIPIENT') ?? fromAddress) as string;

    const clientHtml = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a2e;">Thank you for reaching out, ${data.name}.</h2>
          <p>Your message has been received. Sami will review your inquiry and get back to you as soon as possible, typically within 1–2 business days.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 13px; color: #777;"><strong>Your submission summary:</strong></p>
          <table style="font-size: 13px; color: #555; border-collapse: collapse; width: 100%;">
            <tr><td style="padding: 6px 0; font-weight: bold; width: 100px;">Name</td><td>${data.name}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold;">Email</td><td>${data.email}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold;">Budget</td><td>${data.budget}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; vertical-align: top;">Message</td><td>${data.message}</td></tr>
          </table>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 12px; color: #aaa;">This is an automated confirmation. Please do not reply directly to this email.</p>
        </body>
      </html>
    `;

    const adminHtml = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a2e;">New Contact Request</h2>
          <p>You have received a new inquiry through your contact form.</p>
          <table style="font-size: 14px; color: #555; border-collapse: collapse; width: 100%;">
            <tr><td style="padding: 8px 0; font-weight: bold; width: 100px;">Name</td><td>${data.name}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Email</td><td><a href="mailto:${data.email}">${data.email}</a></td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Budget</td><td>${data.budget}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Message</td><td>${data.message}</td></tr>
          </table>
        </body>
      </html>
    `;

    await Promise.all([
      this.transporter.sendMail({
        from,
        to: data.email,
        subject: 'We received your request — Sami will be in touch shortly',
        html: clientHtml,
      }),
      this.transporter.sendMail({
        from,
        to: adminEmail,
        subject: `New Contact Request from ${data.name}`,
        html: adminHtml,
      }),
    ]);

    Logger.log(`[sendContactEmails] Emails sent for contact request from ${data.email}`);
  }

  private getStatusMessage(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.COMPLETED:
        return 'Your order has been completed successfully!';
      case OrderStatus.CANCELLED:
        return 'Your order has been cancelled.';
      case OrderStatus.REFUNDED:
        return 'Your order has been refunded.';
      case OrderStatus.PENDING:
        return 'Your order is pending.';
      default:
        return 'Your order status has been updated.';
    }
  }
}
