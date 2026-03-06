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
} from '@nestjs/common';
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
} from '@nestjs/swagger';
import { PackagesService } from '../services/packages.service';
import { CreatePackageDto } from '../dto/create-package.dto';
import { UpdatePackageDto } from '../dto/update-package.dto';
import { QueryPackageDto } from '../dto/query-package.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/enums/user-role.enum';

@Controller('packages')
@ApiTags('Packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a package',
    description: 'Create a new package bundle. Requires admin authentication.',
  })
  @ApiBody({ type: CreatePackageDto })
  @ApiCreatedResponse({
    description: 'Package created successfully',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Sales Starter Bundle',
        description: 'Everything you need to start selling',
        price: 49.99,
        regularPrice: 79.97,
        savings: 29.98,
        savingsPercentage: 37,
        thumbnailUrl: 'https://example.com/bundle.jpg',
        isActive: true,
        products: [
          {
            id: 'product-uuid-1',
            name: 'Sales Mastery Book',
            price: 29.99,
            category: 'book',
          },
          {
            id: 'product-uuid-2',
            name: 'Cold Calling Course',
            price: 49.98,
            category: 'course',
          },
        ],
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin role required',
  })
  async create(@Body() createDto: CreatePackageDto) {
    return this.packagesService.create(createDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all packages',
    description: 'Retrieve all packages with pagination and filtering. Public endpoint. Includes savings calculation.',
  })
  @ApiOkResponse({
    description: 'Packages retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Sales Starter Bundle',
            price: 49.99,
            regularPrice: 79.97,
            savings: 29.98,
            savingsPercentage: 37,
            isActive: true,
            products: [],
            createdAt: '2024-01-15T10:30:00.000Z',
          },
        ],
        total: 10,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    },
  })
  async findAll(@Query() query: QueryPackageDto) {
    return this.packagesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get package by ID',
    description: 'Retrieve a single package with products and savings information. Public endpoint.',
  })
  @ApiParam({ name: 'id', description: 'Package ID' })
  @ApiOkResponse({
    description: 'Package retrieved successfully',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Sales Starter Bundle',
        description: 'Everything you need to start selling',
        price: 49.99,
        regularPrice: 79.97,
        savings: 29.98,
        savingsPercentage: 37,
        thumbnailUrl: 'https://example.com/bundle.jpg',
        isActive: true,
        products: [
          {
            id: 'product-uuid-1',
            name: 'Sales Mastery Book',
            price: 29.99,
            description: 'Complete guide to sales',
            category: 'book',
          },
        ],
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Package not found',
  })
  async findOne(@Param('id') id: string) {
    return this.packagesService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update a package',
    description: 'Update an existing package. Requires admin authentication.',
  })
  @ApiParam({ name: 'id', description: 'Package ID' })
  @ApiBody({ type: UpdatePackageDto })
  @ApiOkResponse({
    description: 'Package updated successfully',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Sales Starter Bundle - Updated',
        price: 44.99,
        regularPrice: 79.97,
        savings: 34.98,
        savingsPercentage: 44,
        isActive: true,
        products: [],
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T11:00:00.000Z',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin role required',
  })
  @ApiNotFoundResponse({
    description: 'Package not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePackageDto,
  ) {
    return this.packagesService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a package',
    description: 'Delete a package. Requires admin authentication.',
  })
  @ApiParam({ name: 'id', description: 'Package ID' })
  @ApiNoContentResponse({
    description: 'Package deleted successfully',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin role required',
  })
  @ApiNotFoundResponse({
    description: 'Package not found',
  })
  async delete(@Param('id') id: string) {
    return this.packagesService.delete(id);
  }
}
