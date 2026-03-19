---
id: refs-문서-연결-시스템
title: "refs 문서 연결 시스템 구현"
labels:
  - dev
priority: p1
depends_on: []
created: 2026-03-19
---

## 목표
.tasks/docs/에 프로젝트 문서를 저장하고, 태스크 frontmatter의 refs 필드로 연결하는 시스템 구현

## 구현 항목
- [x] 서버: 문서 API 추가 (GET/POST/PUT/DELETE /api/docs)
- [x] 서버: .tasks/docs/ 파일트리 조회 API
- [x] 프론트: 헤더에 "문서" 탭 추가
- [x] 프론트: 문서 탭에서 파일트리 탐색 (breadcrumb)
- [x] 프론트: 문서 읽기/생성/편집 UI
- [x] 프론트: 태스크 생성/편집 모달에 refs 피커 추가 (파일트리 선택)
- [x] 프론트: 태스크 읽기 모드에서 refs를 클릭 가능한 링크로 표시
- [x] AI hook 업데이트: refs 파일 내용을 컨텍스트로 주입
