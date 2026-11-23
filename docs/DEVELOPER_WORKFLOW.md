# AuraGen Team Collaboration & Developer Workflow

**Team:** Yusuf, Pavilson, Raksha, Jeevan  
**Branch:** `raksha-telemetry`  
**Repository:** `https://github.com/mdyusuf06/Project-1-AuraGen.git`

---

## 1. Team Ownership & Modular Architecture

AuraGen enforces strict module boundaries to allow all four engineers to develop in parallel without code collision:

| Member | Primary Modules | Key Responsibilities |
| :--- | :--- | :--- |
| **Raksha R.** | `frontend/telemetry`<br>`frontend/animation`<br>`frontend/fallback`<br>`frontend/polish` | Telemetry calibration, cognitive score math, Framer Motion morphing, error boundary, 4s timeout, prebuilt templates integration, 100% bidirectional form revert, ARIA accessibility, Telemetry Debug HUD. |
| **Yusuf** | `backend/server`<br>`frontend/renderer`<br>`frontend/form` | WebSocket server transport, dynamic code evaluation sandbox (`new Function` scope), form serialization, message protocol dispatch, final integration. |
| **Jeevan** | `backend/pipeline` | LangChain GPT-4o code-generation pipeline, prompt engineering, token streaming, retry loop. |
| **Pavilson** | `backend/validator` | Babel AST security validator, banned call detection (`eval`, `fetch`, `window`), pre-built fallback wizard templates. |

---

## 2. Git Branching Strategy & Working Conventions

### 2.1 Branch Conventions
- **`main`**: Production-ready, fully integrated monorepo. Direct pushes to `main` are strictly forbidden.
- **`raksha-telemetry`**: Active working branch for Member 4 (Raksha R.) frontend telemetry, animation, fallback UI, and polish.
- **`member-1---Yusuf`**, **`member-2---Pavilson`**, **`member-3---Jeevan`**: Dedicated peer branches.

### 2.2 Safety Directives
1. **Never use force pushes (`git push --force`)** on any branch.
2. **Never use destructive resets (`git reset --hard`)** on uncommitted work.
3. **Never commit `.env` or `.env.local` files** containing sensitive secrets or API keys. Ensure they remain listed in `.gitignore`.
4. **Never modify teammates' designated modules** without prior coordination.

---

## 3. Commit Message Standards

AuraGen adheres to the Conventional Commits specification:

- `feat(telemetry): ...` — New telemetry features, metric calculations, or simulator controls.
- `feat(animation): ...` — Framer Motion variants, morph transitions, or step navigation.
- `feat(fallback): ...` — Error boundary UI, timeout handling, or pre-built templates.
- `feat(form): ...` — Form schema updates or bidirectional state preservation.
- `fix(frontend): ...` — Bug fixes in UI components or client hooks.
- `docs: ...` — Documentation improvements, architecture guides, or API specifications.
- `test: ...` — Adding or refining unit or integration tests.

---

## 4. Pre-Push Quality Checklist

Before staging, committing, and pushing changes to `origin raksha-telemetry`:

1. **Verify Active Branch:**
   ```powershell
   git branch --show-current  # Must output: raksha-telemetry
   ```
2. **Run All Automated Tests:**
   ```powershell
   npm --prefix frontend test
   npm --prefix backend test
   ```
   *Requirement:* All 49 test cases across frontend and backend must pass with 0 failures.
3. **Verify Production Compilation:**
   ```powershell
   npm --prefix frontend run build
   ```
   *Requirement:* Static generation and route bundle compilation must succeed with 0 errors.
4. **Inspect Git Status & Diff:**
   ```powershell
   git status
   git diff
   ```
   *Requirement:* Verify only files within your assigned module scope are staged. No `.env`, `.next`, or build artifacts.
5. **Push to Assigned Remote:**
   ```powershell
   git push origin raksha-telemetry
   ```

---

## 5. Peer Review & Pull Request Guidelines

When merging your branch into team integration branches:
1. **Never merge directly into `main`:** Always open a Pull Request from `raksha-telemetry` against `main`.
2. **Assign Reviewers:**
   - **Yusuf:** For WebSocket protocol or form state integration points.
   - **Pavilson:** For fallback template conformance or AST validation rules.
   - **Jeevan:** For code generation prompt contracts.
3. **Squash Merges:** Prefer squash merging for clean, linear Git history on `main`.

---

## 6. Safe Conflict Resolution & Emergency Revert Protocol

If Git reports merge conflicts or remote divergence:
- **Do NOT force push (`git push --force`):** It destroys teammates' commit history.
- **Do NOT use hard resets (`git reset --hard`):** It destroys uncommitted local work.
- **Rebase or Fetch Merge:**
  ```powershell
  git fetch origin
  git merge origin/main --no-commit
  ```
- **Reverting a Problematic Commit Safely:**
  ```powershell
  git revert <commit_hash> -m 1
  git push origin raksha-telemetry
  ```

---

## 7. Recommended Developer Git Aliases

Add these productivity aliases to your global Git config (`git config --global alias.<name> "<command>"`):
- `git st`: `status -s` (Compact status)
- `git lg`: `log --oneline --graph --decorate -10` (Visual branch tree)
- `git df`: `diff --stat` (Quick diff summary)
- `git verify`: `!npm --prefix frontend test && npm --prefix backend test` (Run both test suites)
