import { IsArray, IsOptional, IsUUID, ValidateNested, IsString, IsNotEmpty, IsEnum, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RegisterGuestDto } from './register-guest.dto';

class MessageDto {
  @ApiProperty({ description: 'Message role', enum: ['user', 'assistant'], example: 'user' })
  @IsEnum(['user', 'assistant'])
  @IsNotEmpty()
  role: 'user' | 'assistant';

  @ApiProperty({ description: 'Message content', example: 'Tell me about your sales training programs' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class ChatRequestDto {
  @ApiProperty({
    description: 'Array of chat messages',
    type: [MessageDto],
    example: [
      { role: 'user', content: 'Tell me about your sales training programs' }
    ]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages: MessageDto[];

  @ApiPropertyOptional({ description: 'Session ID for continuing conversation', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Guest user information for registration', type: RegisterGuestDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RegisterGuestDto)
  guestUser?: RegisterGuestDto;

  @ApiPropertyOptional({
    description: 'Path of the site page the visitor is on (stored on the session and on any lead, and given to the assistant as context)',
    example: '/services/Sales_Training',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  pagePath?: string;
}
