import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';

@Injectable()
export class SeederService implements OnModuleInit {
  private readonly SALT_ROUNDS = 12;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.migrateExistingUsers();
    await this.seedDefaultUsers();
  }

  /**
   * Migration: Set all existing users without a role or with 'client' role to 'admin'
   * This ensures backward compatibility for existing users
   */
  private async migrateExistingUsers() {
    Logger.log('[SeederService] Starting user role migration');

    try {
      // Find all users (existing users will have default 'client' role after schema update)
      const existingUsers = await this.userRepository.find();

      if (existingUsers.length > 0) {
        Logger.log(`[SeederService] Found ${existingUsers.length} existing users`);

        // Update all existing users to 'admin' role
        // This assumes all existing users should be admins
        const updateResult = await this.userRepository
          .createQueryBuilder()
          .update(User)
          .set({ role: UserRole.ADMIN })
          .where('role = :clientRole', { clientRole: UserRole.CLIENT })
          .execute();

        if (updateResult.affected && updateResult.affected > 0) {
          Logger.log(
            `[SeederService] Migrated ${updateResult.affected} existing users to admin role`,
          );
        } else {
          Logger.log('[SeederService] No users needed migration');
        }
      } else {
        Logger.log('[SeederService] No existing users found, skipping migration');
      }
    } catch (error) {
      Logger.error('[SeederService] Error during user role migration', error);
    }
  }

  private async seedDefaultUsers() {
    const defaultUsers = [
      {
        email: 'lounatale@nbvgroup.ca',
        password: 'nbvD@shboard2025',
        name: 'Lou Natale',
        role: UserRole.ADMIN,
      },
    ];

    for (const userData of defaultUsers) {
      const existingUser = await this.userRepository.findOne({
        where: { email: userData.email.toLowerCase() },
      });

      if (!existingUser) {
        Logger.log(`[SeederService] Creating default user: ${userData.email}`);
        const hashedPassword = await bcrypt.hash(
          userData.password,
          this.SALT_ROUNDS,
        );
        const user = this.userRepository.create({
          email: userData.email.toLowerCase(),
          password: hashedPassword,
          name: userData.name,
          role: userData.role,
        });
        await this.userRepository.save(user);
        Logger.log(`[SeederService] Default user created: ${userData.email}`);
      } else {
        // Update existing default user to admin if not already
        if (existingUser.role !== UserRole.ADMIN) {
          await this.userRepository.update(existingUser.id, {
            role: UserRole.ADMIN,
          });
          Logger.log(
            `[SeederService] Updated ${userData.email} role to admin`,
          );
        } else {
          Logger.log(
            `[SeederService] Default user already exists: ${userData.email}`,
          );
        }
      }
    }
  }
}
