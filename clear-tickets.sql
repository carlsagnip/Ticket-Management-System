-- Query to empty all tickets
-- WARNING: This will permanently delete all ticket data!

TRUNCATE TABLE tickets;

-- If you want to delete them but keep the auto-increment counter (if any custom sequence exists, though we handle ID manually now):
-- DELETE FROM tickets; 
