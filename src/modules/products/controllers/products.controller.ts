import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { createReadStream } from 'fs';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiOkResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiParam,
  ApiNoContentResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { ProductsService } from '../services/products.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { QueryProductDto } from '../dto/query-product.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/enums/user-role.enum';
import { PurchaseGuard } from '../../orders/guards/purchase.guard';
import { PurchaseRequired } from '../../orders/decorators/purchase-required.decorator';
import { multerConfig } from '../config/multer.config';

@Controller('products')
@ApiTags('Products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a product',
    description: 'Create a new product. Requires admin authentication.',
  })
  @ApiBody({ type: CreateProductDto })
  @ApiCreatedResponse({
    description: 'Product created successfully',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Sales Mastery Book',
        price: 29.99,
        description: 'Complete guide to sales techniques',
        summary: 'Learn proven sales strategies',
        previewContent: 'Introduction: Welcome to Sales Mastery...',
        category: 'book',
        thumbnailUrl: 'https://example.com/book.jpg',
        images: ['https://example.com/image1.jpg'],
        isActive: true,
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin role required',
  })
  async create(@Body() createDto: CreateProductDto) {
    return this.productsService.create(createDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all products',
    description: 'Retrieve all products with pagination and filtering. Public endpoint.',
  })
  @ApiOkResponse({
    description: 'Products retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Sales Mastery Book',
            price: 29.99,
            description: 'Complete guide to sales techniques',
            category: 'book',
            isActive: true,
            createdAt: '2024-01-15T10:30:00.000Z',
          },
        ],
        total: 25,
        page: 1,
        limit: 10,
        totalPages: 3,
      },
    },
  })
  async findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get product by ID',
    description: 'Retrieve a single product by ID. Public endpoint.',
  })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiOkResponse({
    description: 'Product retrieved successfully',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Sales Mastery Book',
        price: 29.99,
        description: 'Complete guide to sales techniques',
        summary: 'Learn proven sales strategies',
        previewContent: 'Introduction: Welcome to Sales Mastery...',
        category: 'book',
        thumbnailUrl: 'https://example.com/book.jpg',
        images: ['https://example.com/image1.jpg'],
        isActive: true,
        packages: [],
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Product not found',
  })
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update a product',
    description: 'Update an existing product. Requires admin authentication.',
  })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiBody({ type: UpdateProductDto })
  @ApiOkResponse({
    description: 'Product updated successfully',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Sales Mastery Book - Updated',
        price: 34.99,
        description: 'Complete guide to sales techniques',
        category: 'book',
        isActive: true,
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T11:00:00.000Z',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin role required',
  })
  @ApiNotFoundResponse({
    description: 'Product not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a product',
    description: 'Delete a product. Requires admin authentication. Cannot delete products that are part of packages.',
  })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiNoContentResponse({
    description: 'Product deleted successfully',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin role required',
  })
  @ApiNotFoundResponse({
    description: 'Product not found',
  })
  @ApiBadRequestResponse({
    description: 'Cannot delete product that is part of existing packages',
  })
  async delete(@Param('id') id: string) {
    return this.productsService.delete(id);
  }

  @Post(':id/upload-file')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload file for product',
    description: 'Upload a file (PDF, DOC, etc.) for a product. Requires admin authentication.',
  })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'File uploaded successfully',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Sales Mastery Book',
        fileName: 'sales-mastery.pdf',
        fileSize: 1024000,
        fileMimeType: 'application/pdf',
        fileUrl: 'uploads/products/product-1234567890-123456789.pdf',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin role required',
  })
  @ApiNotFoundResponse({
    description: 'Product not found',
  })
  @ApiBadRequestResponse({
    description: 'Invalid file type or file too large',
  })
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: any,
  ) {
    return this.productsService.attachFile(id, file);
  }

  @Get(':id/content')
  @UseGuards(JwtAuthGuard, PurchaseGuard)
  @PurchaseRequired()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get full product content',
    description: 'Get the full content of a product. Requires authentication and product purchase.',
  })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiOkResponse({
    description: 'Full content retrieved successfully',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Sales Mastery Book',
        fullContent: 'Complete content here...',
        description: 'Complete guide to sales techniques',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'You must purchase this product to access it',
  })
  @ApiNotFoundResponse({
    description: 'Product not found',
  })
  async getFullContent(@Param('id') id: string) {
    return this.productsService.getFullContent(id);
  }

  @Get(':id/download')
  @UseGuards(JwtAuthGuard, PurchaseGuard)
  @PurchaseRequired()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Download product file',
    description: 'Download the file attached to a product. Requires authentication and product purchase.',
  })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiOkResponse({
    description: 'File download started',
  })
  @ApiForbiddenResponse({
    description: 'You must purchase this product to access it',
  })
  @ApiNotFoundResponse({
    description: 'Product not found or no file attached',
  })
  async downloadFile(@Param('id') id: string, @Res() res: Response) {
    const product = await this.productsService.getProductForDownload(id);

    res.setHeader('Content-Type', product.fileMimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${product.fileName}"`,
    );
    res.setHeader('Content-Length', product.fileSize);

    const fileStream = createReadStream(product.fileUrl);
    fileStream.pipe(res);
  }
}
