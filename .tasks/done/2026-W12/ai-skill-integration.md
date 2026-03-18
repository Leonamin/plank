---
id: ai-skill-integration
title: AI 연동 스킬 구현
labels:
  - dev
priority: p2
depends_on:
  - taskboard-prototype
created: 2026-03-18T00:00:00.000Z
---

## 목표
Claude Code에서 .tasks/ 를 직접 읽고 쓸 수 있는 스킬 구현

## 구현 항목
- [ ] "오늘 할 일 보여줘" → todo/ 읽기
- [ ] "X 작업해" → 해당 태스크 파일 읽고 컨텍스트 제공
- [ ] 작업 완료 시 체크리스트 업데이트
- [ ] 태스크 이동 (칼럼 변경)
- [ ] 이번주 리뷰 요약
- [ ] 위 구현 작업들의 컨텍스트를 제공할 때, 그냥 제공하는게 아니라 프롬프트를 짜서 전달해주자

## 메모
- .tasks/ 경로를 CLAUDE.md에서 참조하게 설정
- frontmatter의 depends_on으로 선행조건 자동 체크
