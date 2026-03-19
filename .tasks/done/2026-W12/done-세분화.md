---
id: done-세분화
title: "완료 컬럼 세분화 (done/closed/hold)"
labels:
  - dev
priority: p1
depends_on:
  - 선행조건-ux-개선
created: 2026-03-19
---

## 목표
Done 컬럼 하단에 closed/hold 드롭존을 추가하여 종료 상태를 세분화

## 구현 항목
- [x] 서버: move API에 status 파라미터 추가, frontmatter에 status 저장
- [x] 프론트: Done 컬럼 하단에 closed/hold 드롭존 UI
- [x] 프론트: 드롭 시 status 자동 설정
- [x] 프론트: closed/hold 태스크 접기/펼치기
- [x] 프론트: closed/hold 건수 배지 표시
