import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { QROutputFormat } from '../dto/generate-qr.dto';

@Injectable()
export class QRCodeService {
  private readonly logger = new Logger(QRCodeService.name);

  async generateQRCode(
    url: string,
    format: QROutputFormat = QROutputFormat.PNG,
    size: number = 300,
  ): Promise<Buffer | string> {
    try {
      this.logger.log(`Generating QR code for URL: ${url}`);

      const options = {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      };

      if (format === QROutputFormat.BASE64) {
        // Generate base64 encoded data URL
        const dataUrl = await QRCode.toDataURL(url, options);
        this.logger.log('QR code generated as base64');
        return dataUrl;
      } else {
        // Generate PNG buffer
        const buffer = await QRCode.toBuffer(url, {
          ...options,
          type: 'png',
        });
        this.logger.log('QR code generated as PNG buffer');
        return buffer;
      }
    } catch (error) {
      this.logger.error(`Failed to generate QR code: ${error.message}`);
      throw new BadRequestException('Failed to generate QR code');
    }
  }
}
