import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    Logger.log('[JwtAuthGuard] Checking JWT authentication');
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      Logger.log('[JwtAuthGuard] Authentication failed');
      throw err || new UnauthorizedException('Authentication required');
    }
    return user;
  }
}
