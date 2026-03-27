---
id: fix-esc-close-task-modal
title: 태스크 모달 ESC 닫기 버그 수정
labels:
  - bug
priority: p1
created: 2026-03-27T00:00:00.000Z
---

## 문제

태스크 모달이 열려있을 때 ESC 키를 누르면 닫혀야 하지만 동작하지 않음 (크롬 환경).

## 원인

`TaskDetail.tsx`의 읽기 모드 모달 div에 `onKeyDown` 핸들러와 `tabIndex={-1}`이 있지만,
모달이 마운트될 때 해당 div에 포커스가 자동으로 이동하지 않아 이벤트가 발생하지 않음.

## 체크리스트

- [x] `useRef`로 모달 div 참조 생성
- [x] `useEffect`로 마운트 시 모달 div에 자동 포커스 (`editing`이 false일 때)
- [x] ESC 동작 확인 (읽기 모드)
- [ ] 편집 모드에서도 ESC로 편집 취소 동작 확인
