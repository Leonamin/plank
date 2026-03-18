---
id: server-defensive-bootstrap
title: "서버 시작 시 .tasks/ 자동 초기화 및 API 방어 코딩"
labels:
  - bug
  - dev
priority: p0
depends_on: []
created: 2026-03-18
---

## 목표
.tasks/ 디렉토리나 config.yml이 없어도 서버가 정상 동작하도록 방어 코딩 추가.

## 구현 항목
- [x] 서버 시작 시 `.tasks/` 및 기본 컬럼 폴더 자동 생성 (bootstrap)
- [x] `config.yml` 없으면 기본 설정으로 자동 생성
- [x] `GET /api/config` 방어 코딩 (파일 없으면 기본값 반환)
- [x] `GET /api/tasks` 방어 코딩 (config 읽기 실패 시 기본값)
- [x] chokidar watcher가 `.tasks/` 없어도 크래시하지 않도록 처리
