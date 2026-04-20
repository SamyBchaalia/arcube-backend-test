import { Controller, Post, Body, Res, HttpStatus, Query, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { QRCodeService } from '../services/qr-code.service';
import { GenerateQRDto, QROutputFormat } from '../dto/generate-qr.dto';

@ApiTags('QR Code Generator')
@Controller('qr-code')
export class QRCodeController {
  constructor(private readonly qrCodeService: QRCodeService) {}

  @Post('generate')
  @ApiOperation({
    summary: 'Generate QR code from URL',
    description: 'Creates a QR code image from the provided URL. Returns PNG image by default or base64 encoded string.',
  })
  @ApiResponse({
    status: 200,
    description: 'QR code generated successfully',
    content: {
      'image/png': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
      'application/json': {
        schema: {
          example: {
            qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid URL or parameters',
  })
  async generateQRCode(
    @Body() generateQRDto: GenerateQRDto,
    @Res() res: Response,
  ) {
    const { url, format = QROutputFormat.PNG, size = 300 } = generateQRDto;

    const qrCode = await this.qrCodeService.generateQRCode(url, format, size);

    if (format === QROutputFormat.BASE64) {
      // Return as JSON with base64 string
      return res.status(HttpStatus.OK).json({
        qrCode: qrCode,
        url: url,
        format: 'base64',
      });
    } else {
      // Return as PNG image
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `inline; filename="qrcode.png"`);
      return res.status(HttpStatus.OK).send(qrCode);
    }
  }

  @Get('generate')
  @ApiOperation({
    summary: 'Generate QR code from URL (GET method)',
    description: 'Creates a QR code image from the provided URL via query parameters. Always returns PNG image.',
  })
  @ApiQuery({
    name: 'url',
    required: true,
    description: 'The URL to encode in the QR code',
    example: 'https://nbvgroup.ca',
  })
  @ApiQuery({
    name: 'size',
    required: false,
    description: 'Size of the QR code in pixels (100-1000)',
    example: 300,
  })
  @ApiResponse({
    status: 200,
    description: 'QR code generated successfully',
    content: {
      'image/png': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid URL or parameters',
  })
  async generateQRCodeGet(
    @Query('url') url: string,
    @Query('size') size: number = 300,
    @Res() res: Response,
  ) {
    if (!url) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: 400,
        message: 'URL parameter is required',
        error: 'Bad Request',
      });
    }

    const qrCode = await this.qrCodeService.generateQRCode(
      url,
      QROutputFormat.PNG,
      size,
    );

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="qrcode.png"`);
    return res.status(HttpStatus.OK).send(qrCode);
  }
}
