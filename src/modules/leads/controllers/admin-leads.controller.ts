import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { LeadsService } from '../services/leads.service';
import { QueryLeadsDto } from '../dto/query-leads.dto';
import { UpdateLeadDto } from '../dto/update-lead.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/enums/user-role.enum';

@ApiTags('Admin - Leads')
@ApiBearerAuth()
@Controller('admin/leads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminLeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @ApiOperation({ summary: 'List chatbot leads, newest first (Admin only)' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        leads: [
          {
            id: '7c1a6f2e-0f7c-4d5f-9b6e-1c2d3e4f5a6b',
            sessionId: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Cheri',
            phone: '416-555-0100',
            phoneE164: '+14165550100',
            email: null,
            preferredMethod: 'phone',
            bestTime: null,
            topic: 'Wants Lou to call about sales coaching',
            pagePath: '/services/Sales_Coaching',
            ip: '203.0.113.7',
            userAgent: 'Mozilla/5.0...',
            status: 'new',
            notes: null,
            createdAt: '2026-10-20T14:05:00.000Z',
            updatedAt: '2026-10-20T14:05:00.000Z',
            messageCount: 4,
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async list(@Query() query: QueryLeadsDto) {
    return this.leadsService.findAll(query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a lead status and/or notes (Admin only)' })
  @ApiResponse({ status: 200, description: 'Updated lead' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateLeadDto,
  ) {
    return this.leadsService.update(id, body);
  }
}
