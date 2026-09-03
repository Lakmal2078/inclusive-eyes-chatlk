# FastCash — Free Cricket/Football Tips පද්ධතිය පිළිබඳ පරීක්ෂණ වාර්තාව

**පරීක්ෂා කළ archive:** `FastCash-readme-updated.zip`  
**පරීක්ෂණ දිනය:** 2026-08-31  
**අරමුණ:** cricket සහ football සඳහා දිනකට 3 වතාවක් auto-update වන, එක් sport එකකට හොඳම free picks 5ක් පෙන්වන feature එකක් එක් කළ හැකිදැයි තීරණය කිරීම.

## 1. දැනට ඇති application එක

FastCash දැනට ශ්‍රී ලංකාවේ 1xBet players සඳහා deposit/withdrawal/payment-support portal එකක්. එහි authentication, Supabase/Postgres database, user/admin roles, transaction history, PWA සහ Sinhala/Tamil/English UI තිබේ. README එකම පැහැදිලිව සඳහන් කරන්නේ මෙය betting odds හෝ betting account balances ලබා නොදෙන බවයි.

දැනට `/sports` route එකේ ඇත්තේ sports betting payment-support guide එකක් පමණි. එහි live fixtures, odds, prediction engine, tip cards, update history හෝ scheduled job එකක් නොමැත. Admin dashboard එක payment accounts, transactions, settings සහ statistics සඳහා යොදා ගනී; tips management සඳහා tab එකක් නැත.

Database migrations පරීක්ෂා කළ විට `profiles`, `user_roles`, `bank_accounts`, `app_settings`, `transactions`, `transaction_events` සහ `notifications` tables පමණක් හමු විය. Sports fixtures, bookmaker odds, tips, source snapshots, update runs හෝ tip results සඳහා tables නැත.

## 2. අවශ්‍ය වෙනස්කම්

මෙය production-ready ලෙස කිරීමට පහත කොටස් අවශ්‍ය වේ:

| කොටස | යෝජිත ක්‍රියාකාරකම |
| --- | --- |
| Sports data | fixtures, odds, leagues, start times සහ results ගන්න external sports-data API එකක් |
| Ranking | odds, implied probability, form/statistics, injuries/line-ups (ලබාගත හැකි නම්) මත deterministic scoring rule එකක් |
| Tips database | fixture, market, selection, odds, confidence band, source, generated time, expiry සහ result ගබඩා කිරීම |
| Scheduler | Asia/Colombo වේලා කලාපයෙන් 08:00, 12:00, 18:00 jobs |
| Public UI | Cricket සහ Football tabs; එක් sport එකකට picks 5; “updated at”, “odds captured at”, “valid until”, source සහ risk label |
| Admin UI | manual publish/unpublish, API health, failed runs, audit history, correction/void controls |
| Notifications | optional in-app notification; push/WhatsApp/Telegram සඳහා වෙනම credentials සහ consent අවශ්‍ය වේ |
| Compliance | 18+ gate, responsible-gambling notice, “no guaranteed win” wording, data/odds timestamp, jurisdiction review |

### වේලා පරිවර්තනය

ශ්‍රී ලංකා වේලාවෙන් jobs:

- 08:00 Asia/Colombo
- 12:00 Asia/Colombo
- 18:00 Asia/Colombo

UTC cron භාවිතා කළහොත් ඒවා පිළිවෙලින් **02:30, 06:30, 12:30 UTC** වේ. Scheduler එකේ timezone support තිබේ නම් `Asia/Colombo` සෘජුව භාවිතා කිරීම වඩා ආරක්ෂිතය.

## 3. “හොඳම bet 5” නිර්වචනය

මෙය නිශ්චිත ජයග්‍රහණයක් පොරොන්දු නොවන **ranked picks** ලෙස පෙන්විය යුතුය. උදාහරණයක් ලෙස, සෑම pick එකකටම:

- තරගය සහ league එක
- market එක (උදා: match winner, double chance, total goals/runs)
- selection එක
- decimal odds සහ odds source
- odds captured timestamp
- confidence band: Low / Medium / Higher confidence — “win probability” ලෙස නොපෙන්වීම වඩා ආරක්ෂිතය
- short data-based rationale
- kickoff time සහ tip expiry
- result status: pending / won / lost / void

එක් sport එකකට picks 5ක් හෝ ඊට අඩු ගණනක් පෙන්විය යුතුය. එම update window එකේ ප්‍රමාණවත් quality fixtures නොමැති නම් අනිවාර්යයෙන් picks 5ක් පිරවීම වෙනුවට “අද quality picks 3ක් පමණයි” යනුවෙන් පෙන්වීම විශ්වාසනීය වේ.

## 4. Data/API විකල්ප

| ක්‍රමය | වාසි සහ අවාසි | වියදම | Setup complexity |
| --- | --- | --- | --- |
| **The Odds API + football/cricket feed** | Odds-focused, football සහ cricket coverage පවතී; free tier එකේ 500 credits/month නිසා දිනකට jobs 3ක් සහ limited leagues සඳහා පමණක් සරිලනවා විය හැක. Traffic වැඩි වුවහොත් credits ඉක්මනින් අවසන් විය හැක. | Free tier; paid plans page එකේ $30/month සිට පෙන්වයි | මධ්‍යම |
| **API-Football + වෙනම cricket data/odds provider** | Football සඳහා free plan එකේ 100 requests/day සහ fixtures, pre-match odds, predictions වැනි endpoints තිබේ. Cricket සඳහා වෙනම provider එකක් අවශ්‍ය වන නිසා architecture සහ billing දෙකක් වේ. | Football free; cricket provider අනුව වෙනස් | මධ්‍යම–ඉහළ |
| **OpticOdds connector** | Single normalized feed එකකින් cricket, soccer/football, fixtures, odds, results, historical odds සහ bookmaker data ගත හැක. මෙම session එකේ connector එක හමු වූ නමුත් **disabled**; license/API access නොමැතිව live integration පරීක්ෂා කළ නොහැක. | Provider plan අනුව; current session config එකෙන් plan price තහවුරු කළ නොහැක | ඉහළ |
| **Manual/admin-assisted MVP** | API key නැතිව admin විසින් tips/odds ඇතුළත් කර publish කරයි. ඉක්මනින් UI, database, result history සහ retention flow පරීක්ෂා කළ හැක. නමුත් auto-update නොවේ. | Data API වියදම නැත | අඩු |

**වැදගත්:** “free tips” කියන්නේ user වෙත නොමිලේ පෙන්වීමයි. විශ්වාසදායක live odds/fixtures data එක සෑමවිටම free නොවිය හැක. API data එක scrape කිරීම වෙනුවට provider එකේ terms අනුව licensed API භාවිතා කළ යුතුය.

## 5. නිර්දේශිත MVP flow

1. Scheduled job එක update window එකට පෙර upcoming cricket/football fixtures ගනී.
2. Market සහ bookmaker odds normalise කරයි; stale, suspended, duplicate සහ kickoff පසු වූ markets ඉවත් කරයි.
3. Configurable ranking rule එකක් මඟින් picks score කරයි. “Best” යන්න odds පමණක් මත නොව, market liquidity/data completeness, line movement, basic form/statistics සහ risk filters මත තීරණය කරයි.
4. Sport එකකට top 5 (quality threshold පසු කළ picks පමණක්) database එකට immutable snapshot එකක් ලෙස save කරයි.
5. Public sports page එකේ නවතම published run එක පෙන්වයි. පැරණි run එක history/result tracking සඳහා තබා ගනී.
6. Match result පසු job එකක් result update කරයි. Odds/tips edit කරන්නේ නැතිව correction/void audit event එකක් තබා ගනී.
7. Admin dashboard එකෙන් failed runs, API quota, stale data සහ unpublished/void picks පරීක්ෂා කළ හැක.

## 6. ආරක්ෂාව සහ වගකීම්

මෙය betting-related feature එකක් බැවින් UI copy එකේ **“Guaranteed win”, “sure bet”, “100% fixed”** වැනි වචන භාවිතා නොකළ යුතුය. සෑම update එකකම “18+ only”, “gambling involves financial risk”, “never bet more than you can afford to lose” සහ “tips are informational, not financial advice” වැනි notice එකක් තිබිය යුතුය. User retention වැඩි කිරීම සඳහා compulsive-gambling nudges, loss-chasing prompts හෝ misleading success-rate claims නොයෙදිය යුතුය.

ශ්‍රී ලංකාවේ online gambling/betting නීති සහ advertising requirements වෙනස් වෙමින් පවතින බැවින් launch කිරීමට පෙර local legal/compliance review එකක් අවශ්‍යය. මෙම වාර්තාව නීතිමය උපදෙසක් නොවේ.

## 7. Archive baseline verification

Archive එක extract කර source structure පරීක්ෂා කරන ලදී. `npm install` නොකර තිබූ නිසා supplied sandbox එකේ baseline `npm run lint` සහ `npm run build` commands දෙකම `eslint: not found` සහ `vite: not found` ලෙස dependency-missing තත්ත්වයකින් අවසන් විය. මෙය source defect එකක් බව තහවුරු නොකරයි; dependencies install කර නැවත build/lint කිරීම අවශ්‍යය.

## 8. ඉදිරියට යාමට අවශ්‍ය තීරණ 2

Implementation එක ආරම්භ කිරීමට user-side decision එකක් ලෙස පහත දෙකෙන් එකක් තෝරාගත යුතුය:

1. **Automatic MVP:** The Odds API, API-Football + cricket provider, හෝ OpticOdds — කුමන provider එකට API access/key ලබාදෙන්නේද?
2. **Manual MVP:** මුලින් admin-entered tips UI සහ database/history හදලා, පසුව API integration එක එක් කරනවාද?

API provider එක තෝරාගත් පසු මම migration, ranking service, scheduled update endpoint, public Sinhala/English/Tamil UI, admin controls, result tracking සහ tests එකට implement කර build/lint සමඟ verify කළ හැක.

### Sources

- [OpticOdds Odds API Getting Started Guide](https://developer.opticodds.com/docs/odds-api-getting-started-guide)
- [API-Football Pricing](https://www.api-football.com/pricing)
- [The Odds API](https://the-odds-api.com/)
- [National Council on Problem Gambling — Internet Standards](https://www.ncpgambling.org/responsible-gambling/internet-standards/)
