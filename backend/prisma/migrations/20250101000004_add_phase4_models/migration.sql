-- backend/prisma/migrations/20250101000004_add_phase4_models/migration.sql
-- API Publique
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "keyHash" TEXT NOT NULL,
    "scopes" TEXT[],
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApiLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "status" INTEGER NOT NULL,
    "responseTime" INTEGER,
    "requestSize" INTEGER,
    "queryParams" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Webhook" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT[],
    "secret" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebhookLog" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "responseCode" INTEGER,
    "responseBody" TEXT,
    "error" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- Intégrations tierces
CREATE TABLE "IntegrationConfig" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConfig_pkey" PRIMARY KEY ("id")
);

-- Ajouter ORCID aux utilisateurs
ALTER TABLE "User" ADD COLUMN "orcidId" TEXT;
ALTER TABLE "User" ADD COLUMN "orcidAccessToken" TEXT;
ALTER TABLE "User" ADD COLUMN "orcidLinkedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "orcidProfile" JSONB;

-- Ajouter des champs pour les intégrations
ALTER TABLE "Reference" ADD COLUMN "zoteroKey" TEXT;
ALTER TABLE "Reference" ADD COLUMN "zoteroVersion" INTEGER;
ALTER TABLE "Reference" ADD COLUMN "scholarId" TEXT;
ALTER TABLE "Reference" ADD COLUMN "crossrefId" TEXT;

-- Plans utilisateur pour le rate limiting
CREATE TYPE "PlanType" AS ENUM ('FREE', 'PRO', 'ENTERPRISE', 'CUSTOM');

CREATE TABLE "UserPlan" (
    "id" TEXT NOT NULL,
    "plan" "PlanType" NOT NULL DEFAULT 'FREE',
    "userId" TEXT NOT NULL,
    "limits" JSONB,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPlan_pkey" PRIMARY KEY ("id")
);

-- Index
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");
CREATE INDEX "ApiKey_expiresAt_idx" ON "ApiKey"("expiresAt");

CREATE INDEX "ApiLog_userId_idx" ON "ApiLog"("userId");
CREATE INDEX "ApiLog_apiKeyId_idx" ON "ApiLog"("apiKeyId");
CREATE INDEX "ApiLog_createdAt_idx" ON "ApiLog"("createdAt");
CREATE INDEX "ApiLog_endpoint_idx" ON "ApiLog"("endpoint");

CREATE INDEX "Webhook_userId_idx" ON "Webhook"("userId");
CREATE INDEX "Webhook_enabled_idx" ON "Webhook"("enabled");

CREATE INDEX "WebhookLog_webhookId_idx" ON "WebhookLog"("webhookId");
CREATE INDEX "WebhookLog_createdAt_idx" ON "WebhookLog"("createdAt");

CREATE UNIQUE INDEX "IntegrationConfig_userId_service_key" ON "IntegrationConfig"("userId", "service");
CREATE INDEX "IntegrationConfig_userId_idx" ON "IntegrationConfig"("userId");

CREATE INDEX "User_orcidId_idx" ON "User"("orcidId");

CREATE UNIQUE INDEX "UserPlan_userId_key" ON "UserPlan"("userId");
CREATE INDEX "UserPlan_plan_idx" ON "UserPlan"("plan");

-- Clés étrangères
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApiLog" ADD CONSTRAINT "ApiLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiLog" ADD CONSTRAINT "ApiLog_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WebhookLog" ADD CONSTRAINT "WebhookLog_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IntegrationConfig" ADD CONSTRAINT "IntegrationConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPlan" ADD CONSTRAINT "UserPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
