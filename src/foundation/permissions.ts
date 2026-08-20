export type GlobalRole = "guest" | "user" | "user_admin" | "admin" | "system_owner";

export type TournamentRole =
  | "spectator"
  | "athlete"
  | "club_manager"
  | "referee"
  | "head_referee"
  | "sub_admin"
  | "tournament_director"
  | "tournament_owner";

export type Capability =
  | "participants.manage"
  | "checkin.manage"
  | "assignment.generate"
  | "score.enter"
  | "score.solo"
  | "score.unlock"
  | "ranking.freeze"
  | "qualification.run"
  | "official.publish"
  | "official.correct"
  | "liveboard.control"
  | "obs.control"
  | "statistics.view"
  | "audit.view"
  | "settings.manage"
  | "tournament.create"
  | "global.manage_users";

export const TOURNAMENT_ROLE_CAPABILITIES: Record<TournamentRole, Capability[]> = {
  spectator: ["statistics.view"],
  athlete: ["statistics.view"],
  club_manager: ["statistics.view"],
  referee: ["score.enter", "statistics.view", "audit.view"],
  head_referee: ["score.enter", "score.solo", "score.unlock", "statistics.view", "audit.view"],
  sub_admin: ["participants.manage", "checkin.manage", "assignment.generate", "statistics.view", "audit.view"],
  tournament_director: [
    "participants.manage",
    "checkin.manage",
    "assignment.generate",
    "score.enter",
    "score.solo",
    "score.unlock",
    "ranking.freeze",
    "qualification.run",
    "statistics.view",
    "audit.view",
    "liveboard.control",
    "obs.control"
  ],
  tournament_owner: [
    "participants.manage",
    "checkin.manage",
    "assignment.generate",
    "score.enter",
    "score.solo",
    "score.unlock",
    "ranking.freeze",
    "qualification.run",
    "official.publish",
    "official.correct",
    "liveboard.control",
    "obs.control",
    "statistics.view",
    "audit.view",
    "settings.manage"
  ]
};

export const GLOBAL_ROLE_CAPABILITIES: Record<GlobalRole, Capability[]> = {
  guest: [],
  user: [],
  user_admin: ["global.manage_users"],
  admin: ["tournament.create", "global.manage_users"],
  system_owner: ["tournament.create", "global.manage_users"]
};

/**
 * Determine a user's Tournament Role in a specific tournament context
 */
export function getTournamentRole(
  userEmail: string | null | undefined,
  userUid: string | null | undefined,
  tournamentDoc: any
): TournamentRole {
  if (!tournamentDoc) return "spectator";
  if (!userEmail) return "spectator";

  const email = userEmail.toLowerCase().trim();

  // 1. Tournament Owner
  if (
    tournamentDoc.creatorId === userUid ||
    tournamentDoc.creatorEmail?.toLowerCase().trim() === email ||
    (tournamentDoc.creatorId && tournamentDoc.creatorId === userUid)
  ) {
    return "tournament_owner";
  }

  // 2. Head Referee
  if (tournamentDoc.headReferee?.toLowerCase().trim() === email) {
    return "head_referee";
  }

  // 3. Sub Admin
  if (tournamentDoc.subAdmins?.some((subEmail: string) => subEmail.toLowerCase().trim() === email)) {
    return "sub_admin";
  }

  // 4. Referee
  if (tournamentDoc.referees?.some((refEmail: string) => refEmail.toLowerCase().trim() === email)) {
    return "referee";
  }

  // 5. Athlete / Participant
  const athletesList = tournamentDoc.athletes || [];
  const isAthlete = athletesList.some((a: any) => a.email?.toLowerCase().trim() === email || a.id === userUid);
  if (isAthlete) {
    return "athlete";
  }

  return "spectator";
}

/**
 * Determine a user's Global Role
 */
export function getGlobalRole(userEmail: string | null | undefined): GlobalRole {
  if (!userEmail) return "guest";
  const email = userEmail.toLowerCase().trim();
  if (email === "nahnatofficial@gmail.com" || email === "system_owner@vscs.asia") {
    return "system_owner";
  }
  if (email.endsWith("@vscs.asia") || email === "admin@vscs.asia" || email === "user_admin@vscs.asia") {
    return "admin";
  }
  return "user";
}

/**
 * Evaluate if a user has a specific Capability under dual-layer context
 */
export function hasCapability(
  globalRole: GlobalRole,
  tournamentRole: TournamentRole,
  capability: Capability,
  customSubAdminCaps?: Capability[]
): boolean {
  // 1. System Owner/Admin (Global Layer) can override and do emergency recovery / platform maintenance
  if (globalRole === "system_owner") {
    return true;
  }

  if (globalRole === "admin") {
    // If it's a global capability, grant it
    if (capability === "tournament.create" || capability === "global.manage_users") {
      return true;
    }
    // Admin has global override/recovery capabilities
    return true;
  }

  // 2. Handle Sub Admin capability isolation (Section XVI)
  if (tournamentRole === "sub_admin" && customSubAdminCaps) {
    // Basic standard read views are always allowed for sub admin
    if (capability === "statistics.view" || capability === "audit.view") {
      return true;
    }
    return customSubAdminCaps.includes(capability);
  }

  // 3. Fallback to standard tournament role capability list
  const caps = TOURNAMENT_ROLE_CAPABILITIES[tournamentRole] || [];
  return caps.includes(capability);
}

// BACKWARD COMPATIBILITY layer with V2 permission actions
export type UserRoleV2 =
  | "system_owner"
  | "tournament_director"
  | "admin"
  | "head_referee"
  | "referee"
  | "check_in_staff"
  | "score_operator"
  | "media_operator"
  | "athlete"
  | "club_manager"
  | "viewer"
  | "guest"
  | "obs"
  | "tv_display"
  | "api"
  | "system";

export type ActionV2 =
  | "READ"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "EXPORT_DATA"
  | "IMPORT_DATA"
  | "APPROVE_RESULT"
  | "UNLOCK_SCORING"
  | "LOCK_SCORING"
  | "OVERRIDE_RULES"
  | "AUDIT_ACCESS"
  | "SCORE_LEVEL"
  | "ATHLETE_LEVEL"
  | "TOURNAMENT_LEVEL"
  | "SYSTEM_LEVEL";

export function hasPermission(
  role: UserRoleV2 | string,
  action: ActionV2,
  context?: { tournamentId?: string; laneNumber?: number; assignedLane?: number }
): boolean {
  // Translate backward compatibility roles to capabilities
  const adminRoles = ["system_owner", "tournament_director", "admin"];
  if (adminRoles.includes(role)) return true;

  if (action === "READ") return true;

  if (role === "referee") {
    if (action === "LOCK_SCORING" || action === "UNLOCK_SCORING") return true;
  }

  return false;
}

export function normalizeRole(roleString: string | null | undefined): UserRoleV2 {
  if (!roleString) return "guest";
  return "viewer";
}
