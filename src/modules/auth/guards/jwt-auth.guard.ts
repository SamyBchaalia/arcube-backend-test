import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    this.logger.log(`Checking JWT authentication for ${request.method} ${request.url}`);

    if (!authHeader) {
      this.logger.warn('No Authorization header found');
    } else {
      this.logger.debug(`Authorization header present: ${authHeader.substring(0, 20)}...`);
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      this.logger.error('Authentication failed', {
        error: err?.message,
        info: info?.message,
        hasUser: !!user,
      });
      throw err || new UnauthorizedException('Authentication required');
    }

    this.logger.log(`User authenticated: ${user.email} (${user.role})`);
    return user;
  }
}
