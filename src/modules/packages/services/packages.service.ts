import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Package } from '../entities/package.entity';
import { Product } from '../../products/entities/product.entity';
import { CreatePackageDto } from '../dto/create-package.dto';
import { UpdatePackageDto } from '../dto/update-package.dto';
import { QueryPackageDto } from '../dto/query-package.dto';

@Injectable()
export class PackagesService {
  constructor(
    @InjectRepository(Package)
    private packageRepository: Repository<Package>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async create(createDto: CreatePackageDto): Promise<any> {
    Logger.log('[create] Creating new package');

    // Verify all products exist
    const products = await this.productRepository.findByIds(createDto.productIds);

    if (products.length !== createDto.productIds.length) {
      throw new NotFoundException('One or more products not found');
    }

    const packageEntity = this.packageRepository.create({
      name: createDto.name,
      description: createDto.description,
      price: createDto.price,
      thumbnailUrl: createDto.thumbnailUrl,
      isActive: createDto.isActive,
      products,
    });

    const savedPackage = await this.packageRepository.save(packageEntity);
    Logger.log(`[create] Package created with ID: ${savedPackage.id}`);

    return this.findOne(savedPackage.id); // Return with products and savings
  }

  async findAll(query: QueryPackageDto): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    Logger.log('[findAll] Retrieving packages');

    const { page = 1, limit = 10, search, isActive = true } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.packageRepository
      .createQueryBuilder('package')
      .leftJoinAndSelect('package.products', 'product');

    // Apply filters
    queryBuilder.where('package.isActive = :isActive', { isActive });

    if (search) {
      queryBuilder.andWhere(
        '(package.name ILIKE :search OR package.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Pagination and ordering
    queryBuilder
      .orderBy('package.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [packages, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    // Calculate regular price for each package
    const data = packages.map((pkg) => this.enrichPackageWithSavings(pkg));

    Logger.log(`[findAll] Found ${total} packages`);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: string): Promise<any> {
    Logger.log(`[findOne] Retrieving package ${id}`);
    const packageEntity = await this.packageRepository.findOne({
      where: { id },
      relations: ['products'],
    });

    if (!packageEntity) {
      Logger.log(`[findOne] Package ${id} not found`);
      throw new NotFoundException('Package not found');
    }

    return this.enrichPackageWithSavings(packageEntity);
  }

  async update(id: string, updateDto: UpdatePackageDto): Promise<any> {
    Logger.log(`[update] Updating package ${id}`);
    const packageEntity = await this.packageRepository.findOne({
      where: { id },
      relations: ['products'],
    });

    if (!packageEntity) {
      throw new NotFoundException('Package not found');
    }

    // Update basic fields
    if (updateDto.name) packageEntity.name = updateDto.name;
    if (updateDto.description) packageEntity.description = updateDto.description;
    if (updateDto.price !== undefined) packageEntity.price = updateDto.price;
    if (updateDto.thumbnailUrl !== undefined)
      packageEntity.thumbnailUrl = updateDto.thumbnailUrl;
    if (updateDto.isActive !== undefined) packageEntity.isActive = updateDto.isActive;

    // Update products if provided
    if (updateDto.productIds) {
      const products = await this.productRepository.findByIds(updateDto.productIds);

      if (products.length !== updateDto.productIds.length) {
        throw new NotFoundException('One or more products not found');
      }

      packageEntity.products = products;
    }

    const updatedPackage = await this.packageRepository.save(packageEntity);
    Logger.log(`[update] Package ${id} updated successfully`);

    return this.findOne(updatedPackage.id);
  }

  async delete(id: string): Promise<void> {
    Logger.log(`[delete] Deleting package ${id}`);
    const packageEntity = await this.packageRepository.findOne({
      where: { id },
    });

    if (!packageEntity) {
      throw new NotFoundException('Package not found');
    }

    await this.packageRepository.remove(packageEntity);
    Logger.log(`[delete] Package ${id} deleted successfully`);
  }

  // Helper method to calculate savings
  private enrichPackageWithSavings(packageEntity: Package): any {
    const regularPrice = packageEntity.products.reduce(
      (sum, product) => sum + Number(product.price),
      0,
    );

    const savings = regularPrice - Number(packageEntity.price);
    const savingsPercentage =
      regularPrice > 0 ? Math.round((savings / regularPrice) * 100) : 0;

    return {
      ...packageEntity,
      regularPrice: Number(regularPrice.toFixed(2)),
      savings: Number(savings.toFixed(2)),
      savingsPercentage,
    };
  }
}
