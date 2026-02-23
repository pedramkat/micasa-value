export interface Session {
  id: string;
  userId: string | null;
  telegramId: string;
  startedAt: Date;
  endedAt: Date | null;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSessionInput {
  telegramId: string;
  userId?: string;
}

export interface EndSessionInput {
  sessionId: string;
}

export interface SessionStatus {
  hasActiveSession: boolean;
  session?: Session;
  timeRemaining?: number;
}
