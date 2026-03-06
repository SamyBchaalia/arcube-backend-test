import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ChatSession } from '../entities/chat-session.entity';
import { ChatMessage } from '../entities/chat-message.entity';
import { BotType } from '../enums/bot-type.enum';
import { MessageRole } from '../enums/message-role.enum';
import { QuerySessionsDto } from '../dto/query-sessions.dto';

interface MessageInput {
  role: 'user' | 'assistant';
  content: string;
}

interface MetadataInput {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class ChatHistoryService {
  constructor(
    @InjectRepository(ChatSession)
    private sessionRepository: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private messageRepository: Repository<ChatMessage>,
  ) {}

  async saveChatInteraction(
    sessionId: string,
    botType: BotType,
    messages: MessageInput[],
    metadata: MetadataInput,
    userId?: string,
  ): Promise<ChatSession> {
    try {
      Logger.log(`[saveChatInteraction] Saving chat interaction for session ${sessionId}`);

      // Find or create session
      let session = await this.sessionRepository.findOne({
        where: { sessionId },
      });

      if (!session) {
        Logger.log(`[saveChatInteraction] Creating new session ${sessionId}`);
        const newSession: Partial<ChatSession> = {
          sessionId: sessionId,
          botType: botType,
          userId: userId || undefined,
          ipAddress: metadata.ipAddress || undefined,
          userAgent: metadata.userAgent || undefined,
          messageCount: 0,
          lastMessageAt: new Date(),
          isAnonymous: !userId,
        };
        session = this.sessionRepository.create(newSession);
        await this.sessionRepository.save(session);
      } else {
        // Update session metadata if userId is now provided (guest registration)
        if (userId && !session.userId) {
          Logger.log(`[saveChatInteraction] Linking session to user ${userId}`);
          session.userId = userId;
          session.isAnonymous = false;
        }
        session.lastMessageAt = new Date();
      }

      // Save messages
      for (const msg of messages) {
        const messageEntity = this.messageRepository.create({
          sessionId: session.id,
          role: msg.role === 'user' ? MessageRole.USER : MessageRole.ASSISTANT,
          content: msg.content,
          sequenceNumber: session.messageCount++,
        });
        await this.messageRepository.save(messageEntity);
      }

      // Update message count
      await this.sessionRepository.save(session);

      Logger.log(`[saveChatInteraction] Chat interaction saved successfully`);
      return session;
    } catch (error) {
      Logger.error(`[saveChatInteraction] Failed to save chat interaction: ${error.message}`);
      throw error;
    }
  }

  async linkSessionToUser(sessionId: string, userId: string): Promise<void> {
    try {
      Logger.log(`[linkSessionToUser] Linking session ${sessionId} to user ${userId}`);

      const session = await this.sessionRepository.findOne({
        where: { sessionId },
      });

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      session.userId = userId;
      session.isAnonymous = false;
      await this.sessionRepository.save(session);

      Logger.log(`[linkSessionToUser] Session linked successfully`);
    } catch (error) {
      Logger.error(`[linkSessionToUser] Failed to link session: ${error.message}`);
      throw error;
    }
  }

  async getAllSessions(query: QuerySessionsDto): Promise<{
    sessions: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      Logger.log(`[getAllSessions] Fetching sessions with filters`);

      const { page = 1, limit = 10, startDate, endDate, isAnonymous } = query;
      const skip = (page - 1) * limit;

      const queryBuilder = this.sessionRepository
        .createQueryBuilder('session')
        .leftJoinAndSelect('session.user', 'user')
        .orderBy('session.lastMessageAt', 'DESC')
        .skip(skip)
        .take(limit);

      // Apply filters
      if (startDate && endDate) {
        queryBuilder.andWhere('session.createdAt BETWEEN :startDate AND :endDate', {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        });
      }

      if (typeof isAnonymous === 'boolean') {
        queryBuilder.andWhere('session.isAnonymous = :isAnonymous', { isAnonymous });
      }

      const [sessions, total] = await queryBuilder.getManyAndCount();

      // Format response
      const formattedSessions = sessions.map((session) => ({
        id: session.id,
        sessionId: session.sessionId,
        botType: session.botType,
        messageCount: session.messageCount,
        lastMessageAt: session.lastMessageAt,
        isAnonymous: session.isAnonymous,
        createdAt: session.createdAt,
        user: session.user
          ? {
              id: session.user.id,
              email: session.user.email,
              firstName: session.user.firstName,
              lastName: session.user.lastName,
              name: session.user.name,
              isGuest: session.user.isGuest,
            }
          : null,
      }));

      Logger.log(`[getAllSessions] Retrieved ${sessions.length} sessions`);
      return {
        sessions: formattedSessions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      Logger.error(`[getAllSessions] Failed to fetch sessions: ${error.message}`);
      throw error;
    }
  }

  async getSessionMessages(sessionId: string): Promise<{
    session: any;
    messages: any[];
  }> {
    try {
      Logger.log(`[getSessionMessages] Fetching messages for session ${sessionId}`);

      const session = await this.sessionRepository.findOne({
        where: { sessionId },
        relations: ['user', 'messages'],
      });

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      // Sort messages by sequence number
      const sortedMessages = session.messages.sort(
        (a, b) => a.sequenceNumber - b.sequenceNumber,
      );

      const formattedSession = {
        id: session.id,
        sessionId: session.sessionId,
        botType: session.botType,
        messageCount: session.messageCount,
        lastMessageAt: session.lastMessageAt,
        isAnonymous: session.isAnonymous,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        user: session.user
          ? {
              id: session.user.id,
              email: session.user.email,
              firstName: session.user.firstName,
              lastName: session.user.lastName,
              name: session.user.name,
              isGuest: session.user.isGuest,
            }
          : null,
      };

      const formattedMessages = sortedMessages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        sequenceNumber: msg.sequenceNumber,
        createdAt: msg.createdAt,
      }));

      Logger.log(`[getSessionMessages] Retrieved ${formattedMessages.length} messages`);
      return {
        session: formattedSession,
        messages: formattedMessages,
      };
    } catch (error) {
      Logger.error(`[getSessionMessages] Failed to fetch messages: ${error.message}`);
      throw error;
    }
  }

  // User-specific methods (non-admin)
  async getUserSessions(userId: string, query: QuerySessionsDto): Promise<{
    sessions: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      Logger.log(`[getUserSessions] Fetching sessions for user ${userId}`);

      const { page = 1, limit = 10, startDate, endDate } = query;
      const skip = (page - 1) * limit;

      const queryBuilder = this.sessionRepository
        .createQueryBuilder('session')
        .where('session.userId = :userId', { userId })
        .orderBy('session.lastMessageAt', 'DESC')
        .skip(skip)
        .take(limit);

      // Apply date filters if provided
      if (startDate && endDate) {
        queryBuilder.andWhere('session.createdAt BETWEEN :startDate AND :endDate', {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        });
      }

      const [sessions, total] = await queryBuilder.getManyAndCount();

      // Format response (without user details since it's the requesting user)
      const formattedSessions = sessions.map((session) => ({
        id: session.id,
        sessionId: session.sessionId,
        botType: session.botType,
        messageCount: session.messageCount,
        lastMessageAt: session.lastMessageAt,
        createdAt: session.createdAt,
      }));

      Logger.log(`[getUserSessions] Retrieved ${sessions.length} sessions for user`);
      return {
        sessions: formattedSessions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      Logger.error(`[getUserSessions] Failed to fetch user sessions: ${error.message}`);
      throw error;
    }
  }

  async getUserSessionMessages(userId: string, sessionId: string): Promise<{
    session: any;
    messages: any[];
  }> {
    try {
      Logger.log(`[getUserSessionMessages] Fetching messages for session ${sessionId} and user ${userId}`);

      const session = await this.sessionRepository.findOne({
        where: { sessionId },
        relations: ['messages'],
      });

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      // Verify session belongs to user
      if (session.userId !== userId) {
        Logger.warn(`[getUserSessionMessages] User ${userId} attempted to access session ${sessionId} owned by ${session.userId}`);
        throw new ForbiddenException('You do not have permission to access this session');
      }

      // Sort messages by sequence number
      const sortedMessages = session.messages.sort(
        (a, b) => a.sequenceNumber - b.sequenceNumber,
      );

      const formattedSession = {
        id: session.id,
        sessionId: session.sessionId,
        botType: session.botType,
        messageCount: session.messageCount,
        lastMessageAt: session.lastMessageAt,
        createdAt: session.createdAt,
      };

      const formattedMessages = sortedMessages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        sequenceNumber: msg.sequenceNumber,
        createdAt: msg.createdAt,
      }));

      Logger.log(`[getUserSessionMessages] Retrieved ${formattedMessages.length} messages`);
      return {
        session: formattedSession,
        messages: formattedMessages,
      };
    } catch (error) {
      Logger.error(`[getUserSessionMessages] Failed to fetch messages: ${error.message}`);
      throw error;
    }
  }
}
