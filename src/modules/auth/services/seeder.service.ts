import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';

@Injectable()
export class SeederService implements OnModuleInit {
  private readonly SALT_ROUNDS = 12;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultUsers();
  }

  private async seedDefaultUsers() {
    const defaultUsers = [
      {
        email: 'lounatale@nbvgroup.ca',
        password: 'nbvD@shboard2025',
        name: 'Lou Natale',
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
        });
        await this.userRepository.save(user);
        Logger.log(`[SeederService] Default user created: ${userData.email}`);
      } else {
        Logger.log(
          `[SeederService] Default user already exists: ${userData.email}`,
        );
      }
    }
  }
}
