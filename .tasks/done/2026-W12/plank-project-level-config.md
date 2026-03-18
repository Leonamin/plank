---
id: plank-project-level-config
title: "Plank AI 연동을 프로젝트 레벨로 이동"
labels:
  - dev
priority: p1
depends_on:
  - ai-skill-integration
created: 2026-03-18
---

## 목표
현재 개인 홈 디렉토리(`~/.claude/`)에 있는 Plank AI 연동 설정을 프로젝트 내로 이동하여 다른 사용자도 clone만으로 사용 가능하게 한다.

## 구현 항목
- [x] `~/.claude/hooks/plank-status.sh` → 프로젝트 `.claude/hooks/plank-status.sh`로 이동
- [x] 프로젝트 `.claude/settings.json`에 hook 등록
- [x] `~/.claude/skills/plank/SKILL.md` → 프로젝트 `.claude/commands/plank.md`로 이동
- [x] 프로젝트 루트 `CLAUDE.md`에 Plank Integration 지시 작성
- [x] 글로벌 `~/.claude/CLAUDE.md`에서 Plank 섹션 제거 (프로젝트 레벨로 대체)
- [x] README에 AI 연동 사용법 안내 추가
