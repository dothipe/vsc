# VSC Platform V3 – Navigation Manifest Specification
Version: 1.0 (Frozen)

## 1. Runtime Navigation Resolver
The navigation resolver is defined in `src/foundation/navigationManifest.ts`. It acts as a deterministic firewall that filters the master Workspace Manifest down to the exact permitted set of navigation items for the active session.

### Navigation Resolver Logic:
```typescript
export function getVisibleNavigation(context: {
  activeHistoryId: string | null;
  currentTournamentDoc: any;
  globalRole: GlobalRole;
  tournamentRole: TournamentRole;
  customSubAdminCaps?: Capability[];
}): NavigationItem[]
```

---

## 2. Dynamic Router Safeguards
- **Context Exclusion**: If `activeHistoryId` is null, no tournament-specific workspaces are ever processed. If `activeHistoryId` is defined, global workspaces are hidden.
- **Tab Self-Healing (Synchronization)**: If changes in role, permission, or tournament stage occur, the current view might be filtered out of the navigation manifest. The application automatically redirects the active view to the first permitted view (e.g. Overview Dashboard), preventing broken or black-screen routing states.
- **Strict Role Validation**: Global admins and system owners bypass specific tournament role restrictions, allowing them to oversee tournament maintenance tasks without disrupting native referee flows.
