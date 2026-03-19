---
id: npx-init-로직-구현
title: "npx 설치 시 .claude/ 자동 복사 + npm publish"
labels:
  - dev
priority: p0
depends_on: []
created: 2026-03-19
---

## 목표
npx plank-board 실행 시 사용자 프로젝트에 .claude/ (hook, skill, settings)를 자동 복사하여 AI 연동이 바로 동작하게 한다.

## 구현 항목
- [x] CLI 첫 실행 시 .claude/ 파일을 사용자 프로젝트(cwd)로 복사하는 init 로직
- [x] CLAUDE.md도 사용자 프로젝트에 없으면 복사
- [x] 이미 존재하면 덮어쓰지 않음 (사용자 커스텀 보호)
- [ ] npm publish 실행 — `npm adduser` 로그인 후 `npm publish` 필요
- [x] README에 init 동작 안내 추가
