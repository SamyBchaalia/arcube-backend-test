import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { OrdersService } from '../../orders/services/orders.service';
import { Order } from '../../orders/entities/order.entity';

@Injectable()
export class StripePaymentService {
  private stripe: Stripe;
  private readonly logger = new Logger(StripePaymentService.name);

  constructor(
    private configService: ConfigService,
    private ordersService: OrdersService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-12-15.clover',
    });
  }

  async createCheckoutSession(
    order: Order,
    successUrl?: string,
    cancelUrl?: string,
  ): Promise<{ sessionId: string; url: string }> {
    this.logger.log(
      `[createCheckoutSession] Creating session for order ${order.id}`,
    );

    try {
      // Build line items from order items
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
        order.items.map((item) => ({
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(Number(item.price) * 100), // Convert to cents
            product_data: {
              name: item.itemName,
              description: `${item.itemType} - ${item.itemName}`,
            },
          },
          quantity: item.quantity,
        }));

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url:
          successUrl ||
          this.configService.get<string>('PAYMENT_SUCCESS_URL') ||
          'http://localhost:5173/payment/success',
        cancel_url:
          cancelUrl ||
          this.configService.get<string>('PAYMENT_CANCEL_URL') ||
          'http://localhost:5173/payment/cancel',
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
        },
        customer_email: order.user?.email,
      });

      this.logger.log(
        `[createCheckoutSession] Session created: ${session.id}`,
      );

      return {
        sessionId: session.id,
        url: session.url || '',
      };
    } catch (error) {
      this.logger.error(
        `[createCheckoutSession] Error creating session: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Failed to create payment session',
      );
    }
  }

  async handleWebhook(
    signature: string,
    payload: Buffer,
  ): Promise<{ success: boolean; orderId?: string }> {
    this.logger.log('[handleWebhook] Processing Stripe webhook');

    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (err) {
      this.logger.error(`[handleWebhook] Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`[handleWebhook] Event type: ${event.type}`);

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      const orderId = session.metadata?.orderId;
      const paymentIntentId = session.payment_intent as string;

      if (!orderId) {
        this.logger.error('[handleWebhook] No orderId in session metadata');
        throw new BadRequestException('Order ID not found in session metadata');
      }

      this.logger.log(
        `[handleWebhook] Payment successful for order ${orderId}`,
      );

      try {
        // Complete the order payment
        await this.ordersService.completeOrderPayment(
          orderId,
          paymentIntentId || session.id,
        );

        this.logger.log(
          `[handleWebhook] Order ${orderId} marked as completed`,
        );

        return {
          success: true,
          orderId,
        };
      } catch (error) {
        this.logger.error(
          `[handleWebhook] Error completing order: ${error.message}`,
        );
        // Don't throw - webhook should return 200 to avoid retries
        return {
          success: false,
          orderId,
        };
      }
    }

    // For other events, just acknowledge receipt
    return { success: true };
  }

  async retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    try {
      return await this.stripe.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      this.logger.error(
        `[retrieveSession] Error retrieving session: ${error.message}`,
      );
      throw new BadRequestException('Invalid session ID');
    }
  }
}
