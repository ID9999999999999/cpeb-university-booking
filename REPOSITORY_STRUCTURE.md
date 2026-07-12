# Repository Structure

The repository root is organized by engineering responsibility.

| Area | Location | Responsibility | Status |
|---|---|---|---|
| Product source | `apps/` | Executable backend and Android applications | ✅ |
| Documentation | `docs/` | Architecture, API, database, decisions, progress, roadmap | ✅ |
| Verification | `tests/` | Unit, integration, E2E, performance, security tests | 🟡 |
| Evidence | `evidence/` | Logs, screenshots, and proof of completed work | ✅ |
| Automation | `scripts/` | Development, database, verification, release scripts | 🟡 |
| GitHub automation | `.github/` | Workflows, issue templates, pull-request rules | 🟡 |
| Governance | Root Markdown files | Contribution, security, license, changelog | ✅ |
| Operations | `docker-compose.yml` | Local service orchestration | 🟡 |

Legend:

- ✅ Present and meaningfully populated
- 🟡 Structure exists but implementation is incomplete
- ❌ Not implemented
