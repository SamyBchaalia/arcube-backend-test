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
import { PayPalPaymentService } from '../services/paypal-payment.service';
import { OrdersService } from '../../orders/services/orders.service';
import { CreatePaymentSessionDto } from '../dto/create-payment-session.dto';
import { PayPalCaptureDto } from '../dto/paypal-capture.dto';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { Throttle } from '@nestjs/throttler';

@ApiTags('PayPal Payments')
@Controller('payments/paypal')
export class PayPalPaymentController {
  constructor(
    private paypalPaymentService: PayPalPaymentService,
    private ordersService: OrdersService,
  ) {}

  @Post('create-order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create PayPal order for checkout' })
  @ApiResponse({
    status: 200,
    description: 'PayPal order created successfully',
    schema: {
      example: {
        orderId: '8XV12345ABC12345D',
        approvalUrl: 'https://www.paypal.com/checkoutnow?token=...',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid order or order not pending' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async createOrder(
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

    // Create PayPal order
    const paypalOrder = await this.paypalPaymentService.createOrder(order);

    return {
      orderId: paypalOrder.orderId,
      approvalUrl: paypalOrder.approvalUrl,
    };
  }

  @Post('capture-order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Capture PayPal payment after user approval' })
  @ApiResponse({
    status: 200,
    description: 'Payment captured successfully',
    schema: {
      example: {
        success: true,
        captureId: '1AB23456CD789012E',
        orderId: '123e4567-e89b-12d3-a456-426614174000',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Capture failed' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async captureOrder(
    @Request() req,
    @Body() captureDto: PayPalCaptureDto,
  ) {
    const userId = req.user.id;

    // Verify order ownership
    const order = await this.ordersService.getOrderById(
      captureDto.orderId,
      userId,
    );

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Capture the PayPal payment
    const result = await this.paypalPaymentService.captureOrder(
      captureDto.paypalOrderId,
      captureDto.orderId,
    );

    return {
      success: result.success,
      captureId: result.captureId,
      orderId: captureDto.orderId,
    };
  }
}
