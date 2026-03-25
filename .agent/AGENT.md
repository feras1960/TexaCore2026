# Agent Rules — قواعد التشغيل التلقائي

## Auto-Run Policy
Always auto-run safe terminal commands without asking for user approval. This includes:
- `npm run dev`, `npm run build`, `npm start`
- `npx tsc --noEmit`, `npx tsc --pretty`
- `grep`, `rg`, `find`, `ls`, `cat`, `wc`, `head`, `tail`
- `git status`, `git diff`, `git log`
- `sed` for code file modifications
- Any read-only or build commands

## Only Ask Approval For:
- Database destructive operations (DROP, DELETE, TRUNCATE)
- File system destructive operations (rm -rf)
- Installing new global system dependencies
- Any command that modifies production data

## Browser Testing
- Always use browser_subagent for UI testing without restrictions
- The dev server runs on localhost:5173
- Test in Arabic (RTL) mode by default
