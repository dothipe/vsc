import { WORKSPACE_MANIFEST, WorkspaceConfig, WorkflowStage } from "./workspaceManifest";
import { Capability, TournamentRole, GlobalRole, hasCapability } from "./permissions";

export interface NavigationItem {
  id: string;
  title: string;
  description: string;
  icon: any;
  order: number;
  routeContextBinding: "global" | "tournament";
  repositoryOwner: string;
  businessEngineOwner: string;
  workflowStage: string | null;
}

/**
 * Resolves the dynamic visible navigation items based on the active state
 * representing the ultimate culmination of:
 * Workspace Manifest -> Permission Engine -> Workflow Engine -> Tournament Context -> Visible Navigation
 */
export function getVisibleNavigation(context: {
  activeHistoryId: string | null;
  currentTournamentDoc: any;
  globalRole: GlobalRole;
  tournamentRole: TournamentRole;
  customSubAdminCaps?: Capability[];
}): NavigationItem[] {
  // 1. Get active tournament workflow stage or status
  const rawStatus = context.currentTournamentDoc?.status || "draft";
  const currentStage: WorkflowStage = rawStatus as WorkflowStage;

  // 2. Filter workspace configurations
  const visibleWorkspaces = WORKSPACE_MANIFEST.filter((ws) => {
    // A. Route/Context Binding Check
    if (ws.id !== "home") {
      if (ws.routeContextBinding === "tournament" && !context.activeHistoryId) {
        return false;
      }
      if (ws.routeContextBinding === "global" && context.activeHistoryId) {
        return false;
      }
    }

    // B. Custom visibility conditions if any
    if (ws.visibilityConditions) {
      if (!ws.visibilityConditions({
        activeHistoryId: context.activeHistoryId,
        currentTournamentDoc: context.currentTournamentDoc,
        globalRole: context.globalRole,
        tournamentRole: context.tournamentRole
      })) {
        return false;
      }
    }

    // C. Global Role Check
    if (ws.allowedGlobalRoles !== "all") {
      if (!ws.allowedGlobalRoles.includes(context.globalRole)) {
        return false;
      }
    }

    // D. Tournament Role Check (Dual-layer security)
    if (context.activeHistoryId && ws.allowedTournamentRoles !== "all") {
      if (!ws.allowedTournamentRoles.includes(context.tournamentRole)) {
        // System owner/Admin global overrides can view all workspaces
        if (context.globalRole !== "system_owner" && context.globalRole !== "admin") {
          return false;
        }
      }
    }

    // E. Capability Layer Check (Unified platform checks)
    if (ws.requiredCapabilities.length > 0) {
      const hasAllCaps = ws.requiredCapabilities.every((cap) =>
        hasCapability(context.globalRole, context.tournamentRole, cap, context.customSubAdminCaps)
      );
      if (!hasAllCaps) {
        return false;
      }
    }

    // F. Workflow Stage Visibility Layer Check
    if (context.activeHistoryId && ws.workflowVisibility !== "all") {
      if (!ws.workflowVisibility.includes(currentStage)) {
        // Platform owner override for maintenance is allowed, but for referee terminal we keep it strict
        if (context.globalRole !== "system_owner" && context.globalRole !== "admin") {
          return false;
        }
      }
    }

    return true;
  });

  // 3. Map and sort items by standard order key
  return visibleWorkspaces
    .map((ws) => ({
      id: ws.id,
      title: ws.title,
      description: ws.description,
      icon: ws.icon,
      order: ws.order,
      routeContextBinding: ws.routeContextBinding,
      repositoryOwner: ws.repositoryOwner,
      businessEngineOwner: ws.businessEngineOwner,
      workflowStage: context.activeHistoryId ? currentStage : null
    }))
    .sort((a, b) => a.order - b.order);
}
export { WORKSPACE_MANIFEST };
