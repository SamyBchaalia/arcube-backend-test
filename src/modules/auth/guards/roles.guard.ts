import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../enums/user-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      this.logger.debug('No roles required for this endpoint');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    this.logger.log(`Checking roles for ${request.method} ${request.url}`);
    this.logger.debug(`Required roles: ${requiredRoles.join(', ')}`);

    if (!user) {
      this.logger.error('No user found in request (JWT guard should have run first)');
      return false;
    }

    this.logger.debug(`User: ${user.email}, Role: ${user.role}`);

    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      this.logger.warn(
        `Access denied - User role "${user.role}" not in required roles: [${requiredRoles.join(', ')}]`,
      );
    } else {
      this.logger.log(`Access granted - User has required role: ${user.role}`);
    }

    return hasRole;
  }
}
