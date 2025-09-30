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
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateShortenDto } from '../dto/shorten.dto';

@Controller('shorten')
@ApiTags('shorten URL')
export class ShortenController {
  constructor(private readonly shortenService: ShortenService) {}

  @Post()
  @ApiOperation({
    summary: 'Shorten a long URL', // A brief description of the operation
    description:
      'This endpoint shortens a long URL and generates a QR code for it.',
  })
  @ApiBody({
    description: 'The URL to be shortened',
    type: CreateShortenDto,
    schema: {
      example: {
        originalUrl:
          'https://www.google.com/search?q=google+image+long+url&rlz=1C1OPNX_enTN1137TN1137&oq=google+image+long+url&gs_lcrp=EgZjaHJvbWUyBggAEEUYOTIGCAEQRRhA0gEIMjg5OGowajeoAgCwAgA&sourceid=chrome&ie=UTF-8',
      },
    },
  })
  @ApiOkResponse({
    description: 'Successfully shortened the URL.',
    schema: {
      example: {
        shortUrl: `${process.env.APP_URL}/api/shorten/abc123`,
        qrCode: 'data:image/png;base64,...',
        originalUrl:
          'https://www.google.com/search?q=google+image+long+url&rlz=1C1OPNX_enTN1137TN1137&oq=google+image+long+url&gs_lcrp=EgZjaHJvbWUyBggAEEUYOTIGCAEQRRhA0gEIMjg5OGowajeoAgCwAgA&sourceid=chrome&ie=UTF-8',
        clicks: 150,
        _id: 'unique_object_id',
      },
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
  @ApiOperation({
    summary: 'Redirect to the original URL using the shortened URL',
    description:
      'This endpoint redirects users to the original URL based on the shortened URL identifier.',
  })
  @ApiOkResponse({
    description: 'Redirect to the original URL.',
  })
  async redirect(@Param('shortId') shortId: string, @Res() res: Response) {
    const originalUrl = await this.shortenService.getOriginalUrl(shortId);
    return res.redirect(HttpStatus.FOUND, originalUrl);
  }
  @Post('ids')
  @ApiOperation({
    summary: 'Retrieve multiple shortened URLs by their IDs',
    description:
      'This endpoint fetches information about multiple shortened URLs based on an array of IDs.',
  })
  @ApiBody({
    description: 'An array of shortened URL IDs',
    schema: {
      example: {
        ids: ['abc123', 'def456', 'ghi789'],
      },
    },
  })
  @ApiOkResponse({
    description: 'Successfully retrieved the shortened URLs.',
    isArray: true,
    schema: {
      example: [
        {
          shortUrl: `${process.env.APP_URL}/api/shorten/abc123`,
          qrCode: 'data:image/png;base64,...',
          originalUrl:
            'https://www.google.com/search?q=google+image+long+url&rlz=1C1OPNX_enTN1137TN1137&oq=google+image+long+url&gs_lcrp=EgZjaHJvbWUyBggAEEUYOTIGCAEQRRhA0gEIMjg5OGowajeoAgCwAgA&sourceid=chrome&ie=UTF-8',
          clicks: 150,
          _id: 'unique_object_id',
        },
        {
          shortUrl: `${process.env.APP_URL}/api/shorten/def456`,
          qrCode: 'data:image/png;base64,...',
          originalUrl: 'https://example.com',
          clicks: 25,
          _id: 'another_object_id',
        },
      ],
    },
  })
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

  @Post('bot')
  async proxyAnthropic(
    @Body()
    body: {
      messages: { role: 'user' | 'assistant'; content: string }[];
    },
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.shortenService.proxyChatBot(body.messages);
  }

  @Post('nbv')
  @ApiOperation({
    summary: 'NBV Group AI Sales Assistant',
    description: 'Chat with NBV Group\'s AI assistant for sales consulting and training inquiries.',
  })
  @ApiBody({
    description: 'Conversation messages for NBV Group assistant',
    schema: {
      example: {
        messages: [
          {
            role: 'user',
            content: 'Tell me about your sales training programs'
          }
        ]
      }
    }
  })
  @ApiOkResponse({
    description: 'Response from NBV Group AI assistant',
    schema: {
      example: [
        'NBV Group offers comprehensive sales training programs including Basic Sales Training 101 for new salespeople, Advanced Sales Training for experienced professionals, and customized workshops. Our programs are built on 30 years of proven experience helping both startups and Fortune 500 companies improve their sales performance.'
      ]
    }
  })
  async proxyNbvAnthropic(
    @Body()
    body: {
      messages: { role: 'user' | 'assistant'; content: string }[];
    },
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.shortenService.proxyNbvChatBot(body.messages);
  }
}
