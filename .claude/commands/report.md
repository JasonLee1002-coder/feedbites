# /report — 透過 Yuzu-san LINE 顧問發送工作報告

自動彙整目前工作進度，透過 LINE 推送給老闆。
會自動收集 git diff、最近 commit、TODO 等資訊。

## 使用方式
```
/report
/report 今天主要做了登入功能
```

## 執行邏輯

1. 收集以下資訊：
   - `git log --oneline -5`（最近 5 筆 commit）
   - `git diff --stat`（目前未提交的變更）
   - 使用者附帶的文字說明（若有）

2. 組合成簡潔的工作報告，格式：
```
【{專案名稱}】工作報告

## 最近提交
- commit 1
- commit 2

## 進行中
- 未提交的變更摘要

## 備註
{使用者附帶的說明}
```

3. 用 LINE Push Message API 發送（同 /notify 的 curl 方式）

需要環境變數：`LINE_CHANNEL_ACCESS_TOKEN`、`OWNER_LINE_USER_ID`、`PROJECT_DISPLAY_NAME`（選填）
