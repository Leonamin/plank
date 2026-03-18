---
id: dedicated-port-config
title: "Plank 전용 포트 설정"
labels:
  - dev
priority: p1
depends_on: []
created: 2026-03-18
---

## 목표
다른 프로젝트와 포트 충돌을 방지하기 위해 Plank 전용 포트를 지정한다.

## 구현 항목
- [x] server/index.js 서버 포트 변경 (3456 → 4567)
- [x] vite.config.js 프록시 대상 포트 + Vite 자체 포트 변경 (5173 → 4568)
- [x] README에 포트 정보 업데이트
