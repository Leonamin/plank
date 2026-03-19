---
id: claude-codex가-새로운-태스크-생성-수정-삭제-시-계속-물어봄
title: 'Claude, Codex가 새로운 태스크 생성/수정/삭제 시 계속 물어봄'
labels:
  - dev
priority: p1
created: '2026-03-18'
---
# 상황
- 현재 Claude Code, Codex, Gemini CLI 등이 Plank의 기능을 이용할 때 계속 물어봐서 사용자의 귀찮음이 많이 발생

## 할 일
- [x] 새로운 태스크 생성, 수정 시 물어보지 않게 수정 — CLAUDE.md 규칙 완화: 명시적 요청이면 바로 진행, 체크리스트 업데이트는 승인 불필요
- [x] 태스크 삭제는 무조건 소프트 딜리트 — CLAUDE.md에 .trash/ 소프트 딜리트 규칙 명시
