# 智能日志分析与运维辅助决策系统

基于 `Next.js + Supabase + Vercel` 的智能日志分析系统原型。

## 当前能力

- Supabase 注册登录
- 仪表盘路由保护
- 用户 `profiles` 资料读取
- 日志上传并写入 `logs` 表
- 原始日志写入 Supabase Storage
- 第一层规则检测写入 `log_errors`
- 前端仪表盘原型页面

## 后续 SQL

- 第一阶段业务表：在 Supabase SQL Editor 执行基础建表 SQL
- 第二阶段规则与人工复核：执行 [phase-2-rules-and-review.sql](/c:/智能日志分析系统/next-app/supabase/phase-2-rules-and-review.sql)

## 本地启动

```bash
npm install
npm run dev
```

默认访问 `http://localhost:3000`。
