import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { QueryProductDto } from '../dto/query-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async create(createDto: CreateProductDto): Promise<Product> {
    Logger.log('[create] Creating new product');
    const product = this.productRepository.create(createDto);
    const savedProduct = await this.productRepository.save(product);
    Logger.log(`[create] Product created with ID: ${savedProduct.id}`);
    return savedProduct;
  }

  async findAll(query: QueryProductDto): Promise<{
    data: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    Logger.log('[findAll] Retrieving products');

    const { page = 1, limit = 10, category, search, isActive = true } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.productRepository.createQueryBuilder('product');

    // Apply filters
    queryBuilder.where('product.isActive = :isActive', { isActive });

    if (category) {
      queryBuilder.andWhere('product.category = :category', { category });
    }

    if (search) {
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Pagination and ordering
    queryBuilder
      .orderBy('product.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    Logger.log(`[findAll] Found ${total} products`);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: string): Promise<Product> {
    Logger.log(`[findOne] Retrieving product ${id}`);
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['packages'],
    });

    if (!product) {
      Logger.log(`[findOne] Product ${id} not found`);
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: string, updateDto: UpdateProductDto): Promise<Product> {
    Logger.log(`[update] Updating product ${id}`);
    const product = await this.findOne(id);

    Object.assign(product, updateDto);
    const updatedProduct = await this.productRepository.save(product);

    Logger.log(`[update] Product ${id} updated successfully`);
    return updatedProduct;
  }

  async delete(id: string): Promise<void> {
    Logger.log(`[delete] Deleting product ${id}`);
    const product = await this.findOne(id);

    // Check if product is in any packages
    const productWithPackages = await this.productRepository.findOne({
      where: { id },
      relations: ['packages'],
    });

    if (productWithPackages && productWithPackages.packages && productWithPackages.packages.length > 0) {
      Logger.log(`[delete] Product ${id} is in ${productWithPackages.packages.length} packages`);
      throw new BadRequestException(
        'Cannot delete product that is part of existing packages. Remove from packages first.',
      );
    }

    await this.productRepository.remove(product);
    Logger.log(`[delete] Product ${id} deleted successfully`);
  }

  // Helper method for PackagesService
  async findByIds(ids: string[]): Promise<Product[]> {
    return this.productRepository.findByIds(ids);
  }

  async attachFile(
    productId: string,
    file: any,
  ): Promise<Product> {
    Logger.log(`[attachFile] Attaching file to product ${productId}`);
    const product = await this.findOne(productId);

    product.fileUrl = file.path;
    product.fileName = file.originalname;
    product.fileSize = file.size;
    product.fileMimeType = file.mimetype;

    const updatedProduct = await this.productRepository.save(product);
    Logger.log(`[attachFile] File attached to product ${productId}`);
    return updatedProduct;
  }

  async getFullContent(productId: string): Promise<{
    id: string;
    name: string;
    fullContent: string;
    description: string;
  }> {
    Logger.log(`[getFullContent] Retrieving full content for product ${productId}`);
    const product = await this.findOne(productId);

    return {
      id: product.id,
      name: product.name,
      fullContent: product.fullContent,
      description: product.description,
    };
  }

  async getProductForDownload(productId: string): Promise<Product> {
    Logger.log(`[getProductForDownload] Retrieving product ${productId} for download`);
    const product = await this.findOne(productId);

    if (!product.fileUrl) {
      throw new NotFoundException('Product does not have an attached file');
    }

    return product;
  }
}
