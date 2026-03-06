import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { StripePaymentService } from './services/stripe-payment.service';
import { PayPalPaymentService } from './services/paypal-payment.service';
import { StripePaymentController } from './controllers/stripe-payment.controller';
import { PayPalPaymentController } from './controllers/paypal-payment.controller';
import { PaymentWebhooksController } from './controllers/payment-webhooks.controller';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    ConfigModule,
    OrdersModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 10, // 10 requests
      },
    ]),
  ],
  controllers: [
    StripePaymentController,
    PayPalPaymentController,
    PaymentWebhooksController,
  ],
  providers: [StripePaymentService, PayPalPaymentService],
  exports: [StripePaymentService, PayPalPaymentService],
})
export class PaymentsModule {}
