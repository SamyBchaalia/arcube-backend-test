import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ChatHistoryService } from '../services/chat-history.service';
import { QuerySessionsDto } from '../dto/query-sessions.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/enums/user-role.enum';

@ApiTags('Admin - Chat History')
@ApiBearerAuth()
@Controller('admin/chat-history')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminChatHistoryController {
  constructor(private readonly chatHistoryService: ChatHistoryService) {}

  @Get('sessions')
  @ApiOperation({ summary: 'Get all chat sessions (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of chat sessions with user information',
    schema: {
      example: {
        sessions: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            sessionId: '123e4567-e89b-12d3-a456-426614174000',
            botType: 'nbv',
            messageCount: 5,
            lastMessageAt: '2026-02-23T10:30:00.000Z',
            isAnonymous: false,
            createdAt: '2026-02-23T10:00:00.000Z',
            user: {
              id: '456e7890-e89b-12d3-a456-426614174000',
              email: 'john@example.com',
              firstName: 'John',
              lastName: 'Doe',
              name: 'John Doe',
              isGuest: true,
            },
          },
        ],
        total: 100,
        page: 1,
        limit: 10,
        totalPages: 10,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getAllSessions(@Query() query: QuerySessionsDto) {
    return this.chatHistoryService.getAllSessions(query);
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get session details with all messages (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns session details with all messages and user information',
    schema: {
      example: {
        session: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          sessionId: '123e4567-e89b-12d3-a456-426614174000',
          botType: 'nbv',
          messageCount: 5,
          lastMessageAt: '2026-02-23T10:30:00.000Z',
          isAnonymous: false,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          createdAt: '2026-02-23T10:00:00.000Z',
          user: {
            id: '456e7890-e89b-12d3-a456-426614174000',
            email: 'john@example.com',
            firstName: 'John',
            lastName: 'Doe',
            name: 'John Doe',
            isGuest: true,
          },
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
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSessionMessages(@Param('sessionId') sessionId: string) {
    return this.chatHistoryService.getSessionMessages(sessionId);
  }
}
