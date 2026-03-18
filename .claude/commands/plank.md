---
name: plank
description: "Plank 태스크 관리 — 태스크 상태 확인, 완료 처리, 체크리스트 업데이트, 새 태스크 생성. .tasks/ 디렉토리가 있는 프로젝트에서 사용."
---

# Plank 태스크 관리

프로젝트의 `.tasks/` 디렉토리를 조작하여 태스크를 관리한다.

## 사용법

사용자가 `/plank` 뒤에 서브커맨드를 붙여 호출한다. 인자가 없으면 `status`를 실행한다.

### `/plank` 또는 `/plank status`
현재 활성 태스크(in-progress, todo) 목록과 진행률을 보여준다.

**실행 방법:**
1. `.tasks/in-progress/`와 `.tasks/todo/` 디렉토리의 모든 `.md` 파일을 읽는다.
2. 각 태스크의 제목, 우선순위, 라벨, 체크리스트 진행률을 파싱한다.
3. 사용자에게 보기 좋은 표 형태로 출력한다.

### `/plank done <task-id>`
태스크를 완료 처리한다.

**실행 방법:**
1. `<task-id>.md` 파일을 `in-progress/`, `todo/`, `backlog/`, `waiting/` 순서로 찾는다.
2. 현재 날짜 기준 ISO 주차 폴더를 계산한다 (예: `2026-W12`).
3. `.tasks/done/{주차}/` 디렉토리가 없으면 생성한다.
4. 태스크 파일을 해당 주차 폴더로 이동한다: `mv .tasks/{column}/{id}.md .tasks/done/{주차}/{id}.md`
5. 이동 결과를 사용자에게 알린다.

### `/plank check <task-id> <item-number>`
태스크의 특정 체크리스트 항목을 완료 처리한다.

**실행 방법:**
1. 태스크 파일을 찾아 읽는다.
2. N번째 `- [ ]` 항목을 `- [x]`로 변경한다.
3. 모든 항목이 완료되었으면 "모든 체크리스트가 완료되었습니다. done으로 이동할까요?"라고 물어본다.

### `/plank new <title>`
새 태스크를 생성한다.

**실행 방법:**
1. 제목을 slugify하여 ID를 생성한다 (한글은 그대로, 공백은 `-`로, 특수문자 제거).
2. 사용자에게 컬럼(기본 `backlog`), 우선순위, 라벨을 물어본다.
3. 다음 형식으로 `.tasks/{column}/{id}.md` 파일을 생성한다:

```markdown
---
id: {id}
title: "{title}"
labels: []
priority: medium
created: {오늘 날짜 YYYY-MM-DD}
depends_on: []
---

## 내용

- [ ] TODO
```

### `/plank move <task-id> <target-column>`
태스크를 다른 컬럼으로 이동한다.

**실행 방법:**
1. 태스크 파일을 현재 위치에서 찾는다.
2. `done`으로 이동하는 경우 주차 폴더 로직을 적용한다.
3. `mv .tasks/{현재컬럼}/{id}.md .tasks/{대상컬럼}/{id}.md`를 실행한다.

## 주의사항

- `.tasks/` 디렉토리가 없으면 "이 프로젝트는 Plank를 사용하지 않습니다"라고 안내한다.
- 태스크 파일의 프론트매터를 수정할 때 기존 필드를 보존한다.
- `done` 이동 시 주차 계산: `date +%G-W%V` (ISO 8601 주차).
- 파일 이동은 Bash의 `mv` 명령을 사용한다.
