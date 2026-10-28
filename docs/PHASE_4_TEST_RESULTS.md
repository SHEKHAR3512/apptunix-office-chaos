# Phase 4 — Test Results (2026-10-28)

Only what actually ran is listed as passing. Browser testing was paused at the user's request partway through, so several suites below are **not run**.

## Ran and passed

| Suite | Renderer | Result |
|---|---|---|
| Vitest unit tests (11 files) | — | **64 / 64 passed** after all Phase 4 code changes: the original 51, plus 11 side-job/consequence/save-compat tests and 2 micro-break tests |
| `phase4-navigation.spec.ts` — Chapter 1 by walking | WebGL2 | **Passed** (4.3 min) |
| `phase4-navigation.spec.ts` — Chapter 1 by walking | WebGPU | **Passed** (4.3 min) |
| `tsc --noEmit` | — | Clean after the final change |

Caveat: the two walking passes ran **before** Milestones 3–6 were added (micro-breaks, side jobs, conversation routing, the load fix). These changes alter NPC prompts and dialogue choice, so the walking test should be re-run.

### Walking routes (WebGL2 run; WebGPU matched within a few tenths of a second)

Every route arrived with **0 stuck recoveries**.

| Route | Path (m) | Walked (m) | Detour | Time (s) |
|---|---|---|---|---|
| street → lobby | 8.9 | 8.4 | 0.94 | 3.1 |
| lobby → lift call panel | 6.7 | 6.2 | 0.93 | 2.6 |
| into lift cabin | 2.2 | 1.9 | 0.85 | 1.5 |
| cabin → floor-3 landing | 2.6 | 2.1 | 0.80 | 1.7 |
| landing → office entrance | 7.8 | 8.5 | 1.10 | 4.5 |
| reception → React desk | 13.0 | 14.9 | 1.14 | 7.7 |
| React → CR1 | 21.4 | 25.1 | 1.17 | 12.3 |
| CR1 → React | 25.8 | 29.0 | 1.12 | 13.4 |
| React → QA | 22.0 | 26.1 | 1.19 | 13.0 |
| QA → React workstation | 26.5 | 28.7 | 1.08 | 13.1 |
| React → DevOps | 18.8 | 23.1 | 1.23 | 11.5 |
| → Tushar after deployment | 19.4 | 21.3 | 1.10 | 10.1 |
| free roam after reload | 1.5 | 1.0 | — | 1.0 |

Detours under 1.0 are corner-cutting at arrival radius. Blocked frames per route were 0–5, which is brief wall-sliding at corners and doorways; no route got stuck.

Also verified in that run:
- No movement while the computer is open, with W held.
- Terminal typing (`jmexw`) moved nothing and opened nothing.
- No residual lock after any dialogue or panel.
- The click-to-look hint was hidden on the title screen and the chapter card.
- Reload while the chapter card is up, then Continue, gives free roam and walking works.

### Failures found by the walking runs, and their fixes

| Failure | Cause | Fix |
|---|---|---|
| No Sit prompt at the CR1 chair | Test bug (cursor delta while pointer-locked) | Test: tracked cursor |
| React → QA stuck 0.68 m short | Test target inside furniture | Walker aims at the nav mesh's nearest reachable point and fails if that point is more than 1 m off |
| "Talk to Ramesh" instead of Rockey | **Game:** bystander won the prompt | Story NPCs win the prompt; required objectives outrank optional ones |
| No talk prompt for Shruti, Mohit or Tushar at their desks | **Game:** seated NPCs couldn't be talked to | NPCs the story needs stay talkable while seated |
| Continue missing after reload | Test wiped the save on every navigation | Test: wipe once |

## Not run (written, ready)

| Suite | What it covers |
|---|---|
| `phase4-side-missions.spec.ts` A/B | All five side jobs by walking, reload mid-job, save import, consequences after reload, journal |
| `phase4-regression.spec.ts` | Title/free roam/HUD hint/pause/pointer lock, J/M/U/arrow, computer key isolation, occupied chair, interrupted conversation + reload, CR1 from the east side; performance in 6 scenarios on each renderer |
| `phase2.spec.ts` (14 checks) | Not re-run after the Phase 4 changes. The HUD-hint tweak is covered by the new specs above (once they run). |
| `phase3.spec.ts` | Not re-run. The baseline screenshots were saved for comparison. |

Run them with:
```bash
npx playwright test tests/e2e/phase4-side-missions.spec.ts tests/e2e/phase4-regression.spec.ts
npx playwright test tests/e2e/phase2.spec.ts tests/e2e/phase3.spec.ts tests/e2e/phase4-navigation.spec.ts
```

## Performance

No measurements yet; the performance test has not run. Nothing in the renderer or the toon shading was changed in Phase 4.
