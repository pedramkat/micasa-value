# Telegram Bot Session Management

## Overview

Session management for the Telegram bot ensures that user sessions start when they click an "Ad" button and end either:
- When the user clicks an "End" button
- After 1 hour of inactivity (automatic timeout)

## Database Schema

### Session Model

```prisma
model Session {
  id         String    @id @default(cuid())
  userId     String?
  user       User?     @relation(fields: [userId], references: [id], onDelete: Cascade)
  telegramId String
  startedAt  DateTime  @default(now())
  endedAt    DateTime?
  expiresAt  DateTime
  isActive   Boolean   @default(true)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@index([telegramId])
  @@index([userId])
}
```

## API Endpoints

### 1. Start a Session
**POST** `/api/sessions`

**Request Body:**
```json
{
  "telegramId": "123456789",
  "userId": "optional-user-id"
}
```

**Response:**
```json
{
  "id": "session-id",
  "telegramId": "123456789",
  "userId": null,
  "startedAt": "2024-02-15T12:00:00Z",
  "expiresAt": "2024-02-15T13:00:00Z",
  "isActive": true
}
```

### 2. Get Active Session
**GET** `/api/sessions?telegramId=123456789`

**Response:**
```json
{
  "id": "session-id",
  "telegramId": "123456789",
  "startedAt": "2024-02-15T12:00:00Z",
  "expiresAt": "2024-02-15T13:00:00Z",
  "isActive": true
}
```

### 3. End a Session
**PUT** `/api/sessions/[id]`

**Request Body:**
```json
{
  "action": "end"
}
```

**Response:**
```json
{
  "id": "session-id",
  "isActive": false,
  "endedAt": "2024-02-15T12:30:00Z"
}
```

### 4. Cleanup Expired Sessions
**POST** `/api/sessions/cleanup`

**Response:**
```json
{
  "message": "Expired sessions cleaned up",
  "count": 5
}
```

## Helper Functions

Use the helper functions from `/lib/session.ts`:

### Create a Session
```typescript
import { createSession } from "@/lib/session";

const session = await createSession(telegramId, userId);
```

### Check for Active Session
```typescript
import { getActiveSession, isSessionActive } from "@/lib/session";

// Get full session details
const session = await getActiveSession(telegramId);

// Just check if active
const isActive = await isSessionActive(telegramId);
```

### End a Session
```typescript
import { endSession } from "@/lib/session";

await endSession(sessionId);
```

### Cleanup Expired Sessions
```typescript
import { cleanupExpiredSessions } from "@/lib/session";

// Returns number of sessions cleaned up
const count = await cleanupExpiredSessions();
```

### Extend a Session
```typescript
import { extendSession } from "@/lib/session";

// Extend by 1 hour (default)
await extendSession(sessionId);

// Extend by custom hours
await extendSession(sessionId, 2);
```

## Telegram Bot Integration Example

```typescript
import { Telegraf } from "telegraf";
import { createSession, getActiveSession, endSession } from "@/lib/session";

const bot = new Telegraf(process.env.BOT_TOKEN!);

// Start session when user clicks "Ad" button
bot.action("start_ad", async (ctx) => {
  try {
    const telegramId = ctx.from.id.toString();
    
    // Check if session already active
    const existingSession = await getActiveSession(telegramId);
    if (existingSession) {
      await ctx.reply("You already have an active session!");
      return;
    }

    // Create new session
    const session = await createSession(telegramId);
    
    await ctx.reply(
      "Session started! It will expire in 1 hour or when you click 'End Session'.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "End Session", callback_data: "end_session" }],
          ],
        },
      }
    );
  } catch (error) {
    console.error("Error starting session:", error);
    await ctx.reply("Failed to start session. Please try again.");
  }
});

// End session when user clicks "End" button
bot.action("end_session", async (ctx) => {
  try {
    const telegramId = ctx.from.id.toString();
    
    const session = await getActiveSession(telegramId);
    if (!session) {
      await ctx.reply("No active session found.");
      return;
    }

    await endSession(session.id);
    await ctx.reply("Session ended successfully!");
  } catch (error) {
    console.error("Error ending session:", error);
    await ctx.reply("Failed to end session. Please try again.");
  }
});

// Periodic cleanup of expired sessions (run every 5 minutes)
setInterval(async () => {
  try {
    const count = await cleanupExpiredSessions();
    if (count > 0) {
      console.log(`Cleaned up ${count} expired sessions`);
    }
  } catch (error) {
    console.error("Error cleaning up sessions:", error);
  }
}, 5 * 60 * 1000);
```

## Session Timeout

Sessions automatically expire after 1 hour. The `expiresAt` field is set to 1 hour from creation. You can:

1. **Auto-cleanup**: Run the cleanup endpoint periodically via cron job or setInterval
2. **Check expiration**: Before using a session, always check if it's still active using the API or helper functions
3. **Extend sessions**: Use the `extendSession` function if needed

## Recommended Cron Job

Add a cron job to cleanup expired sessions:

```typescript
// app/api/cron/cleanup-sessions/route.ts
import { cleanupExpiredSessions } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET() {
  const count = await cleanupExpiredSessions();
  return NextResponse.json({ 
    message: "Cleanup completed", 
    sessionsCleanedUp: count 
  });
}
```

Configure your hosting provider to hit this endpoint every 5-10 minutes.
