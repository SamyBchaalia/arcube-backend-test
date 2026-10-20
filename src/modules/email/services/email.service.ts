import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../auth/entities/user.entity';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { Lead } from '../../leads/entities/lead.entity';

export interface LeadTranscriptMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export interface LeadNotificationData {
  lead: Lead;
  /** 3-5 line summary of the conversation, written for Lou. */
  summary: string;
  transcript: LeadTranscriptMessage[];
  /** Link to the session in the admin dashboard. */
  dashboardUrl: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleString('en-CA', {
    timeZone: 'America/Toronto',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

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

  /**
   * Notify Lou (and a copy to Sami) that a chatbot visitor asked to be contacted.
   * Retries once on failure and never throws: a mail failure must not break the chat reply.
   * Returns true when the email was accepted by the SMTP server.
   */
  async sendLeadNotification(data: LeadNotificationData): Promise<boolean> {
    const to = this.configService.get<string>('LEAD_NOTIFY_TO', 'lounatale@nbvgroup.ca');
    const cc =
      this.configService.get<string>('LEAD_NOTIFY_CC') ||
      this.configService.get<string>('CONTACT_RECIPIENT') ||
      undefined;
    const fromAddress =
      this.configService.get<string>('EMAIL_FROM_ADDRESS') ||
      this.configService.get<string>('SMTP_FROM') ||
      'no-reply@nbvgroup.ca';
    const fromName = this.configService.get<string>('EMAIL_FROM_NAME') ?? 'NBV Group Website';

    const mail: nodemailer.SendMailOptions = {
      from: `"${fromName}" <${fromAddress}>`,
      to,
      cc,
      replyTo: data.lead.email ?? undefined,
      subject: `Website lead: ${data.lead.name} wants to be contacted`,
      text: this.renderLeadNotificationText(data),
      html: this.renderLeadNotificationHtml(data),
    };

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await this.transporter.sendMail(mail);
        Logger.log(`[sendLeadNotification] Lead email sent to ${to}${cc ? ` (cc ${cc})` : ''} for lead ${data.lead.id}`);
        return true;
      } catch (error) {
        Logger.error(
          `[sendLeadNotification] Attempt ${attempt} failed for lead ${data.lead.id}: ${error?.message ?? error}`,
        );
        if (attempt === 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
    }
    Logger.error(`[sendLeadNotification] Giving up on lead ${data.lead.id}; lead is stored and visible in the dashboard`);
    return false;
  }

  private renderLeadNotificationText(data: LeadNotificationData): string {
    const { lead } = data;
    const lines = [
      `Name: ${lead.name}`,
      `Phone: ${lead.phone ?? '-'}${lead.phoneE164 && lead.phoneE164 !== lead.phone ? ` (${lead.phoneE164})` : ''}`,
      `Email: ${lead.email ?? '-'}`,
      `Preferred method: ${lead.preferredMethod}`,
      `Best time: ${lead.bestTime ?? '-'}`,
      `Topic: ${lead.topic ?? '-'}`,
      `Page: ${lead.pagePath ? `https://nbvgroup.ca${lead.pagePath}` : '-'}`,
      `Time: ${formatTime(lead.createdAt)}`,
      `Dashboard: ${data.dashboardUrl}`,
      '',
      'Conversation summary:',
      data.summary || '-',
      '',
      'Full transcript:',
      ...data.transcript.map((m) => `[${formatTime(m.createdAt)}] ${m.role === 'user' ? 'Visitor' : 'Assistant'}: ${m.content}`),
    ];
    return lines.join('\n');
  }

  private renderLeadNotificationHtml(data: LeadNotificationData): string {
    const { lead } = data;
    const e = escapeHtml;
    const phoneCell = lead.phone
      ? `<a href="tel:${e(lead.phoneE164 ?? lead.phone.replace(/[^\d+]/g, ''))}">${e(lead.phone)}</a>${
          lead.phoneE164 && lead.phoneE164 !== lead.phone ? ` <span style="color:#888">(${e(lead.phoneE164)})</span>` : ''
        }`
      : '-';
    const emailCell = lead.email ? `<a href="mailto:${e(lead.email)}">${e(lead.email)}</a>` : '-';
    const pageCell = lead.pagePath
      ? `<a href="https://nbvgroup.ca${e(lead.pagePath)}">${e(lead.pagePath)}</a>`
      : '-';
    const row = (label: string, value: string) =>
      `<tr><td style="padding:6px 12px 6px 0;font-weight:bold;white-space:nowrap;vertical-align:top;">${label}</td><td style="padding:6px 0;">${value}</td></tr>`;

    const summaryHtml = e(data.summary || '-').replace(/\n/g, '<br/>');
    const transcriptHtml = data.transcript
      .map((m) => {
        const isUser = m.role === 'user';
        return `<div style="margin:0 0 12px 0;padding:10px 12px;border-radius:8px;background:${isUser ? '#eef3ff' : '#f6f6f6'};">
            <div style="font-size:12px;color:#666;margin-bottom:4px;"><strong>${isUser ? 'Visitor' : 'Assistant'}</strong> &middot; ${e(formatTime(m.createdAt))}</div>
            <div style="white-space:pre-wrap;">${e(m.content)}</div>
          </div>`;
      })
      .join('');

    return `<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; color: #333; max-width: 680px; margin: 0 auto; padding: 20px;">
    <h2 style="color:#1a1a2e;margin-bottom:4px;">${e(lead.name)} wants to be contacted</h2>
    <p style="margin-top:0;color:#666;">New lead from the nbvgroup.ca chatbot.</p>
    <table style="font-size:14px;border-collapse:collapse;">
      ${row('Name', e(lead.name))}
      ${row('Phone', phoneCell)}
      ${row('Email', emailCell)}
      ${row('Preferred method', e(lead.preferredMethod))}
      ${row('Best time', e(lead.bestTime ?? '-'))}
      ${row('Topic', e(lead.topic ?? '-'))}
      ${row('Page', pageCell)}
      ${row('Time', e(formatTime(lead.createdAt)))}
      ${row('Dashboard', `<a href="${e(data.dashboardUrl)}">Open this conversation</a>`)}
    </table>
    <h3 style="margin-top:24px;">Conversation summary</h3>
    <p>${summaryHtml}</p>
    <h3 style="margin-top:24px;">Full transcript</h3>
    ${transcriptHtml}
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
    <p style="font-size:12px;color:#aaa;">Lead id ${e(lead.id)} &middot; session ${e(lead.sessionId)}</p>
  </body>
</html>`;
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
