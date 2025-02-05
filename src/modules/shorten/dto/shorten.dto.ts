import { IsNotEmpty, IsUrl, Validate } from 'class-validator';
import { URLReachableValidator } from '../validators/url-reachable.validator';

export class CreateUrlDto {
  @IsNotEmpty({ message: 'URL cannot be empty' })
  @IsUrl({}, { message: 'Invalid URL format' })
  @Validate(URLReachableValidator, { message: 'URL is not reachable' })
  originalUrl: string;
}
