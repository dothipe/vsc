/**
 * VSC Platform V3 - Production Score Validation Engine
 * Implements the rigorous, pure, side-effect-free validation pipeline for score submissions.
 * Incorporates request-level, workflow-level, round-level, and team-level business rule validations.
 */

import { TournamentV3, Athlete, DistanceConfigV3 } from "../types";
import { LaneState } from "./matchEngine";

export type ValidationErrorSeverity = "warning" | "error" | "fatal";

export type ValidationErrorCode =
  | "TOURNAMENT_ARCHIVED"
  | "TOURNAMENT_NOT_LIVE"
  | "INVALID_DISTANCE"
  | "LANE_ALREADY_LOCKED"
  | "ATHLETE_NOT_ASSIGNED"
  | "REFEREE_PERMISSION_DENIED"
  | "MAX_SHOTS_EXCEEDED"
  | "DUPLICATE_SCORE"
  | "INVALID_SCORE_RANGE"
  | "INVALID_OFFLINE_TIMESTAMP"
  | "INVALID_TOURNAMENT_FORMAT"
  // Hardening Phase 2 codes
  | "ROUND_NOT_ACTIVE"
  | "ROUND_NOT_OPEN"
  | "ATHLETE_ELIMINATED"
  | "ATHLETE_NOT_QUALIFIED"
  | "MATCH_CANCELLED"
  | "RANKING_FROZEN"
  | "RESULT_ALREADY_PUBLISHED"
  | "TEAM_CONFIGURATION_INVALID"
  | "TEAM_MEMBER_MISSING"
  | "LANE_NOT_ASSIGNED"
  | "INVALID_WORKFLOW_STATE";

export interface ValidationError {
  code: ValidationErrorCode;
  message: string;
  severity: ValidationErrorSeverity;
  isRecoverable: boolean;
  recommendedAction?: string;
}

export interface RefereeContext {
  userId: string;
  role: string; // "super_admin" | "admin" | "organizer" | "referee" | "club_manager" | "athlete" | "viewer"
  isHeadReferee?: boolean;
}

export interface WorkflowContext {
  isOfflineMode: boolean;
  offlineQueueTimestamp?: string; // ISO string
  isOverrideAllowed?: boolean; // Admin overrides to force-save or re-score
  isSoloMode?: boolean;
  isReSoloMode?: boolean;
  competitionMode?: "individual" | "team";
  
  // Phase 2 Hardening Workflow Fields
  activeRoundIndex?: number;
  activeDistanceId?: string;
  isLaneActivated?: boolean;
  athleteStageReached?: number;
  isAthleteEliminated?: boolean;
  isAthleteQualifiedForRound?: boolean;
  isRankingFrozen?: boolean;
  isResultPublished?: boolean;
  originalLaneAssignmentId?: string;
  currentLaneAssignmentId?: string;
  isMatchCancelled?: boolean;
  
  // Round Validations
  roundOrder?: string[];
  distanceOrder?: string[];
  maxAttemptsAllowed?: number;
  currentAttemptsSubmitted?: number;
  qualificationDependencyMet?: boolean;
}

export interface TeamContext {
  teamId: string;
  clubId?: string;
  athletes: { id: string; name?: string; clubId?: string }[];
  requiredShootersCount?: number;
  minTeamSize?: number;
  maxTeamSize?: number;
  format?: "individual" | "team" | "mixed";
}

export interface ScoreValidationInputV3 {
  tournament: TournamentV3;
  distanceId: string;
  lane: LaneState | null;
  athlete: Athlete;
  scores: (boolean | number | null)[]; // Full array representation
  newShotValue?: boolean | number | string | null; // Single shot to validate
  shotIndex?: number; // Single shot index to validate
  refereeContext: RefereeContext;
  workflowContext?: WorkflowContext;
  teamContext?: TeamContext;
}

export interface ScoreValidationResultV3 {
  isValid: boolean;
  error?: ValidationError;
  sanitizedScores: (boolean | number | null)[];
  metadata?: {
    isBullseye: boolean;
    points: number;
    hasEmptyShots: boolean;
  };
}

export class ScoreValidationEngine {
  /**
   * Evaluates all business rules and constraints against the score logging payload.
   */
  public static validate(input: ScoreValidationInputV3): ScoreValidationResultV3 {
    const {
      tournament,
      distanceId,
      lane,
      athlete,
      scores,
      newShotValue,
      shotIndex,
      refereeContext,
      workflowContext = { isOfflineMode: false },
      teamContext
    } = input;

    // =========================================================================
    // 1. TOURNAMENT LIFECYCLE & STATE VALIDATIONS
    // =========================================================================

    // 1.1 Check Tournament Archived State
    if (tournament.status === "archived") {
      return {
        isValid: false,
        error: {
          code: "TOURNAMENT_ARCHIVED",
          message: "Giải đấu đã được lưu trữ. Không thể chỉnh sửa hoặc ghi nhận điểm số mới.",
          severity: "fatal",
          isRecoverable: false,
          recommendedAction: "Liên hệ Ban tổ chức để mở khóa giải đấu nếu thực sự cần thiết."
        },
        sanitizedScores: scores
      };
    }

    // 1.2 Check Tournament Live Status (unless override is active)
    if (tournament.status !== "live" && !workflowContext.isOverrideAllowed) {
      return {
        isValid: false,
        error: {
          code: "TOURNAMENT_NOT_LIVE",
          message: `Giải đấu đang ở trạng thái "${tournament.status}". Chỉ có thể ghi điểm khi giải đấu đang TRỰC TIẾP.`,
          severity: "error",
          isRecoverable: true,
          recommendedAction: "Yêu cầu Ban kỹ thuật chuyển trạng thái giải đấu sang Trực tiếp (Live)."
        },
        sanitizedScores: scores
      };
    }

    // =========================================================================
    // 2. WORKFLOW STATE VALIDATIONS
    // =========================================================================

    // 2.1 Active Round / Distance is not currently opened by WorkflowEngine
    if (workflowContext.activeDistanceId && workflowContext.activeDistanceId !== distanceId && !workflowContext.isOverrideAllowed) {
      return {
        isValid: false,
        error: {
          code: "ROUND_NOT_OPEN",
          message: "Vòng đấu hoặc cự ly được yêu cầu chưa được mở bởi WorkflowEngine.",
          severity: "error",
          isRecoverable: false,
          recommendedAction: "Vui lòng đợi WorkflowEngine kích hoạt cự ly này trước khi nhập điểm."
        },
        sanitizedScores: scores
      };
    }

    // 2.2 Validate Match Cancellations
    if (workflowContext.isMatchCancelled && !workflowContext.isOverrideAllowed) {
      return {
        isValid: false,
        error: {
          code: "MATCH_CANCELLED",
          message: "Lượt đấu này đã bị hủy bỏ.",
          severity: "error",
          isRecoverable: false,
          recommendedAction: "Kiểm tra lại trạng thái lịch trình hoặc tạo lượt đấu mới."
        },
        sanitizedScores: scores
      };
    }

    // 2.3 Athlete is already eliminated
    if (workflowContext.isAthleteEliminated && !workflowContext.isOverrideAllowed) {
      return {
        isValid: false,
        error: {
          code: "ATHLETE_ELIMINATED",
          message: `VĐV "${athlete.name}" đã bị loại khỏi giải đấu và không thể bắn tiếp.`,
          severity: "error",
          isRecoverable: false,
          recommendedAction: "Không ghi điểm cho VĐV đã bị loại."
        },
        sanitizedScores: scores
      };
    }

    // 2.4 Athlete not qualified for current round
    if (workflowContext.isAthleteQualifiedForRound === false && !workflowContext.isOverrideAllowed) {
      return {
        isValid: false,
        error: {
          code: "ATHLETE_NOT_QUALIFIED",
          message: `VĐV "${athlete.name}" chưa đủ điều kiện vượt qua vòng trước để tham gia vòng đấu này.`,
          severity: "error",
          isRecoverable: false,
          recommendedAction: "Xác thực danh sách VĐV đủ điều kiện tham gia vòng đấu này."
        },
        sanitizedScores: scores
      };
    }

    // 2.5 Athlete has not reached this stage
    if (
      workflowContext.athleteStageReached !== undefined &&
      workflowContext.activeRoundIndex !== undefined &&
      workflowContext.athleteStageReached < workflowContext.activeRoundIndex &&
      !workflowContext.isOverrideAllowed
    ) {
      return {
        isValid: false,
        error: {
          code: "INVALID_WORKFLOW_STATE",
          message: `VĐV "${athlete.name}" chưa đạt tới giai đoạn hiện tại của giải đấu.`,
          severity: "error",
          isRecoverable: false,
          recommendedAction: "Đồng bộ hóa tiến độ bắn của vận động viên trước khi tiếp tục."
        },
        sanitizedScores: scores
      };
    }

    // 2.6 Ranking has already been frozen
    if (workflowContext.isRankingFrozen && !workflowContext.isOverrideAllowed) {
      return {
        isValid: false,
        error: {
          code: "RANKING_FROZEN",
          message: "Bảng xếp hạng cho cự ly này đã bị đóng băng. Không thể thay đổi điểm số.",
          severity: "error",
          isRecoverable: false,
          recommendedAction: "Liên hệ Tổng trọng tài để yêu cầu rã đông (unfreeze) nếu cần điều chỉnh điểm số."
        },
        sanitizedScores: scores
      };
    }

    // 2.7 Result publication has been completed
    if (workflowContext.isResultPublished && !workflowContext.isOverrideAllowed) {
      return {
        isValid: false,
        error: {
          code: "RESULT_ALREADY_PUBLISHED",
          message: "Kết quả chính thức đã được công bố công khai. Bảng điểm đã bị khóa vĩnh viễn.",
          severity: "fatal",
          isRecoverable: false,
          recommendedAction: "Mọi thay đổi sau công bố phải thông qua Ban khiếu nại của BTC."
        },
        sanitizedScores: scores
      };
    }

    // 2.8 Lane assignment has changed after the score page was opened
    if (
      workflowContext.originalLaneAssignmentId &&
      workflowContext.currentLaneAssignmentId &&
      workflowContext.originalLaneAssignmentId !== workflowContext.currentLaneAssignmentId
    ) {
      return {
        isValid: false,
        error: {
          code: "LANE_NOT_ASSIGNED",
          message: "Phân công bệ bắn đã thay đổi sau khi trang ghi điểm được mở.",
          severity: "error",
          isRecoverable: true,
          recommendedAction: "Vui lòng tải lại trang để cập nhật phân công bệ bắn mới nhất."
        },
        sanitizedScores: scores
      };
    }

    // =========================================================================
    // 3. ROUND VALIDATIONS & DEPENDENCIES
    // =========================================================================

    // 3.1 Validate Distance Configurations
    const distanceConfig = tournament.distances.find((d) => d.id === distanceId);
    if (!distanceConfig) {
      return {
        isValid: false,
        error: {
          code: "INVALID_DISTANCE",
          message: `Cự ly/Vòng bắn với ID "${distanceId}" không tồn tại trong cấu hình giải đấu.`,
          severity: "error",
          isRecoverable: false,
          recommendedAction: "Kiểm tra lại danh sách cự ly cấu hình của giải đấu hiện tại."
        },
        sanitizedScores: scores
      };
    }

    // 3.2 Validate Distance Order Sequence
    if (workflowContext.distanceOrder && workflowContext.distanceOrder.length > 0) {
      const targetIndex = workflowContext.distanceOrder.indexOf(distanceId);
      if (targetIndex === -1) {
        return {
          isValid: false,
          error: {
            code: "INVALID_DISTANCE",
            message: "Cự ly này không nằm trong trình tự vòng đấu chính thức.",
            severity: "error",
            isRecoverable: false
          },
          sanitizedScores: scores
        };
      }
    }

    // 3.3 Validate Qualification Dependencies
    if (workflowContext.qualificationDependencyMet === false && !workflowContext.isOverrideAllowed) {
      return {
        isValid: false,
        error: {
          code: "ATHLETE_NOT_QUALIFIED",
          message: "VĐV chưa vượt qua vòng kiểm tra điều kiện tiên quyết.",
          severity: "error",
          isRecoverable: false
        },
        sanitizedScores: scores
      };
    }

    // 3.4 Validate Attempt Limits
    if (
      workflowContext.currentAttemptsSubmitted !== undefined &&
      workflowContext.maxAttemptsAllowed !== undefined &&
      workflowContext.currentAttemptsSubmitted >= workflowContext.maxAttemptsAllowed &&
      !workflowContext.isOverrideAllowed
    ) {
      return {
        isValid: false,
        error: {
          code: "INVALID_WORKFLOW_STATE",
          message: `VĐV đã vượt quá số lần nộp bảng điểm tối đa (${workflowContext.maxAttemptsAllowed}) cho vòng đấu này.`,
          severity: "error",
          isRecoverable: false
        },
        sanitizedScores: scores
      };
    }

    // =========================================================================
    // 4. LANE & REFEREE MATCH VALIDATIONS
    // =========================================================================

    // 4.1 Check Lane Activation status
    if (lane && workflowContext.isLaneActivated === false && !workflowContext.isOverrideAllowed) {
      return {
        isValid: false,
        error: {
          code: "ROUND_NOT_ACTIVE",
          message: `Bệ bắn số ${lane.laneNumber} chưa được kích hoạt cho lượt đấu hiện tại.`,
          severity: "error",
          isRecoverable: true,
          recommendedAction: "Tổng trọng tài cần bấm kích hoạt bệ bắn trên hệ thống."
        },
        sanitizedScores: scores
      };
    }

    // 4.2 Validate Lane Locking
    if (lane && lane.status === "completed" && !workflowContext.isOverrideAllowed) {
      return {
        isValid: false,
        error: {
          code: "LANE_ALREADY_LOCKED",
          message: `Bệ bắn số ${lane.laneNumber} đã hoàn thành và khóa bảng điểm.`,
          severity: "error",
          isRecoverable: true,
          recommendedAction: "Sử dụng tài khoản Quản trị viên (Admin) hoặc Tổng trọng tài để yêu cầu mở khóa bệ bắn."
        },
        sanitizedScores: scores
      };
    }

    // 4.3 Validate Athlete Lane Assignment
    if (lane && lane.athleteId && lane.athleteId !== athlete.id) {
      return {
        isValid: false,
        error: {
          code: "ATHLETE_NOT_ASSIGNED",
          message: `VĐV "${athlete.name}" không được phân công tại bệ bắn số ${lane.laneNumber} (Bệ bắn đang gán cho VĐV ID: ${lane.athleteId}).`,
          severity: "error",
          isRecoverable: true,
          recommendedAction: "Cấu hình lại bệ bắn hoặc đổi sang bệ bắn chính xác của VĐV."
        },
        sanitizedScores: scores
      };
    }

    // 4.4 Validate Referee Access Permissions
    const isPowerUser = ["super_admin", "admin", "organizer"].includes(refereeContext.role);
    const isHeadReferee = tournament.headReferee === refereeContext.userId || refereeContext.isHeadReferee === true;
    const isAssignedReferee = lane ? lane.refereeId === refereeContext.userId : false;
    const isAssistant = tournament.assistantReferees?.includes(refereeContext.userId);

    const hasPermission = isPowerUser || isHeadReferee || isAssignedReferee || isAssistant;

    if (!hasPermission) {
      return {
        isValid: false,
        error: {
          code: "REFEREE_PERMISSION_DENIED",
          message: "Tài khoản của bạn không có quyền ghi điểm cho bệ bắn này.",
          severity: "error",
          isRecoverable: false,
          recommendedAction: "Đăng nhập bằng tài khoản Trọng tài được phân công bệ bắn hoặc liên hệ Tổng trọng tài."
        },
        sanitizedScores: scores
      };
    }

    // =========================================================================
    // 5. TEAM RULE VALIDATIONS
    // =========================================================================
    if (teamContext) {

      // Format compatibility
      if (teamContext.format && teamContext.format !== tournament.tournamentFormat) {
        return {
          isValid: false,
          error: {
            code: "TEAM_CONFIGURATION_INVALID",
            message: `Định dạng đội hình (${teamContext.format}) không khớp với cấu hình giải đấu (${tournament.tournamentFormat}).`,
            severity: "error",
            isRecoverable: false
          },
          sanitizedScores: scores
        };
      }

      // Check min size limit
      const minSize = teamContext.minTeamSize || 3;
      if (teamContext.athletes.length < minSize) {
        return {
          isValid: false,
          error: {
            code: "TEAM_MEMBER_MISSING",
            message: `Số lượng thành viên đội hình (${teamContext.athletes.length}) ít hơn mức tối thiểu quy định (${minSize}).`,
            severity: "error",
            isRecoverable: false
          },
          sanitizedScores: scores
        };
      }

      // Check max size limit
      const maxSize = teamContext.maxTeamSize || 5;
      if (teamContext.athletes.length > maxSize) {
        return {
          isValid: false,
          error: {
            code: "TEAM_CONFIGURATION_INVALID",
            message: `Số lượng thành viên đội hình (${teamContext.athletes.length}) vượt quá mức tối đa cho phép (${maxSize}).`,
            severity: "error",
            isRecoverable: false
          },
          sanitizedScores: scores
        };
      }

      // Check required shooters count
      if (teamContext.requiredShootersCount !== undefined && teamContext.athletes.length < teamContext.requiredShootersCount) {
        return {
          isValid: false,
          error: {
            code: "TEAM_MEMBER_MISSING",
            message: `Đội hình thiếu vận động viên thi đấu chính thức (Yêu cầu ít nhất: ${teamContext.requiredShootersCount}).`,
            severity: "error",
            isRecoverable: false
          },
          sanitizedScores: scores
        };
      }

      // Check duplicate athlete inside team
      const seenIds = new Set<string>();
      for (const tAthlete of teamContext.athletes) {
        if (seenIds.has(tAthlete.id)) {
          return {
            isValid: false,
            error: {
              code: "TEAM_CONFIGURATION_INVALID",
              message: `Có vận động viên trùng lặp trong danh sách đội hình (ID: ${tAthlete.id}).`,
              severity: "error",
              isRecoverable: false
            },
            sanitizedScores: scores
          };
        }
        seenIds.add(tAthlete.id);
      }

      // Check club assignment constraints
      if (teamContext.clubId) {
        const foreignClubAthlete = teamContext.athletes.find(a => a.clubId && a.clubId !== teamContext.clubId);
        if (foreignClubAthlete) {
          return {
            isValid: false,
            error: {
              code: "TEAM_CONFIGURATION_INVALID",
              message: `VĐV "${foreignClubAthlete.name || foreignClubAthlete.id}" thuộc câu lạc bộ khác, không được ghép vào đội hình này.`,
              severity: "error",
              isRecoverable: false
            },
            sanitizedScores: scores
          };
        }
      }
    }

    // =========================================================================
    // 6. SHOT PARAMETERS & PHYSICAL VALIDATIONS
    // =========================================================================

    // 6.1 Determine Shot Limits & Direct Points Settings
    const isTeamFormat = workflowContext.competitionMode === "team" || tournament.tournamentFormat === "team";
    
    const configuredShotsCount = isTeamFormat 
      ? (tournament.teamShotsCount ?? tournament.shotsCount ?? 10) 
      : (tournament.shotsCount ?? 10);

    const configuredDirectMaxShots = isTeamFormat 
      ? (tournament.teamDirectMaxShots ?? tournament.directMaxShots) 
      : tournament.directMaxShots;

    const configuredDirectMaxPoints = isTeamFormat 
      ? (tournament.teamDirectMaxPoints ?? tournament.directMaxPoints) 
      : tournament.directMaxPoints;

    const isDirectMode = configuredShotsCount === 1 || 
      (configuredDirectMaxShots !== undefined && configuredDirectMaxShots !== null && configuredDirectMaxShots > 0) || 
      (configuredDirectMaxPoints !== undefined && configuredDirectMaxPoints !== null && configuredDirectMaxPoints > 0);

    let maxShots = configuredShotsCount;
    if (isDirectMode) {
      const baseShots = (configuredDirectMaxShots && configuredDirectMaxShots > 0) ? configuredDirectMaxShots : 20;
      const targetShotIdx = (shotIndex !== undefined && shotIndex !== null) ? shotIndex + 1 : 0;
      maxShots = Math.max(baseShots, scores.length, targetShotIdx);
    }

    // Solo/ReSolo modifications (Ignored when in Team Competition Mode)
    if (!isTeamFormat && (workflowContext.isSoloMode || distanceConfig.isSolo)) {
      maxShots = Math.max(configuredShotsCount, scores.length);
    } else if (!isTeamFormat && (workflowContext.isReSoloMode || distanceConfig.isResolo)) {
      maxShots = Math.max(configuredShotsCount, scores.length, 1);
    }

    let maxPointsPerShot = (configuredDirectMaxPoints !== undefined && configuredDirectMaxPoints !== null && configuredDirectMaxPoints > 0) 
      ? configuredDirectMaxPoints 
      : 100000;

    // 6.2 Validate Offline Timestamps
    if (workflowContext.isOfflineMode && workflowContext.offlineQueueTimestamp) {
      const parsedTime = Date.parse(workflowContext.offlineQueueTimestamp);
      if (isNaN(parsedTime)) {
        return {
          isValid: false,
          error: {
            code: "INVALID_OFFLINE_TIMESTAMP",
            message: "Thời gian ghi nhận ngoại tuyến không hợp lệ.",
            severity: "error",
            isRecoverable: false,
            recommendedAction: "Cài đặt lại múi giờ hệ thống và thử lưu lại điểm."
          },
          sanitizedScores: scores
        };
      }
      
      const oneMinuteInFuture = Date.now() + 60000;
      if (parsedTime > oneMinuteInFuture) {
        return {
          isValid: false,
          error: {
            code: "INVALID_OFFLINE_TIMESTAMP",
            message: "Thời gian ghi nhận ngoại tuyến lớn hơn thời gian hiện tại của hệ thống.",
            severity: "error",
            isRecoverable: false,
            recommendedAction: "Cập nhật đồng hồ thiết bị về đúng thời gian thực tế."
          },
          sanitizedScores: scores
        };
      }
    }

    // 6.3 Single Shot validations (Duplicate Submissions & Range Checks)
    if (shotIndex !== undefined && shotIndex !== null) {
      if (shotIndex >= maxShots) {
        return {
          isValid: false,
          error: {
            code: "MAX_SHOTS_EXCEEDED",
            message: `Lượt bắn thứ ${shotIndex + 1} vượt quá giới hạn tối đa ${maxShots} phát bắn của cự ly.`,
            severity: "error",
            isRecoverable: false,
            recommendedAction: "Kiểm tra lại cấu hình số lượng phát bắn của giải đấu."
          },
          sanitizedScores: scores
        };
      }

      // Check Duplicate Submissions
      const existingShot = athlete.scores[distanceId]?.[shotIndex];
      const isDuplicate = existingShot !== undefined && existingShot !== null;

      if (isDuplicate && !workflowContext.isOverrideAllowed) {
        return {
          isValid: false,
          error: {
            code: "DUPLICATE_SCORE",
            message: `Phát bắn thứ ${shotIndex + 1} đã có điểm số ghi nhận (${existingShot}). Không thể ghi đè.`,
            severity: "warning",
            isRecoverable: true,
            recommendedAction: "Nếu cần sửa điểm lỗi, bật chế độ ghi đè hoặc đăng nhập quyền Tổng trọng tài."
          },
          sanitizedScores: scores
        };
      }

      // Check Score Range
      if (newShotValue !== undefined && newShotValue !== null) {
        if (isDirectMode) {
          if (typeof newShotValue === "string") {
            const cleanStr = newShotValue.trim().toUpperCase();
            if (cleanStr !== "X") {
              return {
                isValid: false,
                error: {
                  code: "INVALID_SCORE_RANGE",
                  message: `Điểm số "${newShotValue}" không hợp lệ. Phải là số từ 0 đến ${maxPointsPerShot} hoặc ký tự "X".`,
                  severity: "error",
                  isRecoverable: false
                },
                sanitizedScores: scores
              };
            }
          } else if (typeof newShotValue === "number") {
            if (newShotValue < 0 || newShotValue > maxPointsPerShot) {
              return {
                isValid: false,
                error: {
                  code: "INVALID_SCORE_RANGE",
                  message: `Điểm số ${newShotValue} nằm ngoài phạm vi cho phép (0 - ${maxPointsPerShot}).`,
                  severity: "error",
                  isRecoverable: false
                },
                sanitizedScores: scores
              };
            }
          } else {
            return {
              isValid: false,
              error: {
                code: "INVALID_SCORE_RANGE",
                message: "Kiểu dữ liệu điểm số không hợp lệ đối với chế độ tính điểm trực tiếp.",
                severity: "error",
                isRecoverable: false
              },
              sanitizedScores: scores
            };
          }
        } else {
          // Binary scoring (hit or miss)
          if (typeof newShotValue !== "boolean" && newShotValue !== 0 && newShotValue !== 1) {
            return {
              isValid: false,
              error: {
                code: "INVALID_SCORE_RANGE",
                message: "Chế độ bia đổ yêu cầu kết quả kiểu Trúng (Hit/true) hoặc Trượt (Miss/false).",
                severity: "error",
                isRecoverable: false
              },
              sanitizedScores: scores
            };
          }
        }
      }
    }

    // 6.4 Bulk Scores Validations & Sanitization
    const actualScores = (isDirectMode && scores.length > maxShots) ? scores.slice(0, maxShots) : scores;

    if (actualScores.length > maxShots) {
      return {
        isValid: false,
        error: {
          code: "MAX_SHOTS_EXCEEDED",
          message: `Mảng kết quả chứa ${actualScores.length} phần tử, vượt quá số lượng phát bắn quy định (${maxShots}).`,
          severity: "error",
          isRecoverable: false
        },
        sanitizedScores: scores
      };
    }

    const sanitized: (boolean | number | null)[] = [];
    let containsBullseye = false;
    let totalPointsAccumulated = 0;
    let emptyDetected = false;

    for (let i = 0; i < maxShots; i++) {
      let rawVal = i === shotIndex && newShotValue !== undefined ? newShotValue : actualScores[i];

      if (rawVal === undefined || rawVal === null || rawVal === "") {
        sanitized.push(null);
        emptyDetected = true;
        continue;
      }

      if (isDirectMode) {
        if (typeof rawVal === "string" && rawVal.trim().toUpperCase() === "X") {
          sanitized.push(maxPointsPerShot); // 'X' gets full points
          containsBullseye = true;
          totalPointsAccumulated += maxPointsPerShot;
        } else {
          const num = Number(rawVal);
          if (isNaN(num) || num < 0 || num > maxPointsPerShot) {
            return {
              isValid: false,
              error: {
                code: "INVALID_SCORE_RANGE",
                message: `Phần tử thứ ${i + 1} có giá trị ${rawVal} không hợp lệ cho chế độ điểm (0 - ${maxPointsPerShot}).`,
                severity: "error",
                isRecoverable: false
              },
              sanitizedScores: scores
            };
          }
          sanitized.push(num);
          totalPointsAccumulated += num;
          if (num === maxPointsPerShot) {
            containsBullseye = true; // max score considered a center ring bullseye
          }
        }
      } else {
        // Binary Mode
        let boolVal = false;
        if (typeof rawVal === "boolean") {
          boolVal = rawVal;
        } else if (rawVal === "1" || rawVal === 1 || rawVal === "true" || rawVal === "X" || rawVal === "x") {
          boolVal = true;
        } else if (rawVal === "0" || rawVal === 0 || rawVal === "false") {
          boolVal = false;
        } else if (typeof rawVal === "number") {
          boolVal = rawVal > 0;
        } else if (typeof rawVal === "string") {
          const num = Number(rawVal);
          boolVal = !isNaN(num) ? num > 0 : Boolean(rawVal);
        }
        sanitized.push(boolVal);
        if (boolVal) {
          totalPointsAccumulated += 1;
        }
      }
    }

    return {
      isValid: true,
      sanitizedScores: sanitized,
      metadata: {
        isBullseye: containsBullseye,
        points: totalPointsAccumulated,
        hasEmptyShots: emptyDetected
      }
    };
  }
}
