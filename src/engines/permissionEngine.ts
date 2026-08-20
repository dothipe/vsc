import { TournamentWorkflowState } from "../types";

/**
 * Default standard roles for VSC Platform V3
 */
export type RoleV3 =
  | "system_owner"
  | "admin"             // Platform Admin
  | "tournament_director"
  | "btc"                 // Ban Tổ Chức
  | "head_referee"        // Chief Referee
  | "referee"
  | "lane_operator"
  | "club_manager"
  | "athlete"
  | "viewer"
  | "guest";

/**
 * Standard security resources for VSC Platform V3
 */
export type ResourceV3 =
  | "Tournament"
  | "Athlete"
  | "Club"
  | "Province"
  | "Season"
  | "Round"
  | "Distance"
  | "Lane"
  | "Referee Workspace"
  | "Ledger"
  | "Ranking"
  | "Statistics"
  | "Career"
  | "Achievement"
  | "Hall Of Fame"
  | "Mission"
  | "Audit"
  | "Liveboard";

/**
 * Standard granular security actions
 */
export type ActionV3 =
  | "View"
  | "Create"
  | "Update"
  | "Delete"
  | "Approve"
  | "Publish"
  | "Assign"
  | "Check-in"
  | "Score"
  | "Verify"
  | "Lock"
  | "Archive"
  | "Export"
  | "Import"
  | "Broadcast"
  | "Manage";

/**
 * Interface representing the database-level User Profile structure
 */
export interface UserProfileV3 {
  uid: string;
  email: string;
  displayName?: string;
  role: RoleV3;
  permissions?: string[];
  organization?: string;
  clubId?: string;
  provinceId?: string;
  systemScopes?: string[];
}

export interface PermissionCheckContext {
  userId?: string;
  userEmail?: string;
  clubId?: string;
  provinceId?: string;
  athleteId?: string;
  laneNumber?: number;
}

export class PermissionEngineV3 {
  /**
   * Evaluates if a given Role is permitted to perform an Action on a Resource,
   * factoring in the Tournament's current Workflow State and Context.
   */
  static hasPermission(
    role: RoleV3,
    workflowState: TournamentWorkflowState | undefined,
    resource: ResourceV3,
    action: ActionV3,
    context?: PermissionCheckContext
  ): boolean {
    const currentState: TournamentWorkflowState = workflowState || "draft";

    // 1. System Owner has global, unrestricted override access across all resources and states
    if (role === "system_owner") {
      return true;
    }

    // 2. Platform Admin has global admin controls, except editing finalized state ledgers
    if (role === "admin") {
      if (currentState === "completed" || currentState === "archived") {
        // In final states, platform admins can only perform read, view, export, and history actions
        if (action === "Score" || action === "Update" || action === "Delete" || action === "Assign") {
          return false;
        }
      }
      if (currentState === "ranking_locked" && (resource === "Ledger" || resource === "Ranking")) {
        // Cannot modify scores once ranking is locked
        if (action === "Score" || action === "Update") {
          return false;
        }
      }
      return true;
    }

    // 3. Evaluate by current Workflow State restrictions first
    switch (currentState) {
      case "draft":
        // Allowed: Setup tournament rules, configs, distances, lists, staff
        if (resource === "Tournament" || resource === "Distance" || resource === "Round" || resource === "Province" || resource === "Season") {
          return ["View", "Create", "Update", "Delete", "Manage"].includes(action) && 
            ["tournament_director", "btc"].includes(role);
        }
        if (resource === "Athlete") {
          return ["View", "Create", "Update", "Delete", "Import"].includes(action) && 
            ["tournament_director", "btc"].includes(role);
        }
        // Forbidden: No check-in, no scoring, no publishing
        if (action === "Check-in" || action === "Score" || action === "Verify" || action === "Publish") {
          return false;
        }
        break;

      case "registration_open":
        // Allowed: Athlete registry, clubs, teams
        if (resource === "Athlete") {
          if (role === "athlete" && context?.athleteId === context?.userId) {
            return ["View", "Update"].includes(action); // Can view/update their own profile
          }
          if (role === "club_manager") {
            return ["View", "Create", "Update"].includes(action); // Can register their own club members
          }
          return ["View", "Create", "Update", "Delete", "Import"].includes(action) && 
            ["tournament_director", "btc"].includes(role);
        }
        if (resource === "Club" || resource === "Province") {
          return ["View", "Create", "Update"].includes(action) && 
            ["tournament_director", "btc", "club_manager"].includes(role);
        }
        // Forbidden: No lane assignment, no checkin, no scoring
        if (action === "Assign" || action === "Check-in" || action === "Score" || action === "Verify") {
          return false;
        }
        break;

      case "registration_closed":
        // Athlete lists are locked. No new registrations or edits except by Director/BTC with override
        if (resource === "Athlete") {
          if (["tournament_director", "btc"].includes(role)) {
            return ["View", "Update"].includes(action); // Direct overrides
          }
          return action === "View";
        }
        if (action === "Score" || action === "Verify" || action === "Assign" || action === "Check-in") {
          return false;
        }
        break;

      case "checkin":
        // Allowed: DNS, DNF, Withdraw, check-in operations
        if (resource === "Athlete") {
          if (action === "Check-in" || action === "Update") {
            return ["tournament_director", "btc"].includes(role);
          }
        }
        // Forbidden: No lane assignments or scoring yet
        if (action === "Assign" || action === "Score" || action === "Verify") {
          return false;
        }
        break;

      case "lane_assignment":
        // Allowed: Assign lane, swap, change referees, squads, flights
        if (resource === "Lane" || resource === "Tournament") {
          if (action === "Assign" || action === "Update" || action === "Manage") {
            return ["tournament_director", "btc"].includes(role);
          }
        }
        // Forbidden: Scoring and verify are locked
        if (action === "Score" || action === "Verify") {
          return false;
        }
        break;

      case "ready":
        // Systems check. View-only mode for setups.
        if (resource === "Lane" || resource === "Athlete" || resource === "Tournament") {
          if (action === "View") return true;
          return ["tournament_director", "btc"].includes(role) && action === "Update";
        }
        if (action === "Score") return false;
        break;

      case "live":
        // Live Competition mode. Scopes active.
        if (resource === "Referee Workspace" || resource === "Lane" || resource === "Ledger") {
          if (action === "Score") {
            // Standard Referees and Chief Referees can input scores
            return ["tournament_director", "btc", "head_referee", "referee", "lane_operator"].includes(role);
          }
          if (action === "Verify" || action === "Lock") {
            // Only Chief Referees or Directors can freeze scorecard
            return ["tournament_director", "btc", "head_referee"].includes(role);
          }
        }
        if (resource === "Liveboard" || resource === "Ranking" || resource === "Statistics") {
          if (action === "Broadcast" || action === "Publish") {
            return ["tournament_director", "btc"].includes(role);
          }
          return action === "View";
        }
        break;

      case "verification":
        // Scorecard review, protests resolution, point audit logs.
        if (resource === "Ledger" || resource === "Referee Workspace") {
          if (action === "Verify" || action === "Update" || action === "Approve") {
            // BTC / Chief Referee can modify or resolve complaints
            return ["tournament_director", "btc", "head_referee"].includes(role);
          }
          if (action === "Score") {
            // Standard referee cannot input new raw scores anymore unless authorized
            return ["tournament_director", "btc", "head_referee"].includes(role);
          }
        }
        if (resource === "Audit" || resource === "Liveboard") {
          return ["tournament_director", "btc"].includes(role);
        }
        break;

      case "ranking_locked":
        // Ledger & rankings are sealed.
        if (resource === "Ledger" || resource === "Ranking" || resource === "Athlete") {
          // No edits of any type to scorecards
          if (action === "Update" || action === "Score" || action === "Verify" || action === "Delete" || action === "Assign") {
            return false;
          }
          return action === "View";
        }
        break;

      case "award":
        // Award ceremonies, calculation of Hall of Fame, Career accumulations
        if (resource === "Hall Of Fame" || resource === "Achievement" || resource === "Career") {
          if (action === "Publish" || action === "Update" || action === "Manage") {
            return ["tournament_director", "btc"].includes(role);
          }
          return action === "View";
        }
        break;

      case "completed":
        // Completed state. Strict read-only. No edits allowed anywhere.
        if (action === "View" || action === "Export") {
          return true;
        }
        return false;

      case "archived":
        // Archived state. History query only.
        if (resource === "Career" || resource === "Statistics" || resource === "Season" || resource === "Audit") {
          return action === "View";
        }
        return false;
    }

    // 4. Default standard role permissions fallback (General outside of specific tour status)
    if (action === "View" || action === "Export") {
      return true; // Read-only standard viewing
    }

    // Club managers can manage their specific club data
    if (role === "club_manager" && resource === "Club") {
      return ["Create", "Update"].includes(action);
    }

    // Tournament director and BTC have standard manager permission profiles
    if (["tournament_director", "btc"].includes(role)) {
      return ["View", "Create", "Update", "Delete", "Manage", "Import", "Export"].includes(action);
    }

    return false;
  }

  static mapToRoleV3(globalRole: string, tournamentRole?: string): RoleV3 {
    if (globalRole === "system_owner") return "system_owner";
    if (globalRole === "admin" || globalRole === "user_admin") return "admin";

    if (tournamentRole) {
      switch (tournamentRole) {
        case "tournament_owner": return "tournament_director";
        case "tournament_director": return "tournament_director";
        case "sub_admin": return "btc";
        case "head_referee": return "head_referee";
        case "referee": return "referee";
        case "athlete": return "athlete";
        case "club_manager": return "club_manager";
        case "spectator": return "viewer";
      }
    }

    // Default mappings for individual profile roles
    const normalized = (globalRole || "").toLowerCase().trim();
    if (normalized === "referee") return "referee";
    if (normalized === "head_referee" || normalized === "chief_referee") return "head_referee";
    if (normalized === "athlete") return "athlete";
    if (normalized === "club_manager") return "club_manager";
    if (normalized === "viewer") return "viewer";
    if (normalized === "guest") return "guest";

    return "guest";
  }

  /**
   * Standardized audit log structure
   */
  static logPermissionAudit(
    userId: string,
    email: string,
    role: string,
    resource: ResourceV3,
    action: ActionV3,
    state: TournamentWorkflowState,
    granted: boolean,
    details?: string
  ): void {
    const timestamp = new Date().toISOString();
    const prefix = granted ? "🔓 [GRANTED]" : "❌ [DENIED]";
    const message = `${prefix} User: ${email} (${role}) requested [${action}] on [${resource}] in state [${state}]. Details: ${details || "No additional info."}`;

    if (granted) {
      console.log(`%c${message}`, "color: #10b981; font-weight: bold;", {
        timestamp,
        userId,
        email,
        role,
        resource,
        action,
        state,
        granted
      });
    } else {
      console.warn(`%c${message}`, "color: #ef4444; font-weight: bold;", {
        timestamp,
        userId,
        email,
        role,
        resource,
        action,
        state,
        granted
      });
    }
  }
}
