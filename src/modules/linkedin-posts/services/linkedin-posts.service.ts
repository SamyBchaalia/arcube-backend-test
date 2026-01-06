import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LinkedInPost } from '../entities/linkedin-post.entity';
import { CreateLinkedInPostDto } from '../dto/create-linkedin-post.dto';
import { UpdateLinkedInPostDto } from '../dto/update-linkedin-post.dto';

@Injectable()
export class LinkedInPostsService {
  constructor(
    @InjectRepository(LinkedInPost)
    private linkedInPostRepository: Repository<LinkedInPost>,
  ) {}

  async create(createDto: CreateLinkedInPostDto): Promise<LinkedInPost> {
    Logger.log('[create] Creating new LinkedIn post');
    const post = this.linkedInPostRepository.create({
      link: createDto.link,
    });
    const savedPost = await this.linkedInPostRepository.save(post);
    Logger.log('[create] LinkedIn post created successfully');
    return savedPost;
  }

  async findAll(): Promise<LinkedInPost[]> {
    Logger.log('[findAll] Retrieving all LinkedIn posts');
    const posts = await this.linkedInPostRepository.find({
      order: { createdAt: 'DESC' },
    });
    Logger.log(`[findAll] Found ${posts.length} LinkedIn posts`);
    return posts;
  }

  async update(
    id: string,
    updateDto: UpdateLinkedInPostDto,
  ): Promise<LinkedInPost> {
    Logger.log(`[update] Updating LinkedIn post ${id}`);
    const post = await this.linkedInPostRepository.findOne({ where: { id } });

    if (!post) {
      Logger.log(`[update] Post ${id} not found`);
      throw new NotFoundException('Post not found');
    }

    post.link = updateDto.link;
    const updatedPost = await this.linkedInPostRepository.save(post);
    Logger.log(`[update] LinkedIn post ${id} updated successfully`);
    return updatedPost;
  }

  async delete(id: string): Promise<void> {
    Logger.log(`[delete] Deleting LinkedIn post ${id}`);
    const post = await this.linkedInPostRepository.findOne({ where: { id } });

    if (!post) {
      Logger.log(`[delete] Post ${id} not found`);
      throw new NotFoundException('Post not found');
    }

    await this.linkedInPostRepository.remove(post);
    Logger.log(`[delete] LinkedIn post ${id} deleted successfully`);
  }
}
