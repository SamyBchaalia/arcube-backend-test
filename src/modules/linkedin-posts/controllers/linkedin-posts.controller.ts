import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiOkResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiParam,
  ApiNoContentResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { LinkedInPostsService } from '../services/linkedin-posts.service';
import { CreateLinkedInPostDto } from '../dto/create-linkedin-post.dto';
import { UpdateLinkedInPostDto } from '../dto/update-linkedin-post.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/enums/user-role.enum';

@Controller('linkedin-posts')
@ApiTags('LinkedIn Posts')
export class LinkedInPostsController {
  constructor(private readonly linkedInPostsService: LinkedInPostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Add a LinkedIn post',
    description: 'Add a new embedded LinkedIn post link. Requires authentication and admin role.',
  })
  @ApiBody({ type: CreateLinkedInPostDto })
  @ApiCreatedResponse({
    description: 'LinkedIn post created successfully',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        link: 'https://www.linkedin.com/embed/feed/update/urn:li:share:1234567890',
        createdAt: '2024-01-15T10:30:00.000Z',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin role required',
  })
  async create(@Body() createDto: CreateLinkedInPostDto) {
    return this.linkedInPostsService.create(createDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all LinkedIn posts',
    description:
      'Retrieve all LinkedIn posts sorted by insertion date (newest first). No authentication required.',
  })
  @ApiOkResponse({
    description: 'List of LinkedIn posts',
    schema: {
      example: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          link: 'https://www.linkedin.com/embed/feed/update/urn:li:share:1234567890',
          createdAt: '2024-01-15T10:30:00.000Z',
        },
      ],
    },
  })
  async findAll() {
    return this.linkedInPostsService.findAll();
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update a LinkedIn post',
    description: 'Update an existing LinkedIn post. Requires authentication and admin role.',
  })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiBody({ type: UpdateLinkedInPostDto })
  @ApiOkResponse({
    description: 'LinkedIn post updated successfully',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        link: 'https://www.linkedin.com/embed/feed/update/urn:li:share:0987654321',
        createdAt: '2024-01-15T10:30:00.000Z',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin role required',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateLinkedInPostDto,
  ) {
    return this.linkedInPostsService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a LinkedIn post',
    description: 'Delete an existing LinkedIn post. Requires authentication and admin role.',
  })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiNoContentResponse({
    description: 'LinkedIn post deleted successfully',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin role required',
  })
  async delete(@Param('id') id: string) {
    return this.linkedInPostsService.delete(id);
  }
}
