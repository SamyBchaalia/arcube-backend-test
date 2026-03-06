import { SetMetadata } from '@nestjs/common';

export const PURCHASE_REQUIRED_KEY = 'purchaseRequired';
export const PurchaseRequired = () => SetMetadata(PURCHASE_REQUIRED_KEY, true);
