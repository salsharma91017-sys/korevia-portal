-- Newer Supabase projects do not automatically give the server-side role (service_role) access to tables
-- created in the SQL editor. The portal's server code uses that role for every write and for the CI push,
-- so grant it explicitly. Safe to run more than once.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
