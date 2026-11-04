-- Rollback note: prior function body is restored only by re-applying foundation migration.
-- This rollback is intentionally a no-op document; do not drop the trigger.
select '20261104_05 rollback is a documented no-op; re-apply foundation to restore prior exception SQLSTATE' as note;
