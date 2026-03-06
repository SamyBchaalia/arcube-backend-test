import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './controllers/orders.controller';
import { OrdersService } from './services/orders.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { Package } from '../packages/entities/package.entity';
import { User } from '../auth/entities/user.entity';
import { PurchaseGuard } from './guards/purchase.guard';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product, Package, User]),
    EmailModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, PurchaseGuard],
  exports: [OrdersService, PurchaseGuard],
})
export class OrdersModule {}
