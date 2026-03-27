---
id: feat-priority-filter
title: 우선순위 필터링 기능 추가
labels: [feature]
priority: p2
created: 2026-03-27
depends_on: [fix-esc-close-task-modal]
---

## 목표

보드 상단 필터 바에 라벨 외 우선순위(Priority) 항목도 필터링 가능하게 추가.

## 체크리스트

- [x] `LabelFilterBar`에 우선순위 섹션 추가 (`priorities` prop)
- [x] `App.tsx` 필터 로직에 우선순위 조건 추가 (`priority:${t.priority}`)
- [x] 라벨/우선순위 필터 동시 적용 시 OR 조건으로 동작
- [x] 우선순위 칩 스타일 (priority color 적용)
- [x] `activeFilters` 상태에 `priority:p1` 형식으로 우선순위 구분자 추가
- [x] 전체 보기 버튼으로 라벨+우선순위 필터 일괄 초기화
- [x] 라벨/우선순위 구분선 CSS 추가 (`.epic-chip-divider`)
