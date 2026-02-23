import prisma from "@/lib/prisma";

export interface SessionData {
  id: string;
  userId: string | null;
  telegramId: string;
  startedAt: Date;
  endedAt: Date | null;
  expiresAt: Date;
  isActive: boolean;
}

export async function createSession(telegramId: string, userId?: string): Promise<SessionData> {
  const existingActiveSession = await prisma.session.findFirst({
    where: {
      telegramId,
      isActive: true,
      expiresAt: {
        gte: new Date(),
      },
    },
  });

  if (existingActiveSession) {
    throw new Error("Active session already exists");
  }

  const oneHourFromNow = new Date();
  oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);

  return await prisma.session.create({
    data: {
      telegramId,
      userId: userId || null,
      expiresAt: oneHourFromNow,
      isActive: true,
    },
  });
}

export async function getActiveSession(telegramId: string): Promise<SessionData | null> {
  return await prisma.session.findFirst({
    where: {
      telegramId,
      isActive: true,
      expiresAt: {
        gte: new Date(),
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function endSession(sessionId: string): Promise<SessionData> {
  return await prisma.session.update({
    where: { id: sessionId },
    data: {
      isActive: false,
      endedAt: new Date(),
    },
  });
}

export async function isSessionActive(telegramId: string): Promise<boolean> {
  const session = await getActiveSession(telegramId);
  return session !== null;
}

export async function cleanupExpiredSessions(): Promise<SessionData[]> {
  // First, get all expired sessions
  const expiredSessions = await prisma.session.findMany({
    where: {
      isActive: true,
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  // Then mark them as inactive
  if (expiredSessions.length > 0) {
    await prisma.session.updateMany({
      where: {
        isActive: true,
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        isActive: false,
        endedAt: new Date(),
      },
    });
  }

  return expiredSessions;
}

export async function extendSession(sessionId: string, hours: number = 1): Promise<SessionData> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  const newExpiresAt = new Date();
  newExpiresAt.setHours(newExpiresAt.getHours() + hours);

  return await prisma.session.update({
    where: { id: sessionId },
    data: {
      expiresAt: newExpiresAt,
    },
  });
}
