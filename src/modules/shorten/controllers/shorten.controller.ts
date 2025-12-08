import { Body, Controller, Post } from '@nestjs/common';
import { ShortenService } from '../services/shorten.service';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('shorten')
@ApiTags('Chatbot')
export class ShortenController {
  constructor(private readonly shortenService: ShortenService) {}

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
