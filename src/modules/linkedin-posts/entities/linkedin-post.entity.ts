import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('linkedin_posts')
export class LinkedInPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 2048 })
  link: string;

  @CreateDateColumn()
  createdAt: Date;
}
