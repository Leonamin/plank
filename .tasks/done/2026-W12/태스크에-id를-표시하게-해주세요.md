---
id: 태스크에-id를-표시하게-해주세요
title: 태스크에 ID를 표시하게 해주세요
labels:
  - dev
priority: p0
created: '2026-03-18'
depends_on: []
---
# 상황
- 현재 태스크는 제목은 표시되는데 ID는 없어서 Ai에게 전달할 때 불편한상황

# 할일
- [x] AI가 생성하는 태스크는 접두어(backlog, todo 등) + 적절한 주제명으로 생성 — slugify 기존 동작 유지
- [x] 사람이 생성하는건 자동 uuid 정도? — customId 없으면 task-{uuid8} fallback 추가
- [x] 읽기 모드할 때만 라벨 정도로 보이게 구현 — TaskDetail 다이얼로그에 monospace ID 라벨 표시
