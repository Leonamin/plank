#!/bin/bash
# Plank task status hook — scans .tasks/ and outputs summary for AI context
# Runs on UserPromptSubmit; output is injected as <system-reminder>

TASKS_DIR=".tasks"

# Exit silently if not a Plank project
[ -d "$TASKS_DIR" ] || exit 0

summary=""

for column in in-progress todo; do
  dir="$TASKS_DIR/$column"
  [ -d "$dir" ] || continue

  for f in "$dir"/*.md; do
    [ -f "$f" ] || continue

    id=$(basename "$f" .md)
    title=""
    priority=""
    total=0
    checked=0

    # Parse frontmatter and checklist
    in_front=false
    front_done=false
    while IFS= read -r line; do
      if [ "$front_done" = true ]; then
        if echo "$line" | grep -qE '^\s*- \[[ x]\]'; then
          total=$((total + 1))
          if echo "$line" | grep -qE '^\s*- \[x\]'; then
            checked=$((checked + 1))
          fi
        fi
      elif [ "$line" = "---" ]; then
        if [ "$in_front" = true ]; then
          front_done=true
        else
          in_front=true
        fi
      elif [ "$in_front" = true ]; then
        case "$line" in
          title:*) title="${line#title: }" ; title="${title#\"}" ; title="${title%\"}" ;;
          priority:*) priority="${line#priority: }" ;;
        esac
      fi
    done < "$f"

    info="- [$column] **$id**: $title"
    [ -n "$priority" ] && info="$info ($priority)"
    [ "$total" -gt 0 ] && info="$info [$checked/$total done]"

    summary="$summary
$info"
  done
done

if [ -n "$summary" ]; then
  echo "[PLANK] 현재 활성 태스크:$summary"
fi
