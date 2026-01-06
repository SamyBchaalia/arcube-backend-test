import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUrl, MaxLength } from 'class-validator';

export class UpdateLinkedInPostDto {
  @ApiProperty({
    description: 'LinkedIn post embed link',
    example: 'https://www.linkedin.com/embed/feed/update/urn:li:share:1234567890',
  })
  @IsNotEmpty({ message: 'Link is required' })
  @IsUrl({}, { message: 'Please provide a valid URL' })
  @MaxLength(2048, { message: 'Link must not exceed 2048 characters' })
  link: string;
}
