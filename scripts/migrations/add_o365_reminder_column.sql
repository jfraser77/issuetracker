-- Migration: add o365ReminderSentAt to Terminations
-- Run this once against the Azure SQL database before deploying the Azure Function.
-- The column tracks whether the 30-day O365 license removal reminder has been sent,
-- preventing duplicate emails if the timer function fires more than once on the same day.

IF NOT EXISTS (
    SELECT 1
    FROM   sys.columns
    WHERE  object_id = OBJECT_ID(N'dbo.Terminations')
      AND  name      = N'o365ReminderSentAt'
)
BEGIN
    ALTER TABLE dbo.Terminations
    ADD o365ReminderSentAt DATETIME2 NULL;

    PRINT 'Column o365ReminderSentAt added to dbo.Terminations';
END
ELSE
BEGIN
    PRINT 'Column o365ReminderSentAt already exists — skipping';
END
