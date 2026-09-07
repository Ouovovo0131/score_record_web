# score_record_web

紀錄每次模擬考成績、查看成績統計與成長曲線，並提供獨立考程倒數頁面的純前端網站。

## 功能

- 新增、刪除、清空模擬考紀錄
- 程式內建第一次模擬考成績作為初始資料
- 以彈出視窗新增成績，支援記錄總分、總級分、各科分數、各科級分
- 自動計算平均總分、最高分、最近一次進步幅度、距離目標差距
- 顯示最近一次考試洞察、長期趨勢圖、各科戰力雷達圖
- 支援目標校系 / 目標級分設定與檢討標籤統計
- 以獨立頁面顯示固定考程倒數，對最近一場考試即時倒數
- 使用 Firebase Firestore 儲存資料（若未設定 Firebase，會暫時退回瀏覽器本機資料）

## 使用方式

直接用瀏覽器開啟 [index.html](./index.html) 進入首頁考程倒數，
再從頁面上方切換到 [score.html](./score.html) 查看模擬考成績統計，
或切換到 [english.html](./english.html) 記錄英文練習成績。

## Firestore 設定

1. 在 Firebase 建立專案並啟用 Firestore Database。
2. 編輯 [firebase-config.js](./firebase-config.js)，把 `REPLACE_WITH_...` 全部替換成你的 Firebase Web 設定值。
3. 重新整理頁面後，資料會改由 Firestore 讀寫。

### 既有資料搬移

- 如果 Firestore 對應欄位尚未有資料，系統會自動把瀏覽器目前的舊資料搬到 Firestore（包含模擬考與英文練習紀錄）。
