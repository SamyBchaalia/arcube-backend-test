import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../enums/user-role.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default-secret',
    });
  }

  async validate(payload: JwtPayload) {
    Logger.log(`[JwtStrategy] Validating JWT for user: ${payload.email}`);
    Logger.debug(`[JwtStrategy] Payload: sub=${payload.sub}, role=${payload.role}`);

    const user = await this.authService.validateUserById(payload.sub);

    if (!user) {
      Logger.error(`[JwtStrategy] User not found or inactive for ID: ${payload.sub}`);
      throw new UnauthorizedException('Invalid token');
    }

    Logger.log(`[JwtStrategy] User validated: ${user.email} (${user.role}), Active: ${user.isActive}`);
    return user;
  }
}
