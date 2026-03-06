import {
  Controller,
  Post,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StripePaymentService } from '../services/stripe-payment.service';
import { PayPalPaymentService } from '../services/paypal-payment.service';
import { Request } from 'express';

@ApiTags('Payment Webhooks')
@Controller('webhooks')
export class PaymentWebhooksController {
  private readonly logger = new Logger(PaymentWebhooksController.name);

  constructor(
    private stripePaymentService: StripePaymentService,
    private paypalPaymentService: PayPalPaymentService,
  ) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    this.logger.log('[handleStripeWebhook] Received webhook');

    if (!signature) {
      this.logger.error('[handleStripeWebhook] Missing stripe-signature header');
      return { error: 'Missing stripe-signature header' };
    }

    // Get raw body for signature verification
    const rawBody = req.rawBody;
    if (!rawBody) {
      this.logger.error('[handleStripeWebhook] Missing raw body');
      return { error: 'Missing raw body' };
    }

    const result = await this.stripePaymentService.handleWebhook(
      signature,
      rawBody,
    );

    this.logger.log(
      `[handleStripeWebhook] Webhook processed: ${JSON.stringify(result)}`,
    );

    return { received: true, ...result };
  }

  @Post('paypal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle PayPal webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handlePayPalWebhook(
    @Headers() headers: Record<string, string>,
    @Req() req: Request,
  ) {
    this.logger.log('[handlePayPalWebhook] Received webhook');

    const result = await this.paypalPaymentService.handleWebhook(
      headers,
      req.body,
    );

    this.logger.log(
      `[handlePayPalWebhook] Webhook processed: ${JSON.stringify(result)}`,
    );

    return { received: true, ...result };
  }
}
