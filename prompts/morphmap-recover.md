# /morphmap-recover

Load skill: morphmap-recover

You are the Root Orchestrator. A delegate session has crashed, leaving orphaned worktrees and git branches.

Run the morphmap-recover skill:
1. Detect orphaned worktrees and `pi-parallel-*` branches
2. Scan each for uncommitted changes
3. Report findings
4. Ask user before merging (unless --auto)
5. Merge selected, delete branches, prune worktrees
6. Log recovery to ## decisions

If user says --auto: merge all without asking.
If user says --dry-run: report only, don't touch anything.
