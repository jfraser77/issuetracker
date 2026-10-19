-- Migration: add isActive to Users
-- Already applied to production (FedEx on nsncenterdata) on 2026-10-19; recorded here for other environments.
-- verify-credentials and the admin user routes query this column. Existing rows default
-- to active (1) so current users keep access and the last-admin checks count them.

IF NOT EXISTS (
    SELECT 1
    FROM   sys.columns
    WHERE  object_id = OBJECT_ID(N'dbo.Users')
      AND  name      = N'isActive'
)
BEGIN
    ALTER TABLE dbo.Users
    ADD isActive BIT NOT NULL CONSTRAINT DF_Users_isActive DEFAULT 1;

    PRINT 'Column isActive added to dbo.Users';
END
ELSE
BEGIN
    PRINT 'Column isActive already exists — skipping';
END
