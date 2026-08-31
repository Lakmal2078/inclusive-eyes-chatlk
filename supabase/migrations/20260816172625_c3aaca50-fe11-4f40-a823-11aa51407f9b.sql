REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;

DROP POLICY "Anyone views active accounts" ON public.bank_accounts;
CREATE POLICY "Visitors view active accounts" ON public.bank_accounts FOR SELECT TO anon USING (active);
CREATE POLICY "Users view accounts" ON public.bank_accounts FOR SELECT TO authenticated USING (active OR public.has_role(auth.uid(), 'admin'));