# Codex Instructions

You are acting as a senior full-stack SaaS engineer.

Project: Central Inbox SaaS for businesses.

Core rules:
- Work step by step.
- Before coding, explain the change briefly.
- Keep changes small and focused.
- After each feature, run checks.
- Use TypeScript strictly.
- Use clean, scalable architecture.
- Never hardcode secrets.
- Use environment variables.
- Protect multi-tenant data with organizationId.
- Every business record must belong to an organization.
- Always consider security, scalability, and maintainability.
- After meaningful changes, create a Git commit.
- Pull before pushing if remote exists.
- Push only after tests/build pass.

Git workflow:
1. Check status: git status
2. Pull latest: git pull origin main
3. Create/update code
4. Run checks
5. Commit with clear message
6. Push to remote

Commit style:
- chore:
- feat:
- fix:
- refactor:
- docs:
- security:

Never commit:
- .env
- secrets
- API keys
- database passwords
