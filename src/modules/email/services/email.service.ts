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
