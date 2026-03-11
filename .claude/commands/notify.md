# /notify — 透過 Yuzu-san LINE 顧問發送通知

用 LINE Push Message API 發送訊息給老闆。
訊息前面會自動加上專案名稱標記。

## 使用方式
```
/notify 部署完成，已上線 production
/notify 發現 bug：登入頁面 500 error
/notify 今日進度：完成 API 重構，剩 UI 調整
```

## 執行邏輯

讀取以下環境變數：
- `LINE_CHANNEL_ACCESS_TOKEN`（必要）
- `OWNER_LINE_USER_ID`（必要）
- `PROJECT_DISPLAY_NAME`（選填，預設用資料夾名稱）

用 curl 呼叫 LINE Push Message API，發送格式：
```
【{專案名稱}】
{使用者輸入的訊息內容}
```

執行指令：
```bash
curl -s -X POST https://api.line.me/v2/bot/message/push \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN" \
  -d "{
    \"to\": \"$OWNER_LINE_USER_ID\",
    \"messages\": [{
      \"type\": \"text\",
      \"text\": \"【${PROJECT_DISPLAY_NAME:-$(basename $(pwd))}】\n$USER_MESSAGE\"
    }]
  }"
```

成功後回覆使用者「已發送 LINE 通知」，失敗則顯示錯誤。
