import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from '../entities/lead.entity';
import { ChatSession } from '../../chat-history/entities/chat-session.entity';
import { QueryLeadsDto } from '../dto/query-leads.dto';
import { UpdateLeadDto } from '../dto/update-lead.dto';
import { NormalizedLeadInput } from '../utils/lead-input';

export interface LeadRequestContext {
  sessionId: string;
  pagePath?: string;
  ip?: string;
  userAgent?: string;
}

export interface LeadListItem extends Lead {
  messageCount: number;
}

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @InjectRepository(ChatSession)
    private readonly sessionRepository: Repository<ChatSession>,
  ) {}

  async createLead(
    input: NormalizedLeadInput,
    context: LeadRequestContext,
  ): Promise<Lead> {
    const lead = this.leadRepository.create({
      sessionId: context.sessionId,
      name: input.name,
      phone: input.phone,
      phoneE164: input.phoneE164,
      email: input.email,
      preferredMethod: input.preferredMethod,
      bestTime: input.bestTime,
      topic: input.topic,
      pagePath: context.pagePath?.slice(0, 200) ?? null,
      ip: context.ip?.slice(0, 45) ?? null,
      userAgent: context.userAgent ?? null,
    });
    const saved = await this.leadRepository.save(lead);
    Logger.log(
      `[LeadsService] Lead ${saved.id} created for session ${context.sessionId}`,
    );
    return saved;
  }

  async findAll(query: QueryLeadsDto): Promise<{
    leads: LeadListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, status, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const qb = this.leadRepository
      .createQueryBuilder('lead')
      .orderBy('lead.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) {
      qb.andWhere('lead.status = :status', { status });
    }
    if (startDate) {
      qb.andWhere('lead.createdAt >= :startDate', {
        startDate: new Date(startDate),
      });
    }
    if (endDate) {
      qb.andWhere('lead.createdAt <= :endDate', { endDate: new Date(endDate) });
    }

    const [leads, total] = await qb.getManyAndCount();

    // Attach the message count of each lead's chat session.
    const sessionIds = [...new Set(leads.map((l) => l.sessionId))];
    const counts = new Map<string, number>();
    if (sessionIds.length) {
      const sessions = await this.sessionRepository
        .createQueryBuilder('session')
        .select(['session.sessionId', 'session.messageCount'])
        .where('session.sessionId IN (:...sessionIds)', { sessionIds })
        .getMany();
      for (const s of sessions) counts.set(s.sessionId, s.messageCount);
    }

    return {
      leads: leads.map((lead) => ({
        ...lead,
        messageCount: counts.get(lead.sessionId) ?? 0,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, dto: UpdateLeadDto): Promise<Lead> {
    const lead = await this.leadRepository.findOne({ where: { id } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
    if (dto.status !== undefined) lead.status = dto.status;
    if (dto.notes !== undefined) lead.notes = dto.notes;
    const saved = await this.leadRepository.save(lead);
    Logger.log(`[LeadsService] Lead ${id} updated (status=${saved.status})`);
    return saved;
  }

  /** Number of leads per public session id, for the admin sessions list. */
  async countBySessionIds(sessionIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (!sessionIds.length) return counts;
    const rows: { sessionId: string; count: string }[] =
      await this.leadRepository
        .createQueryBuilder('lead')
        .select('lead.sessionId', 'sessionId')
        .addSelect('COUNT(*)', 'count')
        .where('lead.sessionId IN (:...sessionIds)', { sessionIds })
        .groupBy('lead.sessionId')
        .getRawMany();
    for (const row of rows) counts.set(row.sessionId, Number(row.count));
    return counts;
  }
}
