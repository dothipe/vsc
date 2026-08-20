export interface DistanceConfig {
  id: string;
  name?: string;
  distance: string; // e.g. "10 Met"
  multiplier: number; // e.g. 10
  scoringType?: "direct" | "hit_miss" | string;
  directMaxPoints?: number;
  shotsCount?: number;
  isCumulative?: boolean;
  isElimination?: boolean;
  isMaxRoundScore?: boolean;
  eliminationType?: "percent" | "count";
  eliminationValue?: number;
  isSolo?: boolean; // Solo shootout option if ties occur at elimination boundary
  isResolo?: boolean; // Re-Solo shootout option
}

export interface Athlete {
  id: string; // e.g. "0001"
  name: string; // e.g. "Nguyễn Văn A"
  team: string; // e.g. "Team 1"
  isPrimaryTeam?: boolean;
  /**
   * Object mapping distanceId -> array of boolean representing hits (true) or misses (false),
   * or numbers representing direct scores.
   * Array length equals shot count (shotsCount).
   */
  scores: Record<string, (boolean | number | null)[]>;
  soloHits?: Record<string, number>; // Record of distanceId -> solo shoutout successful hits
  soloRounds?: Record<string, number[]>; // Record of distanceId -> solo shootout successful hits in multiple rounds
  soloShotDetails?: Record<string, (boolean | number | null)[][]>; // Record of distanceId -> 2D array of shot hits/scores per solo round
  // Additional info for athlete management
  avatarUrl?: string;
  gender?: string; // "Nam" | "Nữ"
  idCard?: string;
  dob?: string;
  hometown?: string;
  province?: string;
  country?: string;
  countryCode?: string;
  status?: string; // "Thi đấu" | "Bỏ thi"
  checkInStatus?: string; // e.g. "checked_in" | "pending"
  email?: string; // Cloud Account email
  calledBy?: string; // Email of referee who called / is scoring this athlete
  
  // VSC V3 optional properties for registration and operational workflow
  vscNumber?: string;
  bibNumber?: string;
  fullName?: string;
  clubName?: string;
  competitionCategory?: string;
  isMasterAthlete?: boolean;
  participantId?: string;
  masterAthleteId?: string;
  qualificationStatus?: string;
  currentStageIndex?: number;
  registeredAt?: string;
  metadata?: string;
  notes?: string;
  paymentStatus?: string;
  paidAt?: string;
  paymentAmount?: number;
  paymentMethod?: string;
  linkedUserId?: string;
  claimStatus?: string;
}

export interface MatchHistoryItem {
  id: string;
  date: string;
  matchName: string;
  shotCount: number;
  distances: DistanceConfig[];
  athletes: Athlete[];
  masterCount?: number;
  masterAthletes?: Athlete[];
  teamDistances?: DistanceConfig[];
  teamShotCount?: number;
  teamAthletes?: Athlete[];
  directMaxShots?: number;
  teamDirectMaxShots?: number;
  startDate?: string;
  endDate?: string;
}

export interface StoredAthleteList {
  id: string;
  name: string;
  createdAt: string;
  athletes: Athlete[];
}

export interface Club {
  id: string; // unique clb ID/code
  name: string; // clb/team name
  avatarUrl?: string; // clb avatar (default empty base64 or URL)
  province?: string; // province of clb (default empty)
}


// ==================== VSC PLATFORM V2 FINAL INTERFACES ====================

export type UserRoleV2 = "super_admin" | "admin" | "organizer" | "referee" | "club_manager" | "athlete" | "viewer";

export interface UserV2 {
  uid: string;
  email: string;
  displayName: string;
  role: UserRoleV2;
  avatar?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface AthleteStatsV2 {
  totalTournaments: number;
  totalShots: number;
  totalHits: number;
  averageAccuracy: number;
  highestAccuracy: number;
  highestScore: number;
  longestHitStreak: number;
  totalMatchesPlayed: number;
  best10m: number;
  best12m: number;
  best15m: number;
  bestTournamentId?: string;
}

export interface AthleteV2 {
  athleteId: string;
  vscNumber: string;
  fullName: string;
  nickname?: string;
  gender: string; // "Nam" | "Nữ" | "Khác"
  dob?: string;
  avatarUrl?: string;
  province: string;
  country: string;
  clubId?: string; // Optional foreign key to clubs
  status: "active" | "suspended" | "retired";
  stats: AthleteStatsV2;
  createdAt?: any;
  updatedAt?: any;
  
  // V2.1 Enhancements
  clubName?: string;
  rankingPoints?: number;
  nationalRank?: number;
  medals?: {
    gold: number;
    silver: number;
    bronze: number;
  };
  best10m?: number;
  best12m?: number;
  best15m?: number;
  bestTournamentScore?: number;
  profileCompleted?: boolean;
}

export interface ClubStatsV2 {
  totalPoints: number;
  clubRanking: number;
  tournamentCount: number;
  podiumCount: number;
}

export interface ClubV2 {
  clubId: string;
  clubCode: string;
  clubName: string;
  shortName: string;
  province: string;
  country: string;
  logoUrl?: string;
  bannerUrl?: string;
  description?: string;
  leaderAthleteId?: string;
  memberCount: number;
  stats: ClubStatsV2;
  createdAt?: any;
  updatedAt?: any;
}

export interface SeasonV2 {
  seasonId: string;
  name: string; // e.g. "VSC 2026"
  startDate: any;
  endDate: any;
  isActive: boolean;
  pointRules: Record<string, number>; // Maps ranks/points rules e.g., {"rank_1": 100, "rank_2": 80}
}

export type TournamentLevelV2 = "club" | "regional" | "national" | "online";
export type TournamentTypeV2 = "paper_target" | "falling_target" | "spinning_target";
export type TournamentFormatV2 = "individual" | "team" | "mixed";

export interface TournamentV2 {
  tournamentId: string;
  seasonId: string;
  title: string;
  description?: string;
  type: TournamentTypeV2;
  level: TournamentLevelV2;
  format: TournamentFormatV2;
  location: string;
  province: string;
  startDate: any;
  endDate: any;
  status: "draft" | "upcoming" | "active" | "completed";
  organizerId: string;
  distances: number[]; // e.g., [10, 12, 15]
  rounds: string[]; // e.g., ["Qualification", "Semi Final", "Final"]
  teamMode: boolean;
  config: Record<string, any>;
  createdAt?: any;
  updatedAt?: any;

  // V2.1 Enhancements
  registrationOpen?: any;
  registrationClose?: any;
  maxAthletes?: number;
  currentAthletes?: number;
  registrationFee?: number;
  prizePool?: number;
  liveboardEnabled?: boolean;
  rankingEnabled?: boolean;
  hallOfFameEnabled?: boolean;
}

export interface RefereeAssignmentV2 {
  assignmentId: string;
  tournamentId: string;
  laneNumber: number;
  roundId: string;
  refereeId: string; // userId of referee
  createdAt?: any;
}

export interface TournamentEntryProgressV2 {
  currentRoundId: string;
  currentDistance: number;
  currentShotIndex: number;
}

export interface TournamentEntryRealtimeStatsV2 {
  currentScore: number;
  accuracy: number;
  currentStreak: number;
  highestStreak: number;
  shotsFired: number;
  shotsRemaining: number;
}

export interface TournamentEntryV2 {
  entryId: string;
  tournamentId: string;
  athleteId: string;
  laneNumber?: number;
  status: "registered" | "checked_in" | "disqualified" | "withdrawn";
  currentProgress: TournamentEntryProgressV2;
  realtimeStats: TournamentEntryRealtimeStatsV2;
  registeredAt?: any;
  checkedInAt?: any;
  updatedAt?: any;
}

export interface ShotLogV2 {
  shotId: string;
  tournamentId: string;
  athleteId: string;
  roundId: string;
  distance: number;
  laneNumber: number;
  shotIndex: number;
  score: number;
  result: "hit" | "miss";
  streakAtMoment: number;
  refereeId: string;
  timestamp: any;
}

export interface TournamentResultV2 {
  resultId: string;
  tournamentId: string;
  seasonId: string;
  athleteId: string;
  rank: number;
  score: number;
  accuracy: number;
  seasonPointsEarned: number;
  createdAt?: any;
}

export interface RankingMedalsV2 {
  gold: number;
  silver: number;
  bronze: number;
}

export interface RankingV2 {
  rankingId: string;
  seasonId: string;
  athleteId: string;
  clubId?: string;
  totalPoints: number;
  rank: number;
  previousRank: number;
  rankMovement: number;
  tournamentsPlayed: number;
  averageAccuracy: number;
  medalsCalculated: RankingMedalsV2;
  updatedAt?: any;
}

export interface AuditLogV2 {
  logId: string;
  userId: string;
  userRole: UserRoleV2;
  action: string; // "EDIT_SCORE" | "DELETE_SCORE" | "UPDATE_RESULT" | "CHANGE_REFEREE" | "UPDATE_CONFIG"
  targetCollection: string;
  targetDocumentId: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: any;
}

export interface SystemSettingsV2 {
  rankingEnabled: boolean;
  clubRankingEnabled: boolean;
  seasonEnabled: boolean;
  liveboardEnabled: boolean;
  auditEnabled: boolean;
  shotLogsEnabled: boolean;
  clubManagementEnabled: boolean;
  athleteProfileEnabled: boolean;
  publicPortalEnabled: boolean;
  maintenanceMode: boolean;

  // V2.1 Enhancements
  databaseVersion?: string;
  seedVersion?: string;
  seedCompleted?: boolean;
  modules?: {
    clubs: boolean;
    rankings: boolean;
    hallOfFame: boolean;
    liveboard: boolean;
    shotLogs: boolean;
    auditLogs: boolean;
  };
}

export interface HallOfFameV2 {
  hallOfFameId: string;
  seasonId: string;
  athleteId: string;
  clubId?: string;
  awardType: "national_champion" | "national_runner_up" | "national_third_place" | "season_champion" | "season_runner_up" | "season_third_place" | "national_record" | "hall_of_fame";
  awardTitle: string;
  description?: string;
  imageUrl?: string;
  achievedAt: any;
  createdAt: any;
}

export interface LaneV2 {
  laneId: string;
  laneNumber: number;
  tournamentId: string;
  refereeId?: string;
  athleteId?: string;
  status: "idle" | "waiting" | "active" | "completed";
  currentRound?: string;
  currentDistance?: number;
  updatedAt: any;
}

export interface DistanceConfigV3 {
  id: string;
  name: string; // Name of round e.g. "Vòng loại"
  distance: string; // e.g. "10m"
  multiplier: number;
  isCumulative: boolean;
  isHighestScore: boolean; // Highest score rule
  isElimination: boolean;
  isSolo: boolean; // Solo Enabled
  isResolo: boolean; // Resolo Enabled
}

export interface TournamentHistoryV3 {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  action: string;
  summary: string;
}

export type TournamentWorkflowState =
  | "draft"
  | "registration_open"
  | "registration_closed"
  | "checkin"
  | "lane_assignment"
  | "ready"
  | "live"
  | "verification"
  | "ranking_locked"
  | "award"
  | "completed"
  | "archived";

export interface TournamentWorkflowHistoryItem {
  id: string;
  state: TournamentWorkflowState;
  updatedAt: string;
  updatedBy: string;
  comment?: string;
}

export interface TournamentV3 {
  id: string;
  tournamentName: string;
  season: string;
  organizer: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
  logo: string;
  banner: string;
  prizePool: number;
  tournamentFormat: "individual" | "team" | "mixed";
  status: "draft" | "registration" | "ready" | "live" | "completed" | "archived";
  workflowState?: TournamentWorkflowState;
  workflowHistory?: TournamentWorkflowHistoryItem[];
  workflowUpdatedAt?: string;
  workflowUpdatedBy?: string;
  headReferee: string;
  assistantReferees: string[];
  notes: string;
  distances: DistanceConfigV3[];
  teamDistances?: DistanceConfig[];
  shotsCount?: number;
  teamShotsCount?: number;
  directMaxShots?: number;
  teamDirectMaxShots?: number;
  directMaxPoints?: number;
  teamDirectMaxPoints?: number;
  laneCapacity?: number;
  athletes?: any[];
  teams?: any[];
  schedule?: { id: string; time: string; activity: string; location: string }[];
  prizeStructure?: string;
  sponsors?: { id: string; name: string; tier: "gold" | "silver" | "bronze"; logo?: string }[];
  scoreEvents?: any[];
  scoreVersions?: any[];
  commandCenterState?: any;
  views?: number;
  registrationFee?: number;
  bankAccountNumber?: string;
  bankAccountName?: string;
  bankName?: string;
  payosClientId?: string;
  payosApiKey?: string;
  payosChecksumKey?: string;
  payosAutoApprove?: boolean;
  createdAt: string;
  updatedAt: string;
  versionHistory: TournamentHistoryV3[];
}

export interface RuleTemplate {
  id: string;
  name: string;
  distances: DistanceConfig[];
  teamDistances: DistanceConfig[];
  shotsCount: number;
  teamShotsCount: number;
  directMaxShots: number;
  teamDirectMaxShots: number;
  directMaxPoints?: number;
  teamDirectMaxPoints?: number;
  isDefault?: boolean;
}

// ==================== MASTER DATA ENTITIES (GLOBAL, NO TOURNAMENT STATE) ====================

export interface ClubHistoryItem {
  clubId: string;
  clubName: string;
  joinDate: string;
  leaveDate?: string;
  reason?: string;
}

export interface ClubRequest {
  id: string;
  clubId: string;
  clubName: string;
  athleteId: string;
  athleteName: string;
  athleteVsc?: string;
  userId: string;
  userEmail: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  reason?: string;
}

export interface MasterAthlete {
  id: string; // Global Athlete ID (e.g. VSC registry number)
  vscNumber: string;
  fullName: string;
  email?: string;
  nickname?: string;
  gender: "Nam" | "Nữ" | "Khác";
  dob?: string; // Date of birth
  avatarUrl?: string; // Sporting/Custom avatar URL
  province: string;
  address?: string;
  country: string;
  clubId?: string; // Links to MasterClub
  clubName?: string; // Read-only view for club name
  registeredClubId?: string;
  registeredClubName?: string;
  clubHistory?: ClubHistoryItem[]; // Career Club history trail
  qrCode?: string; // Base64 or URL for Athlete QR Code
  phone?: string; // Athlete personal phone number
  facebook?: string; // Athlete personal Facebook link
  zalo?: string; // Athlete personal Zalo link
  biography?: string; // Athlete personal bio description
  emergencyContact?: string; // Emergency Contact (athlete-editable)
  personalNotes?: string; // Personal notes/reminders (athlete-editable)
  slingshotType?: string; // Preferred slingshot (e.g., "Ná dẹt chạc 7.5 CNC")
  bandSpec?: string; // Preferred band specifications (e.g., "Precise 0.55 - 19-13-150")
  ammoSize?: string; // Preferred ammunition (e.g., "Bi sắt 7mm")
  shootingStance?: string; // Preferred shooting stance (e.g., "Bắn đứng chạc nghiêng 90 độ")
  achievements?: string; // Key accomplishments (e.g., "Vô địch VSC 2024, Á quân Miền Bắc 2025")
  bestScore10m?: number; // Personal best score at 10m
  bestScore12m?: number; // Personal best score at 12m
  bestScore15m?: number; // Personal best score at 15m
  totalTournaments?: number; // Total tournaments played
  goldMedals?: number; // Gold medals count
  silverMedals?: number; // Silver medals count
  bronzeMedals?: number; // Bronze medals count
  status: "active" | "suspended" | "retired";
  linkedUserId?: string; // Account Claim Protection: Google Auth UID linked to this profile
  claimStatus?: "unclaimed" | "pending_review" | "claimed" | "verified"; // Claim Lifecycle status
  createdAt: string;
  updatedAt: string;
}

export interface MasterClub {
  id: string;
  clubCode: string;
  clubName: string;
  shortName: string;
  province: string;
  country: string;
  logoUrl?: string;
  bannerUrl?: string;
  description?: string;
  foundedDate?: string;
  leaderAthleteId?: string; // References MasterAthlete (Trưởng CLB)
  leaderAthleteName?: string; // Trưởng CLB Name
  memberCount: number;
  achievements?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MasterReferee {
  id: string; // Matches MasterUser.id
  fullName: string;
  licenseLevel: "national" | "regional" | "club";
  badgeNumber?: string;
  status: "active" | "inactive";
  certifiedAt?: string;
}

export interface MasterUser {
  id: string; // Auth UUID (Google UID)
  email: string;
  displayName: string;
  role: "super_admin" | "admin" | "organizer" | "referee" | "club_manager" | "athlete" | "viewer";
  avatarUrl?: string; // google avatar URL
  googleAvatarUrl?: string; // Google avatar explicit
  customAvatarUrl?: string; // Custom uploaded avatar
  googleUid?: string; // Google UID
  googleDisplayName?: string; // Google display name
  googleEmail?: string; // Google email
  authMetadata?: any; // Authentication metadata
  masterAthleteId?: string; // OPTIONAL link to sporting identity (MasterAthlete)
  createdAt: string;
  updatedAt: string;
}

export interface MasterSponsor {
  id: string;
  name: string;
  logoUrl?: string;
  websiteUrl?: string;
  description?: string;
}

// ==================== TOURNAMENT WORKSPACE PARTICIPANTS ====================

export type ParticipantStateV3 =
  | "registered"
  | "checked_in"
  | "withdrawn"
  | "dns"
  | "dq"
  | "qualified"
  | "eliminated"
  | "finished";

export interface TournamentParticipantV3 {
  participantId: string;
  tournamentId: string;
  masterAthleteId?: string; // OPTIONAL: Functions perfectly even if null
  bibNumber: string; // e.g. "BIB-105"
  fullName: string; // Snapshotted from master athlete or custom entered
  gender: "Nam" | "Nữ" | "Khác";
  clubId?: string; // Snapshotted from master club or tournament club
  clubName?: string;
  status: ParticipantStateV3; // Refines checkInStatus with full Participant Lifecycle
  checkInStatus: "pending" | "checked_in" | "withdrawn" | "disqualified"; // Backward-compatibility
  tournamentCategory?: string; // e.g., "Professional", "Amateur"
  qualificationStatus: "qualified" | "not_qualified" | "eliminated" | "pending";
  currentStageIndex: number; // Index in tournament.distances
  metadata?: Record<string, any>;
  registeredAt: string;
  checkedInAt?: string;
  notes?: string;
  qrToken?: string; // Future QR Check-In Compatibility
  checkInTimestamp?: string;
  checkInOperator?: string;
}

// ==================== OPERATIONAL HEAT MODEL (FIRST-CLASS CONCEPT) ====================

export interface HeatV3 {
  heatId: string;
  heatNumber: number;
  tournamentId: string;
  stageId: string; // e.g., distanceConfig.id
  roundId: string;
  status: "pending" | "active" | "completed" | "cancelled";
  refereeId?: string; // Designated head/allocated referee for the heat
  heatType?: "normal" | "solo" | "resolo";
  heatName?: string;
  lanes: {
    laneNumber: number;
    participantId: string;
    fullName: string;
    bibNumber: string;
    clubId?: string;
    refereeId?: string; // Individual lane referee
    shootingOrder: number;
  }[];
  startedAt?: string;
  completedAt?: string;
}

// ==================== OFFICIAL RESULT ENGINE MODELS ====================

export type OfficialResultStatus = "pending" | "verified" | "official" | "corrected" | "revoked" | "archived";

export interface OfficialResult {
  id: string; // Unique Result ID (e.g. res_tournamentId_athleteId)
  tournamentId: string;
  athleteId: string;
  vscNumber: string;
  fullName: string;
  finalRank: number;
  finalMedal: "gold" | "silver" | "bronze" | "top_10" | "none";
  finalQualification: "qualified" | "eliminated" | "tie_at_cutoff" | "solo_required" | "re_solo_required";
  officialStanding: string; // e.g., "Champion", "Runner-Up", "3rd Place", "Top 10", "Participant"
  awardEligibility: boolean;
  seasonPoints: number;
  historicalRecord: boolean;
  officialStatus: "active" | "withdrawn" | "disqualified" | "dns";
  version: number;
  updatedAt: string;
  updatedBy: string;
}

export interface OfficialResultVersion {
  versionNumber: number;
  timestamp: string;
  operator: string;
  reason: string;
  changeSummary: string;
  auditReference: string;
  results: OfficialResult[];
}

export interface OfficialResultAudit {
  id: string;
  resultId: string;
  previousResult: OfficialResult | null;
  newResult: OfficialResult;
  reason: string;
  operator: string;
  approvalChain: string[];
  linkedProtest?: string;
  timestamp: string;
}

export const COMPETITION_CATEGORIES = [
  { value: "Amateur", label: "Amateur (Nghiệp dư)" },
  { value: "Pro", label: "Pro (Chuyên nghiệp)" },
  { value: "Trẻ em", label: "Trẻ em" },
  { value: "Lão tướng", label: "Lão tướng" }
];
