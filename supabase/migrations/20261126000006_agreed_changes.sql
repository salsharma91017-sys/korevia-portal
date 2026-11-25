-- Agreed changes to Module 1's scope, approved in writing by the client (email on file).
-- Schedule A's wording is changed by written variation at Module 1 close-out; until then the portal shows
-- the agreed position and keeps the original wording in the note.
update public.features
   set title = 'Practice sign-up, email verification & unique Practice ID claim for each business client',
       note  = 'Agreed change, approved by Dee in writing: one shared sign-in address where each practice has its own Practice ID, instead of a unique subdomain per business (Schedule A originally read "unique subdomain claim"). Email (verification, invitations, password reset) is sent through Resend, also approved in writing.'
 where module_n = 1 and sort = 1
   and title = 'Practice sign-up, email verification & unique subdomain claim for each business client';
