import { Body, Controller, Post, Req, Headers, Logger } from '@nestjs/common';
import { Request } from 'express';
import { ShortenService } from '../services/shorten.service';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ChatRequestDto } from '../../chat-history/dto/chat-request.dto';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../../auth/services/auth.service';

@Controller('shorten')
@ApiTags('Chatbot')
export class ShortenController {
  constructor(
    private readonly shortenService: ShortenService,
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

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
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'NBV Group AI Sales Assistant',
    description: 'Chat with NBV Group\'s AI assistant for sales consulting and training inquiries. Supports session continuity, optional JWT authentication for logged-in users, and guest user registration for anonymous visitors.',
  })
  @ApiBody({
    description: 'Conversation messages for NBV Group assistant with optional session ID and guest user registration. If JWT token is provided in Authorization header, conversation will be automatically linked to authenticated user.',
    schema: {
      example: {
        messages: [
          {
            role: 'user',
            content: 'Tell me about your sales training programs'
          }
        ],
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        guestUser: {
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe'
        }
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
    @Body() body: ChatRequestDto,
    @Req() request: Request,
    @Headers('authorization') authHeader?: string,
  ) {
    // Extract metadata from request
    const metadata = {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    };

    // Check for authenticated user via JWT token (optional)
    let authenticatedUserId: string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        Logger.log('[ShortenController] JWT token detected, validating...');

        const payload = this.jwtService.verify(token);
        Logger.log(`[ShortenController] Token validated for user: ${payload.email}`);

        // Verify user exists and is active
        const user = await this.authService.validateUserById(payload.sub);
        if (user) {
          authenticatedUserId = user.id;
          Logger.log(`[ShortenController] Authenticated user linked to chat: ${user.email}`);
        } else {
          Logger.warn('[ShortenController] Token valid but user not found or inactive');
        }
      } catch (error) {
        // Invalid or expired token - just log and continue as anonymous/guest
        Logger.log('[ShortenController] Invalid or expired JWT token, continuing as anonymous');
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.shortenService.proxyNbvChatBot(
      body.messages,
      body.sessionId,
      body.guestUser,
      metadata,
      authenticatedUserId,
    );
  }
}
