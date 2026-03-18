---
id: taskboard-prototype
title: TaskBoard 프로토타입 구현
labels:
  - dev
priority: p0
created: 2026-03-18T00:00:00.000Z
---

## 목표
마크다운 기반 칸반보드 프로젝트 관리 도구 프로토타입

## 구현 항목
- [x] .tasks/ 폴더 구조 + config.yml 스펙 확정
- [x] 태스크 마크다운 파서 (frontmatter → JSON)
- [x] 칸반 웹UI (읽기 전용)
- [x] 드래그앤드롭 이동 (폴더 이동)
- [x] 카드 생성/편집
- [x] 주차별 완료 정리
- [x] P0-P3 우선순위 체계 (라벨형 선택 UI)
- [x] 선행조건 태스크 picker
- [x] 중앙 설정 (라벨/우선순위 GUI 편집)
- [x] 체크리스트 행 전체 클릭 토글
- [ ] 편집기 화살표 키 버그 수정
- [ ] AI 연동 스킬 구현

## 메모
- 셀프 독푸딩: 이 도구 개발 자체를 .tasks/로 관리
- 나중에 Tauri로 맥 앱 래핑 가능
