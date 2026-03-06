import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Product } from '../../products/entities/product.entity';
import { Package } from '../../packages/entities/package.entity';
import { User } from '../../auth/entities/user.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { QueryOrderDto } from '../dto/query-order.dto';
import { OrderStatus } from '../enums/order-status.enum';
import { PurchaseType } from '../enums/purchase-type.enum';
import { PaymentMethod } from '../enums/payment-method.enum';
import { EmailService } from '../../email/services/email.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Package)
    private packageRepository: Repository<Package>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private emailService: EmailService,
  ) {}

  async createOrder(userId: string, createDto: CreateOrderDto): Promise<Order> {
    Logger.log(`[createOrder] Creating order for user ${userId}`);

    // Generate unique order number
    let orderNumber = Order.generateOrderNumber();
    let isUnique = false;
    while (!isUnique) {
      const existing = await this.orderRepository.findOne({
        where: { orderNumber },
      });
      if (!existing) {
        isUnique = true;
      } else {
        orderNumber = Order.generateOrderNumber();
      }
    }

    // Validate and fetch all items
    const orderItems: OrderItem[] = [];
    let subtotal = 0;

    for (const itemDto of createDto.items) {
      let itemName: string;
      let itemPrice: number;

      if (itemDto.itemType === PurchaseType.PRODUCT) {
        const product = await this.productRepository.findOne({
          where: { id: itemDto.itemId },
        });
        if (!product) {
          throw new NotFoundException(
            `Product with ID ${itemDto.itemId} not found`,
          );
        }
        itemName = product.name;
        itemPrice = Number(product.price);
      } else {
        const packageItem = await this.packageRepository.findOne({
          where: { id: itemDto.itemId },
        });
        if (!packageItem) {
          throw new NotFoundException(
            `Package with ID ${itemDto.itemId} not found`,
          );
        }
        itemName = packageItem.name;
        itemPrice = Number(packageItem.price);
      }

      const quantity = itemDto.quantity || 1;
      const itemSubtotal = itemPrice * quantity;
      subtotal += itemSubtotal;

      const orderItemData = {
        itemType: itemDto.itemType,
        productId:
          itemDto.itemType === PurchaseType.PRODUCT ? itemDto.itemId : undefined,
        packageId:
          itemDto.itemType === PurchaseType.PACKAGE ? itemDto.itemId : undefined,
        itemName,
        price: itemPrice,
        quantity,
        subtotal: itemSubtotal,
      };

      const orderItem = this.orderItemRepository.create(orderItemData);
      orderItems.push(orderItem);
    }

    // Calculate totals (no tax for now)
    const tax = 0;
    const total = subtotal + tax;

    // Determine order status based on payment method
    const status =
      createDto.paymentMethod === PaymentMethod.MANUAL
        ? OrderStatus.COMPLETED
        : OrderStatus.PENDING;

    // Create order
    const order = this.orderRepository.create({
      orderNumber,
      userId,
      status,
      subtotal,
      tax,
      total,
      paymentMethod: createDto.paymentMethod,
      notes: createDto.notes,
      items: orderItems,
      completedAt: status === OrderStatus.COMPLETED ? new Date() : undefined,
    });

    const savedOrder = await this.orderRepository.save(order);
    Logger.log(`[createOrder] Order created: ${savedOrder.orderNumber}`);

    const createdOrder = await this.orderRepository.findOne({
      where: { id: savedOrder.id },
      relations: ['items', 'items.product', 'items.package'],
    });

    if (!createdOrder) {
      throw new NotFoundException('Order not found after creation');
    }

    // Send purchase confirmation email only for manual orders
    // Payment gateway orders will send email after webhook confirms payment
    if (status === OrderStatus.COMPLETED) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user) {
        await this.emailService.sendPurchaseConfirmation(user, createdOrder);
      }
    }

    return createdOrder;
  }

  async completeOrderPayment(
    orderId: string,
    transactionId: string,
  ): Promise<Order> {
    Logger.log(`[completeOrderPayment] Completing payment for order ${orderId}`);

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.product', 'items.package', 'user'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.COMPLETED) {
      // Already processed (idempotent for webhooks)
      Logger.log(`[completeOrderPayment] Order ${orderId} already completed`);
      return order;
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Order status is ${order.status}, cannot complete payment`,
      );
    }

    order.status = OrderStatus.COMPLETED;
    order.paymentTransactionId = transactionId;
    order.completedAt = new Date();

    await this.orderRepository.save(order);

    // Send purchase confirmation email
    if (order.user) {
      await this.emailService.sendPurchaseConfirmation(order.user, order);
    }

    Logger.log(`[completeOrderPayment] Order ${orderId} payment completed`);

    return order;
  }

  async getUserOrders(
    userId: string,
    query: QueryOrderDto,
  ): Promise<{
    data: Order[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    Logger.log(`[getUserOrders] Fetching orders for user ${userId}`);

    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('items.package', 'package')
      .where('order.userId = :userId', { userId });

    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    queryBuilder
      .orderBy('order.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [orders, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    Logger.log(`[getUserOrders] Found ${total} orders for user ${userId}`);

    return {
      data: orders,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getOrderById(orderId: string, userId: string): Promise<Order> {
    Logger.log(`[getOrderById] Fetching order ${orderId}`);

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.product', 'items.package', 'user'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check ownership
    if (order.userId !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }

    return order;
  }

  async updateOrderStatus(
    orderId: string,
    updateDto: UpdateOrderDto,
  ): Promise<Order> {
    Logger.log(`[updateOrderStatus] Updating order ${orderId}`);

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (updateDto.status) {
      order.status = updateDto.status;

      if (updateDto.status === OrderStatus.COMPLETED) {
        order.completedAt = new Date();
      } else if (updateDto.status === OrderStatus.CANCELLED) {
        order.cancelledAt = new Date();
      }
    }

    const updatedOrder = await this.orderRepository.save(order);
    Logger.log(`[updateOrderStatus] Order ${orderId} updated to ${updateDto.status}`);

    const refreshedOrder = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.product', 'items.package'],
    });

    if (!refreshedOrder) {
      throw new NotFoundException('Order not found after update');
    }

    // Send status update email
    const user = await this.userRepository.findOne({
      where: { id: refreshedOrder.userId },
    });
    if (user && updateDto.status) {
      await this.emailService.sendOrderStatusUpdate(
        user,
        refreshedOrder,
        updateDto.status,
      );
    }

    return refreshedOrder;
  }

  async cancelOrder(orderId: string, userId: string): Promise<Order> {
    Logger.log(`[cancelOrder] Cancelling order ${orderId}`);

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'Only pending orders can be cancelled',
      );
    }

    order.status = OrderStatus.CANCELLED;
    order.cancelledAt = new Date();

    await this.orderRepository.save(order);
    Logger.log(`[cancelOrder] Order ${orderId} cancelled`);

    const cancelledOrder = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.product', 'items.package'],
    });

    if (!cancelledOrder) {
      throw new NotFoundException('Order not found after cancellation');
    }

    return cancelledOrder;
  }

  async hasUserPurchasedProduct(
    userId: string,
    productId: string,
  ): Promise<boolean> {
    // Check direct product purchase
    const directPurchase = await this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.items', 'items')
      .where('order.userId = :userId', { userId })
      .andWhere('order.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('items.productId = :productId', { productId })
      .getOne();

    if (directPurchase) {
      return true;
    }

    // Check if product is in a purchased package
    const packagePurchase = await this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.items', 'items')
      .innerJoin('items.package', 'package')
      .innerJoin('package.products', 'products')
      .where('order.userId = :userId', { userId })
      .andWhere('order.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('products.id = :productId', { productId })
      .getOne();

    return !!packagePurchase;
  }

  async hasUserPurchasedPackage(
    userId: string,
    packageId: string,
  ): Promise<boolean> {
    const purchase = await this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.items', 'items')
      .where('order.userId = :userId', { userId })
      .andWhere('order.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('items.packageId = :packageId', { packageId })
      .getOne();

    return !!purchase;
  }

  async getUserPurchasedProducts(userId: string): Promise<Product[]> {
    Logger.log(`[getUserPurchasedProducts] Fetching purchases for user ${userId}`);

    // Get directly purchased products
    const directProducts = await this.productRepository
      .createQueryBuilder('product')
      .innerJoin('product.packages', 'package')
      .innerJoin(OrderItem, 'items', 'items.productId = product.id')
      .innerJoin(Order, 'order', 'order.id = items.orderId')
      .where('order.userId = :userId', { userId })
      .andWhere('order.status = :status', { status: OrderStatus.COMPLETED })
      .getMany();

    // Get products from purchased packages
    const packageProducts = await this.productRepository
      .createQueryBuilder('product')
      .innerJoin('product.packages', 'package')
      .innerJoin(OrderItem, 'items', 'items.packageId = package.id')
      .innerJoin(Order, 'order', 'order.id = items.orderId')
      .where('order.userId = :userId', { userId })
      .andWhere('order.status = :status', { status: OrderStatus.COMPLETED })
      .getMany();

    // Combine and deduplicate
    const allProducts = [...directProducts, ...packageProducts];
    const uniqueProducts = Array.from(
      new Map(allProducts.map((p) => [p.id, p])).values(),
    );

    Logger.log(`[getUserPurchasedProducts] Found ${uniqueProducts.length} products`);

    return uniqueProducts;
  }
}
