REVOKE ALL ON FUNCTION public.claim_next_juz(uuid) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_next_juz(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;