import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ShortenService } from '../services/shorten.service';
import { ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CreateShortenDto } from '../dto/shorten.dto';

@Controller('shorten')
@ApiTags('shorten URL')
export class ShortenController {
  constructor(private readonly shortenService: ShortenService) {}

  @Post()
  @ApiBody({
    schema: {
      example: {
        originalUrl:
          'https://www.google.com/search?q=google+image+long+url&rlz=1C1OPNX_enTN1137TN1137&oq=google+image+long+url&gs_lcrp=EgZjaHJvbWUyBggAEEUYOTIGCAEQRRhA0gEIMjg5OGowajeoAgCwAgA&sourceid=chrome&ie=UTF-8',
      },
    },
  })
  @ApiOkResponse({
    description: 'Shorten URL successfully',
    example: {
      shortUrl: `${process.env.APP_URL}/api/shorten/abc123`,
      qrCode: 'data-img:base64...',
    },
  })
  async shorten(@Body() payload: CreateShortenDto) {
    const shorten = await this.shortenService.shortenUrl(payload.originalUrl);
    return {
      shortUrl: `${process.env.APP_URL}/api/shorten/${shorten?.shortId}`,
      qrCode: shorten?.qrCode,
      originalUrl: shorten?.originalUrl,
      clicks: shorten?.clicks,
      _id: shorten?._id,
    };
  }

  @Get(':shortId')
  async redirect(@Param('shortId') shortId: string, @Res() res: Response) {
    const originalUrl = await this.shortenService.getOriginalUrl(shortId);
    return res.redirect(HttpStatus.FOUND, originalUrl);
  }
  @Post('ids')
  async getShortenedIds(@Body('ids') ids: string[]) {
    const links = await this.shortenService.getShortenedUrls(ids);
    return links.map((link) => ({
      shortUrl: `${process.env.APP_URL}/api/shorten/${link.shortId}`,
      qrCode: link.qrCode,
      originalUrl: link.originalUrl,
      clicks: link.clicks,
      _id: link._id,
    }));
  }
}
