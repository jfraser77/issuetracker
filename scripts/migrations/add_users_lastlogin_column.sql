-- Migration: add lastLogin to Users
-- Run this once against the Azure SQL database. Safe to run before or after deploying:
-- the signin action writes lastLogin but ignores failures, and the admin user list
-- falls back to createdAt. app/api/admin/users/[id]/route.ts (PUT) selects it
-- directly, so editing users fails until this has run.
-- Existing rows get NULL until the user next signs in; the admin user list shows
-- createdAt in its place (ISNULL in app/api/admin/users/route.ts).

IF NOT EXISTS (
    SELECT 1
    FROM   sys.columns
    WHERE  object_id = OBJECT_ID(N'dbo.Users')
      AND  name      = N'lastLogin'
)
BEGIN
    ALTER TABLE dbo.Users
    ADD lastLogin DATETIME2 NULL;

    PRINT 'Column lastLogin added to dbo.Users';
END
ELSE
BEGIN
    PRINT 'Column lastLogin already exists — skipping';
END
