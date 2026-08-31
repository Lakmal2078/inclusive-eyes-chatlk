# Sports Tips Automatic MVP Setup

This feature publishes informational cricket and football picks from **The Odds API**. It is not a guarantee of winning and must not be described as a sure bet or fixed result.

## 1. Apply the database migration

Apply:

```text
supabase/migrations/20260831120000_sports_tips_mvp.sql
```

The migration creates fixtures, odds snapshots, tips, update runs, indexes, and Row Level Security policies. Public users can read only fresh tips and upcoming fixtures. Odds snapshots and update-run details remain admin/service-role data.

## 2. Configure secrets

Set these as Supabase Edge Function secrets. Do **not** put them in `VITE_*` variables, browser code, Git, screenshots, or the public repository.

```bash
supabase secrets set \
  ODDS_API_KEY="<The Odds API key>" \
  CRON_SECRET="<long random scheduler secret>"
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` must also be available to the function runtime. Supabase-managed projects normally expose the URL; confirm the service-role secret is configured in the project environment.

Optional sport-key override:

```bash
supabase secrets set ODDS_API_SPORT_KEYS="soccer_epl,soccer_uefa_champs_league,cricket_ipl,cricket_test_match"
```

The default list is intentionally small because The Odds API free tier has limited monthly credits. Add only leagues that are relevant to the audience and monitor quota usage.

## 3. Deploy the function

```bash
supabase functions deploy update-sports-tips
```

The function accepts a POST request. It validates the optional `x-cron-secret` header, fetches upcoming markets, ignores stale/invalid prices, creates immutable odds snapshots, ranks candidates, and writes up to five tips per sport for the current update run.

## 4. Schedule three runs per day

Configure three scheduled POST requests to the deployed function. Use the Supabase dashboard scheduler, an approved cron service, or `pg_cron`/`pg_net` in the project. The schedule must use **Asia/Colombo**:

| Local time | Purpose        |
| ---------- | -------------- |
| 08:00      | Morning update |
| 12:00      | Noon update    |
| 18:00      | Evening update |

Send these headers:

```text
Content-Type: application/json
x-cron-secret: <same CRON_SECRET value>
```

If the scheduler only supports UTC, use `02:30`, `06:30`, and `12:30` UTC. Verify daylight-saving behavior of the scheduler; Sri Lanka stays at UTC+05:30.

A failed run is written to `sports_update_runs.error_message` and does not delete a previously published run. If there are fewer than five quality candidates, the public page intentionally shows fewer than five instead of padding the list with weak or stale markets.

## 5. Public and admin behavior

The `/sports` page polls the public endpoint every five minutes while open and has a manual refresh button. It shows separate Cricket and Football tabs, rank, market, selection, decimal odds, kickoff time, source, capture time, and relative risk band. The risk band is not a win probability.

The `/admin` page has a Sports Tips tab showing recent run health, slot status, errors, and the number of recent tips. API credentials are never loaded into the browser.

## 6. The Odds API quota and data controls

The free tier is limited. The update function therefore:

- requests only configured leagues;
- uses pre-match `h2h` and `totals` markets;
- ignores fixtures starting within 30 minutes;
- rejects odds at or below 1.15 or above 4.50 for this conservative MVP;
- keeps provider capture timestamps;
- stores the source and raw provider response for auditability.

Before production launch, confirm that the selected sport keys actually return cricket coverage in the provider account. Cricket league availability can vary by plan and season.

## 7. Responsible-use and compliance checklist

Before publishing to a real audience:

- keep an 18+ notice visible;
- state that gambling involves financial risk;
- never use “100%”, “sure win”, “fixed”, or “guaranteed” language;
- encourage a budget and no loss chasing;
- show the odds capture time and tell users to verify the live price;
- review local Sri Lankan gambling, advertising, and age-verification requirements with qualified counsel;
- add a process to void tips when a match is cancelled or a market is suspended;
- retain update-run logs and correct outcomes without overwriting the original snapshot.
