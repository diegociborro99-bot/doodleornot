-- Doodles Run Club: Run tracking tables

CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "distanceM" INTEGER NOT NULL DEFAULT 0,
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "avgPaceSec" INTEGER NOT NULL DEFAULT 0,
    "calories" INTEGER NOT NULL DEFAULT 0,
    "route" JSONB,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RunStats" (
    "userId" TEXT NOT NULL,
    "totalRuns" INTEGER NOT NULL DEFAULT 0,
    "totalDistanceM" INTEGER NOT NULL DEFAULT 0,
    "totalDurationSec" INTEGER NOT NULL DEFAULT 0,
    "longestRunM" INTEGER NOT NULL DEFAULT 0,
    "bestPaceSec" INTEGER NOT NULL DEFAULT 0,
    "weekDistanceM" INTEGER NOT NULL DEFAULT 0,
    "weekRuns" INTEGER NOT NULL DEFAULT 0,
    "weekStart" TEXT NOT NULL DEFAULT '',
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "lastRunDay" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RunStats_pkey" PRIMARY KEY ("userId")
);

CREATE INDEX "Run_userId_idx" ON "Run"("userId");
CREATE INDEX "Run_userId_startedAt_idx" ON "Run"("userId", "startedAt");

ALTER TABLE "Run" ADD CONSTRAINT "Run_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RunStats" ADD CONSTRAINT "RunStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
