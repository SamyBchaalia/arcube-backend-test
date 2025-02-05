import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import axios from 'axios';
import { Logger } from '@nestjs/common';

@ValidatorConstraint({ async: true })
export class URLReachableValidator implements ValidatorConstraintInterface {
  async validate(url: string) {
    try {
      const response = await axios.get(url, { timeout: 5000 });
      return response.status >= 200 && response.status < 400;
    } catch (error) {
      Logger.error(error);
      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    return 'The URL is not responding or is unreachable' + args.value;
  }
}
