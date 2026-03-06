import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/auth/entities/user.entity';
import { UserRole } from '../src/modules/auth/enums/user-role.enum';

/**
 * Script to make any user an admin
 * Usage: npm run make-admin your-email@example.com
 */
async function makeAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error('❌ Error: Email address is required');
    console.log('\nUsage: npm run make-admin <email>');
    console.log('Example: npm run make-admin john@example.com\n');
    process.exit(1);
  }

  console.log('🚀 Starting admin script...\n');

  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);
    const userRepository = dataSource.getRepository(User);

    console.log(`🔍 Looking for user: ${email}`);

    const user = await userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      console.error(`\n❌ User not found: ${email}`);
      console.log('\n💡 User must sign up first before being made an admin.');
      await app.close();
      process.exit(1);
    }

    console.log(`✅ User found: ${user.name} (${user.email})`);
    console.log(`   Current role: ${user.role}`);
    console.log(`   Active status: ${user.isActive}`);

    if (user.role === UserRole.ADMIN) {
      console.log('\n✅ User is already an ADMIN!');
    } else {
      console.log('\n🔧 Updating user to ADMIN...');

      user.role = UserRole.ADMIN;
      user.isActive = true;

      await userRepository.save(user);

      console.log('✅ Successfully updated user to ADMIN!');
    }

    console.log('\n📊 Final user details:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   Guest: ${user.isGuest || false}`);
    console.log(`   Last Login: ${user.lastLoginAt || 'Never'}`);

    console.log('\n✨ Script completed successfully!\n');

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error occurred:', error);
    process.exit(1);
  }
}

makeAdmin();
