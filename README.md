# 坦克大戰：台灣爭霸 (Region Tank Wars)

![Game Banner](https://img.shields.io/badge/Status-Active-success) ![Tech](https://img.shields.io/badge/Tech-React%20%7C%20PeerJS%20%7C%20Canvas-blue)

一款高強度的像素風格網頁多人坦克對戰遊戲。選擇你的台灣縣市陣營，在隨機生成的戰場中爭奪霸主地位！

本專案採用純前端架構，利用 **PeerJS (WebRTC)** 實現 P2P 即時連線，無需後端伺服器即可與朋友開房對戰。

## 🎮 遊戲特色

*   **多人即時連線**：支援創建房間與加入房間，透過房間代碼即可連線。
*   **P2P 架構**：採用「主機-客戶端 (Host-Client)」模式。房主電腦負責物理運算與 AI 邏輯，實現低延遲對戰。
*   **陣營對抗**：支援全台主要縣市（台北、台中、高雄...等），同縣市玩家互不傷害，合作對抗外敵。
*   **AI 機器人**：房主可設定機器人 (Bot) 數量，使用瀏覽器邊緣運算補足戰場人數。
*   **道具系統**：戰場隨機生成強力道具。
    *   ❤️ **補血包 (Health)**：恢復生命值。
    *   ⚔️ **雙倍傷害 (Double Damage)**：15秒內子彈威力加倍（附帶紫色光環）。
    *   ⚡ **極速狂飆 (Speed Boost)**：15秒內移動速度加倍（附帶藍色殘影）。
*   **跨平台支援**：
    *   **電腦版**：鍵盤操作。
    *   **手機/平板**：支援 8 方位虛擬搖桿、觸控滑動與自動射擊 (Auto Fire) 功能。
*   **復古體驗**：像素風格畫面 (Pixel Art) 與 Web Audio API 即時合成的 8-bit 音效（無須外部音檔）。
*   **即時聊天**：戰場內建廣播聊天室功能。

## 🕹️ 操作說明

### 電腦版 (Desktop)
*   **移動**：`W`, `A`, `S`, `D` 或 `方向鍵`
*   **射擊**：`空白鍵 (Space)`
*   **聊天**：點擊左下角輸入框或輸入文字後按 `Enter`

### 手機/平板 (Mobile/Tablet)
*   **移動**：左下角虛擬搖桿 (支援 8 方位滑動控制，手指無需離開螢幕)
*   **射擊**：點擊右下角 `FIRE` 按鈕
*   **自動射擊**：點擊 `AUTO FIRE` 切換自動攻擊模式，解放雙手

## 🛠️ 技術棧 (Tech Stack)

*   **前端框架**：React 19
*   **樣式與 UI**：Tailwind CSS
*   **遊戲引擎**：HTML5 Canvas API (Custom Loop)
*   **連線技術**：PeerJS (WebRTC Data Channels)
*   **音效**：Web Audio API (Oscillators & Gain Nodes)
*   **語言**：TypeScript

## 📝 開發筆記

### P2P 同步機制
本遊戲不使用傳統後端伺服器。
1.  **房主 (Host)**：負責初始化 `GameState`，計算碰撞、子彈軌跡、AI 行為與道具生成，並透過 PeerJS 將狀態廣播給所有連線者。
2.  **加入者 (Client)**：只負責傳送「按鍵輸入 (Input)」給房主，並接收房主回傳的畫面進行繪製。
3.  **地圖生成**：使用房間代碼 (Room ID) 作為亂數種子 (Seed)，確保所有玩家在沒有傳輸巨量地圖資料的情況下，也能生成完全一致的迷宮牆壁。

### 本地開發

1. 安裝依賴：
```bash
npm install
```

2. 啟動開發伺服器：
```bash
npm start
```

3. 開啟瀏覽器訪問 `http://localhost:3000`
