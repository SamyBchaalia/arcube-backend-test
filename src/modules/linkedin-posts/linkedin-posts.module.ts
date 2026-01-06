import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LinkedInPostsController } from './controllers/linkedin-posts.controller';
import { LinkedInPostsService } from './services/linkedin-posts.service';
import { LinkedInPost } from './entities/linkedin-post.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LinkedInPost])],
  controllers: [LinkedInPostsController],
  providers: [LinkedInPostsService],
  exports: [LinkedInPostsService],
})
export class LinkedInPostsModule {}
