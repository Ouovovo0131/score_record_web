# 考程與成績追蹤 (Score Record Web)

以 Next.js App Router 建立的學習追蹤工具，包含公開考程倒數，以及登入後的成績、英文練習、讀書時數與弱點管理。舊版靜態 HTML/JS 保留於 `legacy-static-site/` 作參考，不再維護。

## 架構

- **前端**：Next.js 16 App Router + React + TypeScript + Tailwind CSS。
- **驗證**：Firebase Authentication（Google 登入）；資料 API 會在伺服器端驗證 Firebase ID token，並依 `AllowedUser` 與 `NEXT_PUBLIC_ALLOWED_EMAIL` 授權。
- **資料庫**：Vercel Postgres（Neon），透過 Prisma ORM 存取。
- **頁面**：
  - `/`（總覽）：公開考程倒數；登入後顯示個人成績與近七日摘要。
  - `/score`：模擬考統計、趨勢、穩定度與學習目標，需登入。
  - `/english`：英文練習分析、作答正確率與錯題複習，需登入。
  - `/study`：每日讀書標記與可計時數的讀書時段，需登入。
  - `/weakness`：弱點與複習歷程，需登入。
  - `/settings`：JSON/CSV 個人資料匯出，需登入。
  - `/login`：Google 登入頁。

## 環境變數

複製 `.env.local.example` 為 `.env.local` 並填入實際值：

| 變數 | 說明 |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase 專案設定 > 一般 > 你的應用程式 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | 同上 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | 同上（本專案為 `record-my-study`） |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | 同上 |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | 同上 |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | 同上 |
| `NEXT_PUBLIC_ALLOWED_EMAIL` | 初始資料擁有者 Email；其他帳號必須先列入 `AllowedUser` |
| `POSTGRES_URL` | Vercel Postgres（或 Neon）連線字串 |

## 本機開發

```bash
npm install
# 設定好 .env.local 後：
npx prisma db push      # 新資料庫初始化；既有資料庫請套用新增 migration
npx prisma db seed       # 匯入舊站的預設模擬考／英文練習／目標資料
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)。`/`（考程倒數）在完全沒有設定任何環境變數時也能正常顯示；`/login` 若 Firebase 尚未設定會顯示「Firebase 尚未設定」提示，不會噴錯。

## 資料庫 Schema

以 Prisma 定義於 `prisma/schema.prisma`：

- `ExamRecord`：模擬考成績紀錄（國文、英文、數學、自然的分項成績與級分、五標、班排/校排/總排、檢討標籤、備註）；總級分由四科級分加總。
- `EnglishRecord`：英文練習紀錄（妙妙卷／歷屆試題／克漏字／好好學，含七種題型分數、總分及選填的作答／答對題數）。
- `Goal`：單一使用者的目標設定（每個 Email 僅一筆）。
- `StudyLog` / `StudySession`：每日讀書標記與明確記錄的讀書分鐘數。舊標記不會推算時數。
- `EnglishQuestion` / `EnglishQuestionReview`：逐題錯誤資料與複習歷程。
- `Weakness` / `WeaknessReview`：弱點狀態、描述與複習歷程。
- `AllowedUser` / `UserProfile`：使用者授權與組別設定。

## API Routes

位於 `src/app/api/`。所有個人資料 API 都驗證 Firebase ID token 並依登入者限制資料範圍，包含成績、英文紀錄／錯題、目標、讀書紀錄／時段、弱點、週報與匯出。登入檢查不會自動授權新 Google 帳號；新增使用者需先登記在 `AllowedUser`。

新增資料庫欄位與資料表的增量 migration 位於 `prisma/migrations/`。已有資料庫請先備份，再執行 `npx prisma migrate deploy`；全新本機資料庫可用 `npx prisma db push` 建立目前完整 Schema。此專案尚無既有 migration baseline，因此不要在尚未確認正式資料庫狀態前執行遷移。

英文正確率只使用有填寫作答題數及答對題數的紀錄；舊資料缺少題數時不會推估。報表中的讀書時數也只採用新增的時段資料，既有每日標記不會換算成時數。

## 驗證

```bash
npm run lint
npm test
npm run build
```

## 部署到 Vercel

1. 將專案推送到 GitHub，並在 Vercel 建立新專案匯入此 repo。
2. 到 Vercel 專案的 **Storage** 分頁新增 **Postgres** 整合（會自動注入 `POSTGRES_URL`），或使用自己的 Neon 連線字串。
3. 到 **Settings > Environment Variables** 新增以下變數（Production / Preview / Development 皆需要）：
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `NEXT_PUBLIC_ALLOWED_EMAIL`
   - `POSTGRES_URL`（若使用 Vercel Postgres 整合會自動設定）
4. `package.json` 已包含 `"postinstall": "prisma generate"`，Vercel build 時會自動產生 Prisma Client。
5. 確認資料庫備份及 Schema 狀態後，對既有資料庫執行 `npx prisma migrate deploy`；全新資料庫則先 `npx prisma db push`。只有需要範例資料時才執行 `npx prisma db seed`。
6. 到 Firebase Console > Authentication > Settings > Authorized domains，把 Vercel 部署網域加入白名單，Google 登入才能運作。

## 尚待手動完成的步驟

- 到 Firebase Console 建立/確認 `record-my-study` 專案，取得 Web 應用程式設定值填入 `.env.local` 與 Vercel 環境變數。
- 將 `NEXT_PUBLIC_ALLOWED_EMAIL` 改成你自己的真實 Gmail 帳號。
- 到 Vercel Dashboard 新增 Postgres 整合並取得 `POSTGRES_URL`。
- 確認既有資料庫 Schema 與 migration 狀態，再選擇增量 migration 或全新資料庫初始化方式。

## 舊版靜態站

`legacy-static-site/` 保留原本的 HTML/CSS/JS 版本作為商業邏輯與 UI 行為的參考存檔，**不再維護，不要修改**。
