# /ask-boss — 透過 Yuzu-san LINE 顧問向老闆提問

開發過程中遇到需要老闆決策的問題，直接透過 LINE 發問。
老闆可以在 LINE 上直接回覆。

## 使用方式
```
/ask-boss API 要用 REST 還是 GraphQL？
/ask-boss 登入要用 Google OAuth 還是 email+password？
/ask-boss 這個 bug 要現在修還是排到下版？
```

## 執行邏輯

發送格式：
```
【{專案名稱}】需要你的決定

❓ {使用者的問題}

（請直接在 LINE 回覆）
```

用 LINE Push Message API 發送（同 /notify）。

需要環境變數：`LINE_CHANNEL_ACCESS_TOKEN`、`OWNER_LINE_USER_ID`、`PROJECT_DISPLAY_NAME`（選填）
