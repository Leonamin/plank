# Plank

마크다운 파일 기반의 심플하고 강력한 칸반 보드 태스크 관리 도구입니다.

## 주요 특징

- **파일 기반 저장**: 모든 태스크는 `.tasks/` 디렉토리에 마크다운(`.md`) 파일로 저장됩니다. Git 등으로 버전 관리가 용이합니다.
- **실시간 업데이트**: `Server-Sent Events (SSE)`를 통해 파일 변경 시 브라우저에 실시간으로 반영됩니다.
- **인터렉티브 칸반**: 드래그 앤 드롭으로 태스크 상태를 변경할 수 있습니다.
- **마크다운 지원**: 태스크 내용에 마크다운을 사용할 수 있으며, 체크리스트(`- [ ]`)는 보드에서 즉시 토글이 가능합니다.
- **주차별 완료 관리**: `done` 컬럼으로 이동된 태스크는 자동으로 해당 주차(예: `2026-W12`) 폴더로 분류됩니다.
- **의존성 관리**: 태스크 간의 선행 조건을 설정하고 시각적으로 확인할 수 있습니다.
- **커스터마이징**: 라벨과 우선순위를 설정을 통해 자유롭게 변경할 수 있습니다.

## 기술 스택

### Frontend
- **React 19** + Vite 6
- Custom CSS (다크 모드)

### Backend
- **Node.js + Express** API 서버 (포트 3456)
- **Chokidar**: 파일 시스템 실시간 감시
- **gray-matter**: 마크다운 프론트매터 파싱
- **js-yaml**: YAML 설정 파일 관리

## 프로젝트 구조

```
plank/
├── .tasks/              # 태스크 마크다운 파일 저장소 (자동 생성)
│   ├── config.yml       # 보드 설정 (컬럼, 라벨, 우선순위)
│   ├── backlog/         # 백로그
│   ├── todo/            # 이번주 할 일
│   ├── in-progress/     # 진행중
│   ├── waiting/         # 대기중
│   └── done/            # 완료 (주차별 자동 정리)
│       └── 2026-W12/
├── server/
│   └── index.js         # Express API 서버 및 파일 관리 로직
├── src/
│   ├── App.jsx          # 메인 React 애플리케이션
│   ├── index.css        # 스타일시트
│   └── main.jsx         # React 엔트리 포인트
├── index.html
├── vite.config.js
└── package.json
```

## 시작하기

```bash
# 설치
npm install

# 개발 모드 (클라이언트 + 서버 동시 실행)
npm run dev

# 클라이언트만
npm run dev:client

# 서버만
npm run dev:server

# 프로덕션 빌드
npm run build
```

- 클라이언트: `http://localhost:4568`
- API 서버: `http://localhost:4567`
- Vite 프록시가 `/api` 요청을 서버로 전달합니다.

## 태스크 파일 형식

각 태스크는 YAML 프론트매터가 포함된 마크다운 파일입니다.

```markdown
---
id: task-id
title: 태스크 제목
labels: ["bug", "frontend"]
priority: p1
created: 2026-03-18
depends_on: ["other-task-id"]
---

## 내용
- [ ] 체크리스트 1
- [x] 체크리스트 2
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 고유 식별자 (파일명 기반 자동 생성) |
| `title` | string | 태스크 제목 |
| `labels` | string[] | 라벨 ID 목록 |
| `priority` | string | 우선순위 (`p0` ~ `p3`, 기본 `medium`) |
| `created` | string | 생성일 (YYYY-MM-DD) |
| `depends_on` | string[] | 선행 태스크 ID 목록 |

## API

| Method | Endpoint | 설명 |
|--------|----------|------|
| `GET` | `/api/events` | SSE 스트림 (파일 변경 시 `reload` 이벤트) |
| `GET` | `/api/config` | 보드 설정 조회 |
| `PUT` | `/api/config` | 보드 설정 수정 |
| `GET` | `/api/tasks` | 전체 태스크 목록 (컬럼별 그룹) |
| `POST` | `/api/tasks` | 새 태스크 생성 |
| `POST` | `/api/tasks/move` | 태스크 컬럼 이동 |
| `GET` | `/api/tasks/:column/:id` | 단일 태스크 조회 |
| `PUT` | `/api/tasks/:column/:id` | 태스크 수정 |

## 설정

`.tasks/config.yml` 파일에서 보드의 컬럼, 라벨, 우선순위를 정의합니다. 애플리케이션 내 설정 버튼을 통해 라벨과 우선순위의 이름/색상을 변경할 수 있습니다.

## AI CLI 연동 (Claude Code)

이 프로젝트는 Claude Code와 자동으로 연동됩니다. 별도 설정 없이 `clone` 후 바로 사용 가능합니다.

### 자동 동작
- **매 프롬프트마다** `.tasks/in-progress/`, `.tasks/todo/`의 태스크 목록이 AI에 자동 주입됩니다 (`.claude/hooks/plank-status.sh`).
- AI는 구현 요청 시 관련 태스크가 없으면 **먼저 태스크 생성을 제안**합니다.

### 슬래시 커맨드
| 커맨드 | 설명 |
|--------|------|
| `/plank` | 현재 활성 태스크 상태 확인 |
| `/plank done <id>` | 태스크 완료 처리 (주차 폴더로 이동) |
| `/plank check <id> <n>` | 체크리스트 항목 토글 |
| `/plank new <title>` | 새 태스크 생성 |
| `/plank move <id> <column>` | 태스크 컬럼 이동 |

### 관련 파일
- `CLAUDE.md` — AI 행동 규칙 (Plank Integration)
- `.claude/settings.json` — hook 등록
- `.claude/hooks/plank-status.sh` — 태스크 스캔 스크립트
- `.claude/commands/plank.md` — 슬래시 커맨드 정의
