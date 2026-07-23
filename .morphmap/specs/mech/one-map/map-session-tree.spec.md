spec: task
name: "map-session-tree"
inherits: project
tags: [mech, one-map, sessions, typescript]
---

## Intent

Make the mindmap the session tree. Each branch = one pi subagent session. Store session IDs in node metadata. The map shows running/paused/done sessions. Resume = reattach to session.

This implements one-map.md §2 (Map = Session Manager) without herdr — uses pi subagent sessions instead.

## Decisions

- Session ID stored in `metadata.session_id` (e.g., "subagent-405d2f3d")
- Branch status emoji reflects session state:
  - 🔄 = session active (branch agent running)
  - 💤 = session paused (branch agent set aside)
  - ⬜ = no session (not started)
  - ✅ = session complete (branch done)
- Resume: mark branch 🔄 → reattach to session_id
- Fork: new branch → spawn new subagent → store session_id
- Intercom signals: branch agents send completion signals via intercom
- Parent polls child state.json for status (pull coordination)

## Boundaries

### Allowed Changes
- Edit `.morphmap/mech/seed.ts` — add session_id to parsed nodes
- Edit `.morphmap/mech-pi/morphmap-seed.ts` — preserve session_id on re-seed
- Edit `.morphmap/mech-pi/morphmap-tools.ts` — add session_id to state updates
- Edit `skills/delegate/SKILL.md` — add session tracking instructions
- Edit `skills/run/SKILL.md` — add session monitoring instructions
- Do NOT modify `.morphmap/mech/` pure module logic (only seed.ts)
- Do NOT modify agent prompt files (separate spec)

### Forbidden
- Do NOT change the state machine transition logic
- Do NOT implement herdr integration (deferred to Phase 3)
- Do NOT change the mindmap format

## Completion Criteria

Scenario: Session ID stored in metadata
  Test:
    Package: seed
    Filter: session_id_stored
  Given a mindmap with branch headings
  When seedFromMap parses it
  Then each branch Node has metadata.session_id (or undefined if not started)

Scenario: Resume reattaches to session
  Test:
    Package: map-session-tree
    Filter: resume_reattach
  Given a branch with session_id in state.json
  When /morphmap-delegate is run on that branch
  Then it reattaches to the existing session (not spawning a new one)

Scenario: Fork creates new session
  Test:
    Package: map-session-tree
    Filter: fork_new_session
  Given a branch with no session_id
  When /morphmap-delegate spawns a branch agent
  Then it stores the new session_id in state.json

Scenario: Status reflects session state
  Test:
    Package: map-session-tree
    Filter: status_reflects_session
  Given a branch with an active session
  When the map is rendered
  Then the branch shows 🔄 (not ⬜)

Scenario: Parent polls child state
  Test:
    Package: map-session-tree
    Filter: parent_polls
  Given a parent branch with child branches
  When the parent checks child status
  Then it reads child state.json (not intercom push)

## Out of Scope

- herdr integration (deferred to Phase 3)
- Cross-session intercom (pi-intercom handles this)
- Session persistence across pi restarts (pi handles this)
