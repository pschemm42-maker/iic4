-- Users can be saved without sending an invite email.
alter type public.user_status add value if not exists 'pending';
