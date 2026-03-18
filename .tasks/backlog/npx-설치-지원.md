---
id: npx-설치-지원
title: "npx로 설치/실행 가능하게 패키징"
labels:
  - dev
priority: p1
depends_on: []
created: 2026-03-18
---

## 목표
사용자가 자기 프로젝트에서 `npx plank` 또는 `npm install -g plank`로 설치하여 사용할 수 있게 한다.

## 구현 항목
- [ ] package.json에 bin 엔트리 추가
- [ ] CLI 엔트리포인트 작성 (서버 + 클라이언트 동시 실행)
- [ ] 빌드된 프론트엔드를 서버에서 static serve
- [ ] npm publish 설정 (scope, registry)
- [ ] README에 설치/사용법 추가
