-- Enable Realtime (Replication) for tables
-- Run this in Supabase SQL Editor if live updates are not working

begin;
  -- Enable replication for tickets
  alter publication supabase_realtime add table tickets;
  
  -- Enable replication for ticket_comments
  alter publication supabase_realtime add table ticket_comments;
commit;
