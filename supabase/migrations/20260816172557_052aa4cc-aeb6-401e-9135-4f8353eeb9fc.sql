CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  player_id TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.bank_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  number TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏦',
  type TEXT NOT NULL DEFAULT 'BANK',
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bank_accounts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views active accounts" ON public.bank_accounts FOR SELECT TO anon, authenticated USING (active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage accounts" ON public.bank_accounts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  whatsapp_number TEXT NOT NULL DEFAULT '+94765865387',
  min_transaction INTEGER NOT NULL DEFAULT 1000,
  max_transaction INTEGER NOT NULL DEFAULT 500000,
  promo_code TEXT NOT NULL DEFAULT 'VGSL',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_single_row CHECK (id = 1)
);
GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views settings" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins update settings" ON public.app_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert settings" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE DEFAULT ('TXN' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  amount NUMERIC(12,2) NOT NULL,
  player_id TEXT,
  payment_method TEXT,
  receipt_reference TEXT,
  receipt_image TEXT,
  security_code TEXT,
  full_name TEXT,
  bank TEXT,
  account_number TEXT,
  contact_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.transactions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guests submit requests" ON public.transactions FOR INSERT TO anon WITH CHECK (user_id IS NULL);
CREATE POLICY "Users submit own requests" ON public.transactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users view own requests" ON public.transactions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update requests" ON public.transactions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_settings (id) VALUES (1);

INSERT INTO public.bank_accounts (id, name, number, icon, type, sort_order) VALUES
  ('boc', 'BOC (Walasmulla)', '95645895', '🏛️', 'BANK', 1),
  ('peoples', 'PEOPLE''S BANK', '120200380030196', '🏛️', 'BANK', 2),
  ('sampath', 'SAMPATH BANK', '105456146706', '🏛️', 'BANK', 3),
  ('lolc', 'LOLC BANK', '01210012722', '🏛️', 'BANK', 4),
  ('ipay_1', 'iPay Mobile 1', '0740452530', '📱', 'IPAY', 5),
  ('ipay_2', 'iPay Mobile 2', '0703346455', '📱', 'IPAY', 6);