# Fast Cash යෙදුම් පරීක්ෂණ වාර්තාව

**පරීක්ෂා කළ දිනය:** 2026-08-31 04:52–04:54 (+05:30)  
**Repository:** [Lakmal2078/inclusive-eyes](https://github.com/Lakmal2078/inclusive-eyes)  
**Live URL:** [https://inclusive-eyes.lovable.app](https://inclusive-eyes.lovable.app)

## සාරාංශය

යෙදුමේ source code එකෙන් production build එක සාර්ථකව නිර්මාණය කළ හැකි නමුත්, ප්‍රකාශිත live URL එක දැනට භාවිතයට නොහැකි අතර **“Project not found / No Lovable project found at this address”** පිටුවක් පෙන්වයි. Local preview එකද start නොවන්නේ `package.json` හි `npm start` script එක build output එක නොවන `./dist` directory එකක් යොමු කරන බැවිනි. එබැවින් දැනට end-to-end user flows, authentication, deposit/withdrawal submission සහ admin operations live environment එකේ තහවුරු කළ නොහැකි විය.

## පරීක්ෂණ ප්‍රතිඵල

| පරීක්ෂණය                                                          | ප්‍රතිඵලය                                                | තත්ත්වය               |
| ----------------------------------------------------------------- | -------------------------------------------------------- | --------------------- |
| `npm install --no-audit --no-fund`                                | Packages 462ක් install විය                               | සමත්                  |
| `npm run lint`                                                    | Problems 54ක්: errors 45ක්, warnings 9ක්                 | අසමත්                 |
| `npm run build`                                                   | Client සහ SSR bundles සාර්ථකව build විය                  | සමත්; warning එකක් ඇත |
| `npm start`                                                       | `Missing file or directory: /home/ubuntu/inclusive-eyes` | අසමත්                 |
| Live `/`, `/deposit`, `/withdraw`, `/transactions`, `/robots.txt` | HTTP 404 / Project not found                             | අසමත්                 |
| Live browser console                                              | Error output නොමැත; page එක application එක නොවේ          | අවහිර වී ඇත           |

## ප්‍රධාන සොයාගැනීම්

### 1. Critical — Live deployment එක නොපවතී

`https://inclusive-eyes.lovable.app/` සහ ප්‍රධාන routes සියල්ල HTTP 404 ලබා දුන් අතර, browser එකේ **“No Lovable project found at this address”** යන පණිවිඩය පෙන්වීය. මෙය application-level route bug එකක් නොව, deployment/project URL mapping හෝ project removal/configuration ගැටලුවක් ලෙස පෙනේ. Live URL එක restore/re-publish නොකරන තුරු users හට යෙදුම භාවිත කළ නොහැක.

### 2. High — `npm start` script එක build output එකට නොගැළපේ

`package.json` හි script එක `wrangler dev --cwd ./dist` ලෙස ඇත. නමුත් `npm run build` මඟින් `.output/` directory එක නිර්මාණය කරයි; `dist/` directory එකක් නිර්මාණය නොවේ. එබැවින් production preview command එක වහාම fail වේ. Build output එකේම Nitro විසින් `npx vite preview` හෝ prebuilt deployment command එකක් යෝජනා කරයි.

**නිර්දේශය:** project එකේ target deployment එකට ගැළපෙන එකම command එක තෝරා `start`/`preview` scripts update කරන්න. අවම වශයෙන් documented local preview command එක සමඟ script එක සහ README එක එකිනෙකට ගැළපිය යුතුය.

### 3. High — Lint gate එක අසමත්

`npm run lint` මඟින් errors 45ක් සහ warnings 9ක් වාර්තා කළේය. ප්‍රධාන errors මෙසේය:

- `src/integrations/supabase/previewAuthStorage.ts:54` — නැවත assign නොකරන `timer` variable එක `let` ලෙස තිබීම (`prefer-const`).
- `src/lib/fastcash/FastCashContext.tsx` — `any` භාවිත 10කට ආසන්න ප්‍රමාණයක්.
- `src/lib/fastcash/api.ts:188` — exported API return type එකේ `any`.
- `src/types/fastcash-modules.d.ts` — declaration types තුළ `any` භාවිතය විශාල ප්‍රමාණයක්.

UI component files කිහිපයක Fast Refresh warnings ද ඇත. මේවා build එක නවත්වන්නේ නැති නමුත් code-quality/CI gate එකක් තිබේ නම් release එක block කරනු ඇත.

### 4. Medium — Promo code එක dynamic settings වලින් නොපෙන්වයි

Admin settings API එක `promoCode` කියවුවද, mobile drawer banner එකේ `VGSL` යන්න hard-coded වේ (`src/components/fastcash/pages.jsx`, line 650 අවට). Admin කෙනෙකු promo code වෙනස් කළ පසු forms/config එක update වුවත් මෙම banner එක පැරණි code එක පෙන්විය හැක. Banner එක `systemSettings.promoCode` හෝ context config එකෙන් render කළ යුතුය.

### 5. Build quality warning

Build සාර්ථක වුවද `vite-tsconfig-paths` plugin එක detect වී ඇති අතර Vite හි native `resolve.tsconfigPaths` support භාවිත කළ හැකි බව warning එකක් පෙන්වයි. මෙය blocking defect එකක් නොවේ; configuration එක පිරිසිදු කිරීමට plugin එක ඉවත් කිරීම සලකා බැලිය හැක.

## ආරක්ෂාව පිළිබඳ සටහන

Source code සහ Supabase migrations පරීක්ෂා කළ විට transactions සඳහා guest insert, signed-in user-owned reads, සහ admin-only updates සඳහා Row Level Security policies තිබේ. Guest reads block කිරීමට API code එකද උත්සාහ කරයි. එහෙත් live deployment එක නොපවතින නිසා RLS, authentication, admin privilege refusal, receipt upload/OCR, සහ transaction status persistence end-to-end ලෙස execute කර තහවුරු කළ නොහැකි විය. Deployment restore කිරීමෙන් පසු මේවා නැවත regression-test කළ යුතුය.

## ඊළඟ ක්‍රියාමාර්ග

1. Lovable project/deployment එක restore කර `inclusive-eyes.lovable.app` domain mapping එක නැවත verify කරන්න.
2. Build output (`.output`) සහ actual runtime target එකට ගැළපෙන `npm start`/`npm run preview` command එක නිවැරදි කරන්න.
3. Lint errors සියල්ල විසඳා CI check එක නැවත ධාවනය කරන්න.
4. Promo banner එක hard-coded `VGSL` වෙනුවට admin-configured promo code එක භාවිත කරන ලෙස update කරන්න.
5. Live deployment එක restore වූ පසු routes, auth, guest/signed-in deposits, withdrawals, OCR, admin status changes, localization, themes, accessibility සහ mobile layouts සඳහා `docs/TESTING_CHECKLIST.md` සම්පූර්ණයෙන් execute කරන්න.

## References

[1]: https://github.com/Lakmal2078/inclusive-eyes "Fast Cash source repository"
[2]: https://github.com/Lakmal2078/inclusive-eyes/blob/main/package.json "Fast Cash package scripts and dependencies"
[3]: https://github.com/Lakmal2078/inclusive-eyes/blob/main/docs/TESTING_CHECKLIST.md "Fast Cash testing checklist"
[4]: https://inclusive-eyes.lovable.app "Published Fast Cash URL checked during testing"
