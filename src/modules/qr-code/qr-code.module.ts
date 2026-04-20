import { Module } from '@nestjs/common';
import { QRCodeController } from './controllers/qr-code.controller';
import { QRCodeService } from './services/qr-code.service';

@Module({
  controllers: [QRCodeController],
  providers: [QRCodeService],
  exports: [QRCodeService],
})
export class QRCodeModule {}
