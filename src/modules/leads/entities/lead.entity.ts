import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { LeadStatus, PreferredContactMethod } from '../enums/lead-status.enum';

/**
 * A visitor who asked (via the chatbot) to be contacted by Lou.
 * sessionId is the public chat session UUID (chat_sessions.sessionId), not the
 * row id, so a lead can be created before the session row exists.
 */
@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  sessionId: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  /** Phone number exactly as the visitor typed it. */
  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  /** E.164 form of the phone number when it could be parsed. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneE164: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({
    type: 'enum',
    enum: PreferredContactMethod,
    default: PreferredContactMethod.EITHER,
  })
  preferredMethod: PreferredContactMethod;

  @Column({ type: 'varchar', length: 200, nullable: true })
  bestTime: string | null;

  @Column({ type: 'text', nullable: true })
  topic: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  pagePath: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @Index()
  @Column({ type: 'enum', enum: LeadStatus, default: LeadStatus.NEW })
  status: LeadStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
