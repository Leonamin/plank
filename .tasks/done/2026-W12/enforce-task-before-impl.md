---
id: enforce-task-before-impl
title: "구현 착수 전 태스크 등록 강제 규칙 추가"
labels:
  - dev
priority: p1
depends_on: []
created: 2026-03-18
---

## 목표
AI가 구현 요청을 받았을 때, 관련 태스크가 없으면 먼저 태스크를 생성하고 사용자 승인 후 작업을 시작하도록 강제한다.

## 구현 항목
- [x] CLAUDE.md Plank Integration 섹션에 "태스크 선등록 필수" 규칙 추가
- [x] 규칙 내용: 관련 태스크 없으면 생성 제안 → 승인 후 구현 착수
- [x] 태스크 생성 시 체크리스트에 구현 항목을 미리 정리하도록 지시 추가
