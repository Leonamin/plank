---
id: epics-문서-유형-추가
title: docs에 epics 문서 유형 + 템플릿 추가
labels: [dev]
priority: p1
created: 2026-03-19
depends_on: []
---

## 목표
문서 탭 DOC_TYPES에 'epics' 유형을 추가하고, 에픽별 기획/의사결정 로그를 기록할 수 있는 템플릿 제공.

## 구현 항목
- [x] DOC_TYPES 배열에 `{ id: 'epics', label: '에픽', icon: '🎯' }` 추가
- [x] 서버 bootstrap 시 docs/epics/ 폴더 자동 생성
- [x] 에픽 문서 생성 시 기본 템플릿 제공 — newDocType === 'epics'일 때 자동 채움
- [x] config.yml에 epics 문서 템플릿 정의 (또는 하드코딩) — App.jsx에 하드코딩으로 처리

## 에픽 문서 템플릿 (초안)
```markdown
## 왜 (Why)
이 에픽을 만드는 이유.

## 결정된 것
- YYYY-MM-DD: 결정 내용

## 아직 안 정한 것
- 미결 사항

## 태스크 목록
| 태스크 | 상태 |
|--------|------|
| ... | ... |

## 떠오른 생각
- 메모
```

## 메모
- 별도 브랜치에서 작업
