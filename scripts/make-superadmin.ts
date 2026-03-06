import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/auth/entities/user.entity';
import { UserRole } from '../src/modules/auth/enums/user-role.enum';

/**
 * Script to make a user a superadmin
 * Usage: npm run make-superadmin
 */
async function makeSuperAdmin() {
  console.log('🚀 Starting superadmin script...\n');

  try {
    // Bootstrap the NestJS application
    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);
    const userRepository = dataSource.getRepository(User);

    const email = 'lounatale@nbvgroup.ca';

    console.log(`🔍 Looking for user: ${email}`);

    // Find user by email
    const user = await userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      console.log('\n💡 Creating user as admin...');

      // If user doesn't exist, we should create them
      console.error('⚠️  User does not exist. Please sign up first or run the seeder.');
      await app.close();
      process.exit(1);
    }

    console.log(`✅ User found: ${user.name} (${user.email})`);
    console.log(`   Current role: ${user.role}`);
    console.log(`   Active status: ${user.isActive}`);

    // Update user to admin
    if (user.role === UserRole.ADMIN) {
      console.log('\n✅ User is already a SUPERADMIN!');
    } else {
      console.log('\n🔧 Updating user to SUPERADMIN...');

      user.role = UserRole.ADMIN;
      user.isActive = true;

      await userRepository.save(user);

      console.log('✅ Successfully updated user to SUPERADMIN!');
    }

    console.log('\n📊 Final user details:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   Last Login: ${user.lastLoginAt || 'Never'}`);

    console.log('\n✨ Script completed successfully!\n');

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error occurred:', error);
    process.exit(1);
  }
}

// Run the script
makeSuperAdmin();
