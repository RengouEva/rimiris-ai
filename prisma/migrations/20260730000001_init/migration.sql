-- CreateTable
CREATE TABLE `accounts` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `salt` VARCHAR(191) NOT NULL,
    `role` ENUM('user', 'admin', 'super_admin') NOT NULL DEFAULT 'user',
    `tier` ENUM('free', 'pro') NOT NULL DEFAULT 'free',
    `createdAt` BIGINT NOT NULL DEFAULT 0,
    `lastLoginAt` BIGINT NULL,

    UNIQUE INDEX `accounts_email_key`(`email`),
    INDEX `accounts_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pending_payments` (
    `id` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerRef` VARCHAR(191) NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `tier` ENUM('free', 'pro') NOT NULL DEFAULT 'pro',
    `amountXAF` INTEGER NOT NULL,
    `docType` VARCHAR(191) NULL,
    `mode` VARCHAR(191) NOT NULL,
    `status` ENUM('pending', 'paid', 'expired', 'failed') NOT NULL DEFAULT 'pending',
    `createdAt` BIGINT NOT NULL DEFAULT 0,
    `paidAt` BIGINT NULL,
    `failureReason` TEXT NULL,

    UNIQUE INDEX `pending_payments_reference_key`(`reference`),
    INDEX `pending_payments_accountId_idx`(`accountId`),
    INDEX `pending_payments_provider_providerRef_idx`(`provider`, `providerRef`),
    INDEX `pending_payments_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_webhook_events` (
    `id` VARCHAR(191) NOT NULL,
    `ts` BIGINT NOT NULL DEFAULT 0,
    `provider` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NULL,
    `reference` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL,
    `httpStatus` INTEGER NOT NULL,
    `error` TEXT NULL,
    `signatureHeader` VARCHAR(191) NULL,
    `bodyPreview` TEXT NULL,
    `accountId` VARCHAR(191) NULL,

    INDEX `payment_webhook_events_ts_idx`(`ts`),
    INDEX `payment_webhook_events_provider_ts_idx`(`provider`, `ts`),
    INDEX `payment_webhook_events_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `revenues` (
    `id` VARCHAR(191) NOT NULL,
    `ts` BIGINT NOT NULL DEFAULT 0,
    `amount` INTEGER NOT NULL,
    `tier` ENUM('free', 'pro') NOT NULL DEFAULT 'pro',
    `accountId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NULL,
    `reference` VARCHAR(191) NULL,

    INDEX `revenues_accountId_idx`(`accountId`),
    INDEX `revenues_ts_idx`(`ts`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_configs` (
    `key` VARCHAR(191) NOT NULL DEFAULT 'default',
    `activeProvider` VARCHAR(191) NOT NULL DEFAULT 'stripe',
    `configJson` LONGTEXT NOT NULL,
    `updatedAt` BIGINT NOT NULL DEFAULT 0,
    `updatedBy` VARCHAR(191) NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_config_audits` (
    `id` VARCHAR(191) NOT NULL,
    `ts` BIGINT NOT NULL DEFAULT 0,
    `admin` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `mode` VARCHAR(191) NOT NULL,
    `fields` TEXT NOT NULL,

    INDEX `payment_config_audits_ts_idx`(`ts`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Post` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NULL,
    `published` BOOLEAN NOT NULL DEFAULT false,
    `authorId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pending_payments` ADD CONSTRAINT `pending_payments_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_webhook_events` ADD CONSTRAINT `payment_webhook_events_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `revenues` ADD CONSTRAINT `revenues_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

