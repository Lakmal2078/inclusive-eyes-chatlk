-- Automatic cricket/football free tips MVP
-- Odds are immutable snapshots; tips are published only after ranking and validation.

CREATE TABLE IF NOT EXISTS public.sports_update_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport TEXT NOT NULL CHECK (sport IN ('cricket', 'football')),
  slot TEXT NOT NULL CHECK (slot IN ('morning', 'noon', 'evening', 'manual')),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'succeeded', 'partial', 'failed')),
  provider TEXT NOT NULL DEFAULT 'the-odds-api',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  fixture_count INTEGER NOT NULL DEFAULT 0,
  tip_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.sports_fixtures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'the-odds-api',
  provider_fixture_id TEXT NOT NULL,
  sport TEXT NOT NULL CHECK (sport IN ('cricket', 'football')),
  league_key TEXT,
  league_name TEXT,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  commence_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed', 'cancelled', 'unknown')),
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_fixture_id)
);

CREATE TABLE IF NOT EXISTS public.sports_odds_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id UUID NOT NULL REFERENCES public.sports_fixtures(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'the-odds-api',
  bookmaker TEXT NOT NULL,
  market_key TEXT NOT NULL,
  selection TEXT NOT NULL,
  decimal_odds NUMERIC(8,3) NOT NULL CHECK (decimal_odds > 1),
  implied_probability NUMERIC(7,5),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.sports_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_run_id UUID NOT NULL REFERENCES public.sports_update_runs(id) ON DELETE CASCADE,
  fixture_id UUID NOT NULL REFERENCES public.sports_fixtures(id) ON DELETE CASCADE,
  sport TEXT NOT NULL CHECK (sport IN ('cricket', 'football')),
  rank INTEGER NOT NULL CHECK (rank BETWEEN 1 AND 5),
  market_key TEXT NOT NULL,
  selection TEXT NOT NULL,
  decimal_odds NUMERIC(8,3) NOT NULL CHECK (decimal_odds > 1),
  score NUMERIC(7,4) NOT NULL,
  risk_band TEXT NOT NULL CHECK (risk_band IN ('lower', 'medium', 'higher')),
  rationale TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'The Odds API',
  captured_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  result TEXT NOT NULL DEFAULT 'pending' CHECK (result IN ('pending', 'won', 'lost', 'void', 'cancelled')),
  result_updated_at TIMESTAMPTZ,
  UNIQUE (update_run_id, sport, rank)
);

CREATE INDEX IF NOT EXISTS sports_tips_public_idx
  ON public.sports_tips (sport, published_at DESC, rank ASC);
CREATE INDEX IF NOT EXISTS sports_tips_pending_fixture_idx
  ON public.sports_tips (fixture_id, result) WHERE result = 'pending';
CREATE INDEX IF NOT EXISTS sports_fixtures_commence_idx
  ON public.sports_fixtures (sport, commence_at);
CREATE INDEX IF NOT EXISTS sports_update_runs_started_idx
  ON public.sports_update_runs (started_at DESC);

GRANT SELECT ON public.sports_tips TO anon, authenticated;
GRANT SELECT ON public.sports_fixtures TO anon, authenticated;
GRANT SELECT ON public.sports_update_runs TO authenticated;
GRANT ALL ON public.sports_tips, public.sports_fixtures, public.sports_odds_snapshots, public.sports_update_runs TO service_role;

ALTER TABLE public.sports_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_odds_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_update_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published sports tips" ON public.sports_tips;
DROP POLICY IF EXISTS "Anyone can view upcoming sports fixtures" ON public.sports_fixtures;
DROP POLICY IF EXISTS "Admins view sports update runs" ON public.sports_update_runs;
DROP POLICY IF EXISTS "Admins manage sports tips" ON public.sports_tips;
DROP POLICY IF EXISTS "Admins manage sports fixtures" ON public.sports_fixtures;
DROP POLICY IF EXISTS "Admins view sports odds snapshots" ON public.sports_odds_snapshots;
DROP POLICY IF EXISTS "Admins manage sports update runs" ON public.sports_update_runs;

CREATE POLICY "Anyone can view published sports tips" ON public.sports_tips
  FOR SELECT TO anon, authenticated USING (published_at <= now() AND expires_at > now());
CREATE POLICY "Anyone can view upcoming sports fixtures" ON public.sports_fixtures
  FOR SELECT TO anon, authenticated USING (commence_at > now() - interval '6 hours');
CREATE POLICY "Admins view sports update runs" ON public.sports_update_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage sports tips" ON public.sports_tips
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage sports fixtures" ON public.sports_fixtures
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins view sports odds snapshots" ON public.sports_odds_snapshots
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage sports update runs" ON public.sports_update_runs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.sports_tips IS 'Ranked informational tips; never a guarantee of outcome. Provider odds are captured per published tip.';
COMMENT ON COLUMN public.sports_tips.risk_band IS 'Relative data/risk band, not a probability or promise of winning.';

-- Scheduling is configured after deploying the Edge Function. See docs/SPORTS_TIPS_SETUP.md.
-- Required slots in Asia/Colombo: 08:00, 12:00, 18:00.
