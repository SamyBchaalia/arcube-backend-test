import { IsOptional, IsEnum, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { LeadStatus } from '../enums/lead-status.enum';

export class UpdateLeadDto {
  @ApiPropertyOptional({
    description: 'New status',
    enum: LeadStatus,
    example: LeadStatus.CONTACTED,
  })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiPropertyOptional({
    description: 'Internal notes (replaces existing notes)',
    example: 'Called back, booked a discovery session.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}
