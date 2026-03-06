import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiOkResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiParam,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { OrdersService } from '../services/orders.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { QueryOrderDto } from '../dto/query-order.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/enums/user-role.enum';

@Controller('orders')
@ApiTags('Orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new order',
    description: 'Create a new order with products or packages. Requires authentication.',
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiCreatedResponse({
    description: 'Order created successfully',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        orderNumber: 'ORD-20260112-001',
        userId: 'user-uuid',
        status: 'completed',
        subtotal: 79.98,
        tax: 0,
        total: 79.98,
        paymentMethod: 'manual',
        items: [
          {
            id: 'item-uuid',
            itemType: 'product',
            itemName: 'Sales Mastery Book',
            price: 29.99,
            quantity: 1,
            subtotal: 29.99,
          },
        ],
        createdAt: '2026-01-12T10:00:00.000Z',
        completedAt: '2026-01-12T10:00:00.000Z',
      },
    },
  })
  async create(@Request() req, @Body() createDto: CreateOrderDto) {
    return this.ordersService.createOrder(req.user.sub, createDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user orders',
    description: 'Retrieve all orders for the authenticated user with pagination.',
  })
  @ApiOkResponse({
    description: 'Orders retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            orderNumber: 'ORD-20260112-001',
            status: 'completed',
            total: 79.98,
            items: [],
            createdAt: '2026-01-12T10:00:00.000Z',
          },
        ],
        total: 5,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    },
  })
  async findAll(@Request() req, @Query() query: QueryOrderDto) {
    return this.ordersService.getUserOrders(req.user.sub, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get order by ID',
    description: 'Retrieve a single order with full details. User can only access their own orders.',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiOkResponse({
    description: 'Order retrieved successfully',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        orderNumber: 'ORD-20260112-001',
        userId: 'user-uuid',
        status: 'completed',
        subtotal: 79.98,
        tax: 0,
        total: 79.98,
        paymentMethod: 'manual',
        items: [
          {
            id: 'item-uuid',
            itemType: 'product',
            productId: 'product-uuid',
            itemName: 'Sales Mastery Book',
            price: 29.99,
            quantity: 1,
            subtotal: 29.99,
            product: {
              id: 'product-uuid',
              name: 'Sales Mastery Book',
              category: 'book',
            },
          },
        ],
        createdAt: '2026-01-12T10:00:00.000Z',
        completedAt: '2026-01-12T10:00:00.000Z',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Order not found',
  })
  @ApiForbiddenResponse({
    description: 'User does not have access to this order',
  })
  async findOne(@Request() req, @Param('id') id: string) {
    return this.ordersService.getOrderById(id, req.user.sub);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update order status',
    description: 'Update the status of an order. Requires admin authentication.',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiBody({ type: UpdateOrderDto })
  @ApiOkResponse({
    description: 'Order status updated successfully',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        orderNumber: 'ORD-20260112-001',
        status: 'refunded',
        total: 79.98,
        updatedAt: '2026-01-12T11:00:00.000Z',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin role required',
  })
  @ApiNotFoundResponse({
    description: 'Order not found',
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateOrderDto,
  ) {
    return this.ordersService.updateOrderStatus(id, updateDto);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Cancel an order',
    description: 'Cancel a pending order. User can only cancel their own pending orders.',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiOkResponse({
    description: 'Order cancelled successfully',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        orderNumber: 'ORD-20260112-001',
        status: 'cancelled',
        cancelledAt: '2026-01-12T11:00:00.000Z',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'User does not have access to this order',
  })
  @ApiNotFoundResponse({
    description: 'Order not found',
  })
  async cancel(@Request() req, @Param('id') id: string) {
    return this.ordersService.cancelOrder(id, req.user.sub);
  }
}
