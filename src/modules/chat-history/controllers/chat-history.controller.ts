import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ChatHistoryService } from '../services/chat-history.service';
import { QuerySessionsDto } from '../dto/query-sessions.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '../../auth/enums/user-role.enum';
import { User } from '../../auth/entities/user.entity';

@ApiTags('Chat History')
@ApiBearerAuth()
@Controller('chat-history')
export class ChatHistoryController {
  constructor(private readonly chatHistoryService: ChatHistoryService) {}

  // User-facing endpoints (authenticated users only)
  @Get('my-sessions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get my chat sessions',
    description: 'Returns paginated list of chat sessions for the authenticated user'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of user\'s chat sessions',
    schema: {
      example: {
        sessions: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            sessionId: '123e4567-e89b-12d3-a456-426614174000',
            botType: 'nbv',
            messageCount: 5,
            lastMessageAt: '2026-02-23T10:30:00.000Z',
            createdAt: '2026-02-23T10:00:00.000Z',
          },
        ],
        total: 15,
        page: 1,
        limit: 10,
        totalPages: 2,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  async getMySessions(
    @CurrentUser() user: User,
    @Query() query: QuerySessionsDto,
  ) {
    return this.chatHistoryService.getUserSessions(user.id, query);
  }

  @Get('my-sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get my session details',
    description: 'Returns session details with all messages for a specific user session'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns session details with all messages',
    schema: {
      example: {
        session: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          sessionId: '123e4567-e89b-12d3-a456-426614174000',
          botType: 'nbv',
          messageCount: 5,
          lastMessageAt: '2026-02-23T10:30:00.000Z',
          createdAt: '2026-02-23T10:00:00.000Z',
        },
        messages: [
          {
            id: '789e0123-e89b-12d3-a456-426614174000',
            role: 'user',
            content: 'Tell me about sales training',
            sequenceNumber: 0,
            createdAt: '2026-02-23T10:00:00.000Z',
          },
          {
            id: '890e1234-e89b-12d3-a456-426614174000',
            role: 'assistant',
            content: 'NBV Group offers comprehensive sales training...',
            sequenceNumber: 1,
            createdAt: '2026-02-23T10:00:30.000Z',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Session does not belong to user' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getMySessionMessages(
    @CurrentUser() user: User,
    @Param('sessionId') sessionId: string,
  ) {
    return this.chatHistoryService.getUserSessionMessages(user.id, sessionId);
  }
}
