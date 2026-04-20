import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ShortenModule } from './modules/shorten/shorten.module';
import { AuthModule } from './modules/auth/auth.module';
import { LinkedInPostsModule } from './modules/linkedin-posts/linkedin-posts.module';
import { ProductsModule } from './modules/products/products.module';
import { PackagesModule } from './modules/packages/packages.module';
import { OrdersModule } from './modules/orders/orders.module';
import { EmailModule } from './modules/email/email.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ChatHistoryModule } from './modules/chat-history/chat-history.module';
import { QRCodeModule } from './modules/qr-code/qr-code.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get('DB_USER', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_NAME', 'nbv'),
        autoLoadEntities: true,
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    ShortenModule,
    AuthModule,
    LinkedInPostsModule,
    ProductsModule,
    PackagesModule,
    OrdersModule,
    EmailModule,
    PaymentsModule,
    ChatHistoryModule,
    QRCodeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
