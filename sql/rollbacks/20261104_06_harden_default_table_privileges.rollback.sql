-- Rollback of 20261104_06: intentionally NOT provided as a re-grant of ALL privileges, because that would
-- re-open anon write-type privileges and authenticated TRUNCATE on the registry tables.
-- If the migration must be undone, grant only the specific privilege that is missing, after the boss approves it.
select 'no-op: 20261104_06 only tightens privileges' as note;
