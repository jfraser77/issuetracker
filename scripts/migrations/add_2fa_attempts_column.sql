-- Migration: add attempts to TwoFactorAuth
-- Run this once against the Azure SQL database BEFORE deploying the 2FA rate limiting change.
-- The column counts verification attempts per code; after 5 the code is burned
-- and the user must request a new one (see lib/twoFactor.ts).

IF NOT EXISTS (
    SELECT 1
    FROM   sys.columns
    WHERE  object_id = OBJECT_ID(N'dbo.TwoFactorAuth')
      AND  name      = N'attempts'
)
BEGIN
    ALTER TABLE dbo.TwoFactorAuth
    ADD attempts INT NOT NULL CONSTRAINT DF_TwoFactorAuth_attempts DEFAULT 0;

    PRINT 'Column attempts added to dbo.TwoFactorAuth';
END
ELSE
BEGIN
    PRINT 'Column attempts already exists — skipping';
END
