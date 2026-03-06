import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { StripePaymentService } from '../services/stripe-payment.service';
import { OrdersService } from '../../orders/services/orders.service';
import { CreatePaymentSessionDto } from '../dto/create-payment-session.dto';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Stripe Payments')
@Controller('payments/stripe')
export class StripePaymentController {
  constructor(
    private stripePaymentService: StripePaymentService,
    private ordersService: OrdersService,
  ) {}

  @Post('create-checkout-session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create Stripe checkout session for an order' })
  @ApiResponse({
    status: 200,
    description: 'Checkout session created successfully',
    schema: {
      example: {
        sessionId: 'cs_test_...',
        url: 'https://checkout.stripe.com/pay/cs_test_...',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid order or order not pending' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async createCheckoutSession(
    @Request() req,
    @Body() createSessionDto: CreatePaymentSessionDto,
  ) {
    const userId = req.user.id;

    // Get the order and verify ownership
    const order = await this.ordersService.getOrderById(
      createSessionDto.orderId,
      userId,
    );

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify order is in PENDING status
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Order is already ${order.status}. Only pending orders can be paid.`,
      );
    }

    // Create Stripe checkout session
    const session = await this.stripePaymentService.createCheckoutSession(
      order,
      createSessionDto.successUrl,
      createSessionDto.cancelUrl,
    );

    return {
      sessionId: session.sessionId,
      url: session.url,
    };
  }
}
