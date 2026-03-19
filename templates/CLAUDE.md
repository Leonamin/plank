# Plank Integration

This project uses [Plank](https://github.com/Leonamin/plank) for task management. Tasks are stored as markdown files in `.tasks/`.

## Before Starting Work
- Read `.tasks/` to understand current progress. Check `in-progress/` and `todo/` for related tasks.
- If a related task exists, follow its checklist and dependencies.
- If none exists, create a task with a checklist (`- [ ]`) before starting.

## During / After Work
- Update checklist items (`- [ ]` → `- [x]`) without asking. Add a brief result summary.
- When all items are done, ask the user to move the task to `done`.
- Suggest new tasks for any TODOs discovered during work.

## Task File Rules
- Path: `.tasks/{column}/{id}.md` — move files between directories to change columns.
- Moving to `done`: create a weekly subfolder (e.g., `.tasks/done/2026-W12/`).
- Frontmatter: `id`, `title`, `labels`, `priority`, `created`, `depends_on`.
- New task IDs are slugified from the title.
- Deletion is always soft-delete (move to `.tasks/.trash/`).
