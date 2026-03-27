---
id: feat-search-filter
title: 검색(Cmd+K)에 필터 기능 추가
labels: [feature]
priority: p2
created: 2026-03-27
depends_on: [feat-priority-filter]
---

## 목표

통합검색(Cmd+K) 모달에서 라벨 / 우선순위로 검색 결과를 필터링할 수 있도록 추가.

## 체크리스트

- [x] `SearchModal`에 필터 칩 UI 추가 (라벨, 우선순위 구분선 포함)
- [x] `useSearch` 훅에 `filterLabels`, `filterPriorities` 상태 추가
- [x] 검색 결과 `useMemo`에 필터 조건 반영 (라벨 AND 우선순위 그룹 내 OR)
- [x] 필터 선택 시 검색어 없어도 해당 조건 태스크만 표시
- [x] 검색어 + 필터 동시 적용 지원
- [x] 검색 모달 닫힐 때 필터 상태 초기화
- [x] 필터 칩 CSS 추가 (`.search-filter-chip`, `.search-filter-dot`, `.search-filter-divider`)
