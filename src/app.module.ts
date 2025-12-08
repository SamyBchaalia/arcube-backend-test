import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ShortenModule } from './modules/shorten/shorten.module';

@Module({
  imports: [ConfigModule.forRoot(), ShortenModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
