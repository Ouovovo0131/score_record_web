# 考程與成績追蹤 (Score Record Web)

個人用的考程倒數、模擬考成績統計、英文練習分析儀表板。以 Next.js 15 (App Router) 重寫，取代原本的靜態 HTML/JS 版本（保留於 `legacy-static-site/` 供參考，不再維護）。

## 架構

- **前端**：Next.js (App Router) + React + TypeScript + Tailwind CSS，沿用舊站的線框風格（白底、深色實線邊框、無圓角、等寬數字字型 JetBrains Mono）。
- **驗證**：Firebase Authentication（Google 登入），僅允許單一白名單 Email 登入（`NEXT_PUBLIC_ALLOWED_EMAIL`）。以 React Context (`AuthProvider` / `useAuth`) 管理登入狀態，`<RequireAuth>` 元件保護 `/score`、`/english` 頁面。
- **資料庫**：Vercel Postgres（Neon），透過 Prisma ORM 存取。
- **頁面**：
  - `/`（首頁）：考程倒數，**公開頁面，不需登入**。
  - `/score`：模擬考成績統計，需登入。
  - `/english`：英文練習統計，需登入。
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
| `NEXT_PUBLIC_ALLOWED_EMAIL` | 唯一允許登入的 Google 帳號 Email |
| `POSTGRES_URL` | Vercel Postgres（或 Neon）連線字串 |

## 本機開發

```bash
npm install
# 設定好 .env.local 後：
npx prisma db push      # 依 prisma/schema.prisma 建立資料表
npx prisma db seed       # 匯入舊站的預設模擬考／英文練習／目標資料
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)。`/`（考程倒數）在完全沒有設定任何環境變數時也能正常顯示；`/login` 若 Firebase 尚未設定會顯示「Firebase 尚未設定」提示，不會噴錯。

## 資料庫 Schema

以 Prisma 定義於 `prisma/schema.prisma`：

- `ExamRecord`：模擬考成績紀錄（國文、英文、數學、自然的分項成績與級分、五標、班排/校排/總排、檢討標籤、備註）；總級分由四科級分加總。
<<<<<<< HEAD
- `EnglishRecord`：英文練習紀錄（妙妙卷／歷屆試題／克漏字，七個題型分數；妙妙卷與歷屆試題滿分 80 分且翻譯題滿分 8 分，克漏字不適用詞彙/閱讀/混合/翻譯題）。
=======
- `EnglishRecord`：英文練習紀錄（妙妙卷／克漏字／好好學；好好學不適用詞彙題，綜合測驗、閱讀測驗、翻譯滿分分別為 5、8、24 分；克漏字不適用詞彙/閱讀/混合/翻譯題）。
>>>>>>> 00909cc5d3ecd392f940179074ef078eb5f9690a
- `Goal`：單一使用者的目標設定（每個 Email 僅一筆）。

## API Routes

位於 `src/app/api/`：

- `GET/POST /api/exam-records`、`PUT/DELETE /api/exam-records/[id]`
- `GET/POST /api/english-records`、`PUT/DELETE /api/english-records/[id]`
- `GET/PUT /api/goals`

> ⚠️ **已知限制**：這些 API 路由目前沒有伺服器端的 Firebase Admin token 驗證，僅靠前端 `RequireAuth` 做畫面層的登入檢查。任何人若得知 API 網址即可讀寫資料。由於這是單人使用的個人工具，這是刻意接受的取捨；若之後要多人使用或公開，請在這些路由加上 Firebase Admin ID token 驗證。

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
5. 部署完成後，於本機或透過 Vercel CLI 執行一次 `npx prisma db push` 及 `npx prisma db seed`（指向正式資料庫的 `POSTGRES_URL`）以建立資料表並匯入預設資料。
6. 到 Firebase Console > Authentication > Settings > Authorized domains，把 Vercel 部署網域加入白名單，Google 登入才能運作。

## 尚待手動完成的步驟

- 到 Firebase Console 建立/確認 `record-my-study` 專案，取得 Web 應用程式設定值填入 `.env.local` 與 Vercel 環境變數。
- 將 `NEXT_PUBLIC_ALLOWED_EMAIL` 改成你自己的真實 Gmail 帳號。
- 到 Vercel Dashboard 新增 Postgres 整合並取得 `POSTGRES_URL`。
- 執行 `npx prisma db push` 與 `npx prisma db seed` 初始化正式環境資料庫。

## 舊版靜態站

`legacy-static-site/` 保留原本的 HTML/CSS/JS 版本作為商業邏輯與 UI 行為的參考存檔，**不再維護，不要修改**。
