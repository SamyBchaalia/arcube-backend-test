import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as paypal from '@paypal/checkout-server-sdk';
import { OrdersService } from '../../orders/services/orders.service';
import { Order } from '../../orders/entities/order.entity';

@Injectable()
export class PayPalPaymentService {
  private client: paypal.core.PayPalHttpClient;
  private readonly logger = new Logger(PayPalPaymentService.name);

  constructor(
    private configService: ConfigService,
    private ordersService: OrdersService,
  ) {
    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET');
    const mode = this.configService.get<string>('PAYPAL_MODE') || 'sandbox';

    if (!clientId || !clientSecret) {
      throw new Error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be configured');
    }

    // Initialize PayPal environment
    const environment =
      mode === 'live'
        ? new paypal.core.LiveEnvironment(clientId, clientSecret)
        : new paypal.core.SandboxEnvironment(clientId, clientSecret);

    this.client = new paypal.core.PayPalHttpClient(environment);

    this.logger.log(`[PayPalPaymentService] Initialized in ${mode} mode`);
  }

  async createOrder(order: Order): Promise<{ orderId: string; approvalUrl: string }> {
    this.logger.log(`[createOrder] Creating PayPal order for ${order.id}`);

    try {
      // Build purchase units from order items
      const purchaseUnits = [
        {
          reference_id: order.id,
          custom_id: order.orderNumber,
          description: `Order ${order.orderNumber}`,
          amount: {
            currency_code: 'USD',
            value: Number(order.total).toFixed(2),
            breakdown: {
              item_total: {
                currency_code: 'USD',
                value: Number(order.subtotal).toFixed(2),
              },
              tax_total: {
                currency_code: 'USD',
                value: Number(order.tax).toFixed(2),
              },
            },
          },
          items: order.items.map((item) => ({
            name: item.itemName,
            description: `${item.itemType}`,
            unit_amount: {
              currency_code: 'USD',
              value: Number(item.price).toFixed(2),
            },
            quantity: item.quantity.toString(),
            category: 'DIGITAL_GOODS',
          })),
        },
      ];

      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer('return=representation');
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: purchaseUnits,
        application_context: {
          brand_name: this.configService.get<string>('APP_NAME') || 'NBV Sales Tools',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW',
          return_url:
            this.configService.get<string>('PAYMENT_SUCCESS_URL') ||
            'http://localhost:5173/payment/success',
          cancel_url:
            this.configService.get<string>('PAYMENT_CANCEL_URL') ||
            'http://localhost:5173/payment/cancel',
        },
      });

      const response = await this.client.execute(request);
      const paypalOrder = response.result;

      this.logger.log(`[createOrder] PayPal order created: ${paypalOrder.id}`);

      // Find approval URL
      const approvalUrl = paypalOrder.links?.find(
        (link) => link.rel === 'approve',
      )?.href;

      if (!approvalUrl) {
        throw new Error('Approval URL not found in PayPal response');
      }

      return {
        orderId: paypalOrder.id,
        approvalUrl,
      };
    } catch (error) {
      this.logger.error(`[createOrder] Error creating PayPal order: ${error.message}`);
      throw new InternalServerErrorException('Failed to create PayPal order');
    }
  }

  async captureOrder(
    paypalOrderId: string,
    internalOrderId: string,
  ): Promise<{ success: boolean; captureId: string }> {
    this.logger.log(`[captureOrder] Capturing PayPal order ${paypalOrderId}`);

    try {
      const request = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
      request.requestBody({});

      const response = await this.client.execute(request);
      const captureResult = response.result;

      if (captureResult.status === 'COMPLETED') {
        // Extract capture ID from the first purchase unit
        const captureId =
          captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.id || paypalOrderId;

        this.logger.log(
          `[captureOrder] PayPal order captured successfully: ${captureId}`,
        );

        // Complete the internal order
        await this.ordersService.completeOrderPayment(internalOrderId, captureId);

        return {
          success: true,
          captureId,
        };
      } else {
        this.logger.error(
          `[captureOrder] PayPal capture status: ${captureResult.status}`,
        );
        throw new BadRequestException(
          `Payment capture failed with status: ${captureResult.status}`,
        );
      }
    } catch (error) {
      this.logger.error(`[captureOrder] Error capturing order: ${error.message}`);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to capture PayPal payment');
    }
  }

  async handleWebhook(
    headers: Record<string, string>,
    body: any,
  ): Promise<{ success: boolean; orderId?: string }> {
    this.logger.log('[handleWebhook] Processing PayPal webhook');

    // Note: PayPal webhook verification is more complex and requires additional setup
    // For production, implement proper webhook signature verification
    // See: https://developer.paypal.com/docs/api-basics/notifications/webhooks/notification-messages/

    const eventType = body.event_type;
    this.logger.log(`[handleWebhook] Event type: ${eventType}`);

    // Handle PAYMENT.CAPTURE.COMPLETED event
    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      const resource = body.resource;
      const customId = resource.custom_id; // This is our order number
      const captureId = resource.id;

      if (!customId) {
        this.logger.error('[handleWebhook] No custom_id in webhook payload');
        return { success: false };
      }

      this.logger.log(`[handleWebhook] Payment captured for order ${customId}`);

      try {
        // Find order by order number and complete it
        // Note: You may need to add a method to find order by order number
        this.logger.log(
          `[handleWebhook] Would complete order with number: ${customId}`,
        );

        return {
          success: true,
          orderId: customId,
        };
      } catch (error) {
        this.logger.error(
          `[handleWebhook] Error completing order: ${error.message}`,
        );
        return {
          success: false,
          orderId: customId,
        };
      }
    }

    // For other events, just acknowledge receipt
    return { success: true };
  }

  async getOrder(paypalOrderId: string): Promise<any> {
    try {
      const request = new paypal.orders.OrdersGetRequest(paypalOrderId);
      const response = await this.client.execute(request);
      return response.result;
    } catch (error) {
      this.logger.error(`[getOrder] Error retrieving order: ${error.message}`);
      throw new BadRequestException('Invalid PayPal order ID');
    }
  }
}
