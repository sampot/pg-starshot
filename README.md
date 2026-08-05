# pg-starshot

街機風**星屑出擊**：固定畫面太空射擊、幾何機體、波次敵人、自製音效。純前端，無建置步驟。

名稱、機體與關卡為原創小品，致敬「固定畫面太空射擊」玩法類型，非任一商業作品復刻。

也可當作 [Playgrounds（遊樂場）](https://play.samkuo.me/) 的 **SAM**（`index.html` 入口）。覺得手感或關卡不夠完美？在 Playgrounds 裡開開看，再叫 AI 幫你改一版。

## 一鍵開 SAM 小

**[一鍵開 SAM 小](https://play.samkuo.me/?open=sampot%2Fpg-starshot&name=%E6%98%9F%E5%B1%91%E5%87%BA%E6%93%8A)**

```
https://play.samkuo.me/?open=sampot/pg-starshot&name=星屑出擊
```

同源會重用本機已匯入的沙盒；要強制新建可加 `&fresh=1`。

## 試玩（本機）

```bash
npx --yes serve .
# 或
python3 -m http.server 8080
```

點一下頁面後音效才會出聲。

## 操作

| 操作 | 說明 |
| --- | --- |
| 滑鼠／觸控 | 拖移自機；點畫布也可出擊 |
| ← → 或 A D | 移動 |
| 空白 | 開火（出擊後亦自動連射） |
| 出擊 | 開始／下一波／再來一局 |
| 音效開／關 | 靜音 |
| 重來 | 分數與波次歸零 |

## 檔案

| 檔案 | 說明 |
| --- | --- |
| `index.html` | 結構 |
| `styles.css` | 亮／暗色主題 |
| `app.js` | Canvas 繪製與輸入 |
| `game.js` | 波次、碰撞、分數 |
| `audio.js` | Web Audio 合成音效 |
| `functions.js` | Playgrounds 可選 stub |

## License

MIT
