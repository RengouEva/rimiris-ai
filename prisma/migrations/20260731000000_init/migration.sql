-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "tier" TEXT NOT NULL DEFAULT 'free',
    "createdAt" BIGINT NOT NULL DEFAULT 0,
    "lastLoginAt" BIGINT
);

-- CreateTable
CREATE TABLE "pending_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT,
    "accountId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'pro',
    "amountXAF" INTEGER NOT NULL,
    "docType" TEXT,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" BIGINT NOT NULL DEFAULT 0,
    "paidAt" BIGINT,
    "failureReason" TEXT,
    CONSTRAINT "pending_payments_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE CASCADE
);

-- CreateTable
CREATE TABLE "payment_webhook_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ts" BIGINT NOT NULL DEFAULT 0,
    "provider" TEXT NOT NULL,
    "eventType" TEXT,
    "reference" TEXT,
    "status" TEXT NOT NULL,
    "httpStatus" INTEGER NOT NULL,
    "error" TEXT,
    "signatureHeader" TEXT,
    "bodyPreview" TEXT,
    "accountId" TEXT,
    CONSTRAINT "payment_webhook_events_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE SET NULL
);

-- CreateTable
CREATE TABLE "revenues" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ts" BIGINT NOT NULL DEFAULT 0,
    "amount" INTEGER NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'pro',
    "accountId" TEXT NOT NULL,
    "provider" TEXT,
    "reference" TEXT,
    CONSTRAINT "revenues_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE CASCADE
);

-- CreateTable
CREATE TABLE "payment_configs" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "activeProvider" TEXT NOT NULL DEFAULT 'stripe',
    "configJson" TEXT NOT NULL,
    "updatedAt" BIGINT NOT NULL DEFAULT 0,
    "updatedBy" TEXT
);

-- CreateTable
CREATE TABLE "payment_config_audits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ts" BIGINT NOT NULL DEFAULT 0,
    "admin" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "fields" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_email_key" ON "accounts"("email");

-- CreateIndex
CREATE INDEX "accounts_email_idx" ON "accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "pending_payments_reference_key" ON "pending_payments"("reference");

-- CreateIndex
CREATE INDEX "pending_payments_accountId_idx" ON "pending_payments"("accountId");

-- CreateIndex
CREATE INDEX "pending_payments_provider_providerRef_idx" ON "pending_payments"("provider", "providerRef");

-- CreateIndex
CREATE INDEX "pending_payments_status_createdAt_idx" ON "pending_payments"("status", "createdAt");

-- CreateIndex
CREATE INDEX "payment_webhook_events_ts_idx" ON "payment_webhook_events"("ts");

-- CreateIndex
CREATE INDEX "payment_webhook_events_provider_ts_idx" ON "payment_webhook_events"("provider", "ts");

-- CreateIndex
CREATE INDEX "payment_webhook_events_status_idx" ON "payment_webhook_events"("status");

-- CreateIndex
CREATE INDEX "revenues_accountId_idx" ON "revenues"("accountId");

-- CreateIndex
CREATE INDEX "revenues_ts_idx" ON "revenues"("ts");

-- CreateIndex
CREATE INDEX "payment_config_audits_ts_idx" ON "payment_config_audits"("ts");
