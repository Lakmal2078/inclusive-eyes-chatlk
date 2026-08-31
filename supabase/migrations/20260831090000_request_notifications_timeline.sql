-- Request timeline and user notifications
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE TABLE IF NOT EXISTS public.transaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  created_by UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transaction_events_transaction_id_created_at_idx
  ON public.transaction_events (transaction_id, created_at ASC);

GRANT SELECT ON public.transaction_events TO authenticated;
GRANT INSERT ON public.transaction_events TO authenticated;
GRANT ALL ON public.transaction_events TO service_role;
ALTER TABLE public.transaction_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own transaction timeline" ON public.transaction_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_id
        AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
CREATE POLICY "Admins create transaction timeline" ON public.transaction_events
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own initial timeline" ON public.transaction_events
  FOR INSERT TO authenticated
  WITH CHECK (
    status = 'PENDING' AND created_by = auth.uid() AND EXISTS (
      SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND t.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'transaction',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx
  ON public.notifications (user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users mark own notifications read" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins create notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
