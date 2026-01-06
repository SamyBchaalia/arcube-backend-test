import {
  Injectable,
  Logger,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { SignupDto } from '../dto/signup.dto';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 12;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async signup(
    signupDto: SignupDto,
  ): Promise<{ accessToken: string; user: Partial<User> }> {
    Logger.log('[signup] Starting user registration');
    const { email, password, name } = signupDto;

    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
    if (existingUser) {
      Logger.log('[signup] User already exists with this email');
      throw new ConflictException('User with this email already exists');
    }

    try {
      Logger.log('[signup] Hashing password');
      const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

      Logger.log('[signup] Creating new user');
      const user = this.userRepository.create({
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
      });
      await this.userRepository.save(user);

      Logger.log('[signup] Generating JWT token');
      const accessToken = this.generateToken(user);

      Logger.log('[signup] User registration completed successfully');
      return {
        accessToken,
        user: this.sanitizeUser(user),
      };
    } catch (error) {
      Logger.error('[signup] Error during registration', error);
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ accessToken: string; user: Partial<User> }> {
    Logger.log('[login] Starting user authentication');
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
    if (!user) {
      Logger.log('[login] User not found');
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      Logger.log('[login] User account is deactivated');
      throw new UnauthorizedException('Account is deactivated');
    }

    Logger.log('[login] Verifying password');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      Logger.log('[login] Invalid password');
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    Logger.log('[login] Generating JWT token');
    const accessToken = this.generateToken(user);

    Logger.log('[login] User authenticated successfully');
    return {
      accessToken,
      user: this.sanitizeUser(user),
    };
  }

  async validateUserById(userId: string): Promise<User | null> {
    Logger.log('[validateUserById] Validating user');
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.isActive) {
      return null;
    }
    return user;
  }

  async getProfile(userId: string): Promise<Partial<User>> {
    Logger.log('[getProfile] Fetching user profile');
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.sanitizeUser(user);
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
    };
    return this.jwtService.sign(payload);
  }

  private sanitizeUser(user: User): Partial<User> {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}
