import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrdersService } from '../services/orders.service';
import { PURCHASE_REQUIRED_KEY } from '../decorators/purchase-required.decorator';
import { UserRole } from '../../auth/enums/user-role.enum';

@Injectable()
export class PurchaseGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private ordersService: OrdersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiresPurchase = this.reflector.getAllAndOverride<boolean>(
      PURCHASE_REQUIRED_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiresPurchase) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const productId = request.params.id;

    if (!user) {
      Logger.log('[PurchaseGuard] No user found in request');
      return false;
    }

    // Admin bypass - admins can access all products
    if (user.role === UserRole.ADMIN) {
      Logger.log('[PurchaseGuard] Admin access granted');
      return true;
    }

    if (!productId) {
      Logger.log('[PurchaseGuard] No product ID in request params');
      throw new ForbiddenException('Product ID is required');
    }

    // Check if user has purchased the product
    const hasPurchased = await this.ordersService.hasUserPurchasedProduct(
      user.sub,
      productId,
    );

    if (!hasPurchased) {
      Logger.log(
        `[PurchaseGuard] User ${user.sub} has not purchased product ${productId}`,
      );
      throw new ForbiddenException(
        'You must purchase this product to access it',
      );
    }

    Logger.log(
      `[PurchaseGuard] User ${user.sub} has purchased product ${productId}`,
    );
    return true;
  }
}
