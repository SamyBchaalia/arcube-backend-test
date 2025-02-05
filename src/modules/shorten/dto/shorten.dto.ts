import { IsNotEmpty, Validate } from 'class-validator';
import { URLReachableValidator } from '../validators/url-reachable.validator';

export class CreateShortenDto {
  @IsNotEmpty({ message: 'URL cannot be empty' })
  @Validate(URLReachableValidator, { message: 'URL is not reachable' })
  originalUrl: string;
}
