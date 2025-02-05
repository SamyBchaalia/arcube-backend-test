import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ShortenModule } from './modules/shorten/shorten.module';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot('mongodb://localhost:27017/shortenUrl'),
    ShortenModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
