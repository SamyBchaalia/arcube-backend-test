import {
  Controller,
  Get,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { OrdersService } from '../../orders/services/orders.service';
import { QueryOrderDto } from '../../orders/dto/query-order.dto';

@Controller('users')
@ApiTags('Users')
export class UsersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Get the profile of the currently authenticated user.',
  })
  @ApiOkResponse({
    description: 'User profile retrieved successfully',
    schema: {
      example: {
        id: 'user-uuid',
        email: 'user@example.com',
        name: 'John Doe',
        role: 'client',
        isActive: true,
        createdAt: '2024-01-15T10:30:00.000Z',
      },
    },
  })
  async getProfile(@Request() req) {
    return req.user;
  }

  @Get('me/purchases')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user purchased products',
    description: 'Get all products purchased by the authenticated user with download links.',
  })
  @ApiOkResponse({
    description: 'Purchased products retrieved successfully',
    schema: {
      example: {
        products: [
          {
            id: 'product-uuid',
            name: 'Sales Mastery Book',
            description: 'Complete guide to sales',
            category: 'book',
            downloadLink: '/api/products/product-uuid/download',
            contentLink: '/api/products/product-uuid/content',
            hasFile: true,
            fileName: 'sales-mastery.pdf',
            fileSize: 1024000,
            thumbnailUrl: 'https://example.com/thumb.jpg',
          },
        ],
        total: 5,
      },
    },
  })
  async getPurchases(@Request() req) {
    const products = await this.ordersService.getUserPurchasedProducts(
      req.user.sub,
    );

    const productsWithLinks = products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      downloadLink: `/api/products/${product.id}/download`,
      contentLink: `/api/products/${product.id}/content`,
      hasFile: !!product.fileUrl,
      fileName: product.fileName,
      fileSize: product.fileSize,
      thumbnailUrl: product.thumbnailUrl,
    }));

    return {
      products: productsWithLinks,
      total: productsWithLinks.length,
    };
  }

  @Get('me/orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user order history',
    description: 'Get all orders for the authenticated user with pagination.',
  })
  @ApiOkResponse({
    description: 'Order history retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 'order-uuid',
            orderNumber: 'ORD-20260112-001',
            status: 'completed',
            total: 79.98,
            items: [
              {
                itemName: 'Sales Mastery Book',
                price: 29.99,
                quantity: 1,
              },
            ],
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
  async getOrders(@Request() req, @Query() query: QueryOrderDto) {
    return this.ordersService.getUserOrders(req.user.sub, query);
  }
}
