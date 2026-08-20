import { TournamentWorkflowState, TournamentV3 } from "../types";

export interface WorkflowTransition {
  from: TournamentWorkflowState;
  to: TournamentWorkflowState;
  label: string;
  description: string;
  roleRequired: string[];
}

export const WORKFLOW_STATES_ORDER: TournamentWorkflowState[] = [
  "draft",
  "registration_open",
  "registration_closed",
  "checkin",
  "lane_assignment",
  "ready",
  "live",
  "verification",
  "ranking_locked",
  "award",
  "completed",
  "archived",
];

export const WORKFLOW_STATE_METADATA: Record<
  TournamentWorkflowState,
  {
    label: string;
    description: string;
    badgeClass: string;
    allowedActions: string[];
  }
> = {
  draft: {
    label: "Bản nháp (Draft)",
    description: "Khởi tạo giải đấu, chuẩn bị cấu hình, quy chế, ban tổ chức.",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    allowedActions: ["EDIT_CONFIG", "EDIT_RULES", "EDIT_DISTANCES", "EDIT_STAFF", "EDIT_ATHLETES"],
  },
  registration_open: {
    label: "Mở đăng ký (Registration Open)",
    description: "Tiếp nhận đăng ký VĐV, cập nhật thông tin câu lạc bộ, đội thi đấu.",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60",
    allowedActions: ["REGISTER_ATHLETE", "EDIT_ATHLETES", "ADD_CLUB", "ADD_TEAM"],
  },
  registration_closed: {
    label: "Đóng đăng ký (Registration Closed)",
    description: "Khóa cổng đăng ký, danh sách vận động viên được niêm phong.",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60",
    allowedActions: ["VIEW_PARTICIPANTS"],
  },
  checkin: {
    label: "Điểm danh (Check-in)",
    description: "Thực hiện điểm danh vận động viên, đánh giá trạng thái DNS, DNF, Withdraw.",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
    allowedActions: ["CHECKIN_ATHLETE", "CHECKOUT_ATHLETE", "MARK_DNS", "MARK_DNF", "MARK_WITHDRAW"],
  },
  lane_assignment: {
    label: "Phân bệ bắn (Lane Assignment)",
    description: "Bốc thăm xếp bệ bắn, phân bổ trọng tài, chia Flight & Squad thi đấu.",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60",
    allowedActions: ["ASSIGN_LANE", "CHANGE_LANE", "CHANGE_REFEREE", "DIVIDE_FLIGHT", "DIVIDE_SQUAD"],
  },
  ready: {
    label: "Sẵn sàng (Ready)",
    description: "Tổng rà soát hệ thống: bệ bắn, thiết bị, kết nối, sẵn sàng kích hoạt LIVE.",
    badgeClass: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60",
    allowedActions: ["CHECK_SYSTEM", "PREPARE_COMPETITION"],
  },
  live: {
    label: "Thi đấu (Live Competition)",
    description: "Diễn ra lượt bắn trực tiếp. Trọng tài chấm điểm, đồng bộ realtime lên liveboard.",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 animate-pulse",
    allowedActions: ["SCORE_ENTRY", "REFEREE_TERMINAL", "MISSION_CONTROL", "REALTIME_LIVEBOARD", "VIEW_RANKING", "VIEW_STATS"],
  },
  verification: {
    label: "Xác minh điểm (Verification)",
    description: "Ban tổ chức rà soát điểm số, giải quyết khiếu nại, audit nhật ký chấm điểm.",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
    allowedActions: ["AUDIT_SCORES", "EDIT_SCORES", "RESOLVE_PROTESTS"],
  },
  ranking_locked: {
    label: "Khóa bảng xếp hạng (Ranking Locked)",
    description: "Khóa toàn bộ sổ điểm và kết quả. Thành tích được tích lũy vào lịch sử sự nghiệp.",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800/60",
    allowedActions: ["VIEW_STANDINGS", "VIEW_LEDGER"],
  },
  award: {
    label: "Lễ trao giải (Award Ceremony)",
    description: "Công bố giải thưởng, tôn vinh Hall of Fame, tích lũy điểm câu lạc bộ, tỉnh thành.",
    badgeClass: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800/60",
    allowedActions: ["CALCULATE_MEDALS", "HOF_INTEGRATION", "CLUB_POINTS_ACCUMULATE"],
  },
  completed: {
    label: "Hoàn thành (Completed)",
    description: "Giải đấu chính thức khép lại ở trạng thái lưu trữ thông tin tĩnh.",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    allowedActions: ["READ_ONLY_VIEW"],
  },
  archived: {
    label: "Lưu trữ (Archived)",
    description: "Giải đấu được đưa vào lưu trữ lịch sử, phục vụ tra cứu số liệu thống kê.",
    badgeClass: "bg-gray-150 text-gray-600 border-gray-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800",
    allowedActions: ["HISTORY_SEARCH", "CAREER_LOOKUP"],
  },
};

export class TournamentWorkflowEngine {
  /**
   * Check if a specific action is permitted in the current state for a given user role
   */
  static canPerformAction(
    state: TournamentWorkflowState | undefined,
    action: string,
    role: string
  ): boolean {
    const currentState = state || "draft";
    const meta = WORKFLOW_STATE_METADATA[currentState];
    if (!meta) return false;

    // Super Admin & Admin can override most view/edit operations unless the tournament is fully completed/archived
    const isGlobalAdmin = role === "super_admin" || role === "admin" || role === "system_owner";

    // If completed or archived, strictly read-only for everyone except historical queries
    if (currentState === "archived") {
      return action === "HISTORY_SEARCH" || action === "CAREER_LOOKUP" || action === "READ_ONLY_VIEW";
    }
    if (currentState === "completed") {
      return action === "READ_ONLY_VIEW" || action === "HISTORY_SEARCH" || action === "CAREER_LOOKUP";
    }

    // Check specific state allowed actions
    const isActionAllowedInState = meta.allowedActions.includes(action);

    // Some actions are globally allowed for admins in non-finalized states
    if (isGlobalAdmin) {
      if (action === "EDIT_CONFIG" || action === "EDIT_RULES" || action === "EDIT_DISTANCES") {
        return currentState === "draft";
      }
      if (action === "EDIT_SCORES") {
        return currentState === "live" || currentState === "verification";
      }
      return true;
    }

    // Role-specific constraints
    if (role === "referee") {
      // Referees can only score in live mode
      if (action === "SCORE_ENTRY" || action === "REFEREE_TERMINAL") {
        return currentState === "live";
      }
      return action === "READ_ONLY_VIEW" || action === "VIEW_PARTICIPANTS";
    }

    if (role === "organizer") { // BTC
      if (currentState === "draft" && ["EDIT_CONFIG", "EDIT_RULES", "EDIT_DISTANCES", "EDIT_STAFF"].includes(action)) {
        return true;
      }
      if (currentState === "registration_open" && ["REGISTER_ATHLETE", "ADD_CLUB", "ADD_TEAM"].includes(action)) {
        return true;
      }
      if (currentState === "checkin" && ["CHECKIN_ATHLETE", "MARK_DNS", "MARK_WITHDRAW"].includes(action)) {
        return true;
      }
      if (currentState === "lane_assignment" && ["ASSIGN_LANE", "CHANGE_LANE", "CHANGE_REFEREE"].includes(action)) {
        return true;
      }
      if (currentState === "verification" && ["AUDIT_SCORES", "EDIT_SCORES", "RESOLVE_PROTESTS"].includes(action)) {
        return true;
      }
      return isActionAllowedInState;
    }

    // Athletes/Viewers are strictly read-only
    return action === "READ_ONLY_VIEW" || (currentState === "registration_open" && action === "REGISTER_ATHLETE" && role === "athlete");
  }

  /**
   * Get valid transitions from the current state
   */
  static getNextTransitions(
    currentState: TournamentWorkflowState | undefined,
    role: string
  ): { target: TournamentWorkflowState; label: string; desc: string }[] {
    const current = currentState || "draft";
    const isBTC = role === "super_admin" || role === "admin" || role === "system_owner" || role === "organizer";

    if (!isBTC) return [];

    const transitions: { target: TournamentWorkflowState; label: string; desc: string }[] = [];

    switch (current) {
      case "draft":
        transitions.push({
          target: "registration_open",
          label: "Mở đăng ký (Open Registration)",
          desc: "Bắt đầu tiếp nhận đăng ký của các VĐV và CLB.",
        });
        break;
      case "registration_open":
        transitions.push({
          target: "registration_closed",
          label: "Đóng đăng ký (Close Registration)",
          desc: "Đóng cổng đăng ký, niêm phong danh sách thi đấu.",
        });
        break;
      case "registration_closed":
        transitions.push({
          target: "checkin",
          label: "Mở điểm danh (Start Check-in)",
          desc: "Cho phép điểm danh VĐV, ghi nhận các trường hợp DNS/Withdrawn.",
        });
        // BTC can re-open registration
        transitions.push({
          target: "registration_open",
          label: "Mở lại đăng ký (Re-open Registration)",
          desc: "Tiếp tục cho phép bổ sung, chỉnh sửa hồ sơ VĐV.",
        });
        break;
      case "checkin":
        transitions.push({
          target: "lane_assignment",
          label: "Phân bệ bắn (Start Lane Assignment)",
          desc: "Khởi động sơ đồ phân làn, gán trọng tài bệ bắn.",
        });
        break;
      case "lane_assignment":
        transitions.push({
          target: "ready",
          label: "Xác nhận Sẵn sàng (Ready Check)",
          desc: "Hoàn tất phân bệ, chuyển sang kiểm tra tổng thể hệ thống.",
        });
        break;
      case "ready":
        transitions.push({
          target: "live",
          label: "Bắt đầu thi đấu (Go Live)",
          desc: "Kích hoạt chế độ thi đấu trực tiếp, mở khóa bệ trọng tài chấm điểm.",
        });
        break;
      case "live":
        transitions.push({
          target: "verification",
          label: "Kết thúc & Xác minh (Stop scoring & Verify)",
          desc: "Dừng chấm điểm, mở giao diện rà soát kết quả, khiếu nại.",
        });
        break;
      case "verification":
        transitions.push({
          target: "ranking_locked",
          label: "Khóa bảng xếp hạng (Lock Ranking)",
          desc: "Khóa vĩnh viễn kết quả lượt bắn và bảng điểm.",
        });
        break;
      case "ranking_locked":
        transitions.push({
          target: "award",
          label: "Tổ chức trao giải (Start Award Ceremony)",
          desc: "Tính điểm tích lũy sự nghiệp, Hall of Fame, vinh danh giải thưởng.",
        });
        break;
      case "award":
        transitions.push({
          target: "completed",
          label: "Hoàn thành giải (Complete Tournament)",
          desc: "Chính thức hoàn thành, đóng toàn bộ quy chế.",
        });
        break;
      case "completed":
        transitions.push({
          target: "archived",
          label: "Lưu trữ giải (Archive)",
          desc: "Lưu trữ lịch sử, ẩn khỏi danh sách giải đấu kích hoạt.",
        });
        break;
      case "archived":
        // No transitions from archived
        break;
    }

    return transitions;
  }

  /**
   * Check if a transition is legal and return error message if not
   */
  static validateTransition(
    currentState: TournamentWorkflowState | undefined,
    targetState: TournamentWorkflowState,
    role: string,
    tour: Partial<TournamentV3>
  ): string | null {
    const current = currentState || "draft";
    const isGlobalAdmin = role === "super_admin" || role === "admin" || role === "system_owner";
    const isBTC = isGlobalAdmin || role === "organizer";

    if (!isBTC) {
      return "Chỉ Ban tổ chức hoặc Admin hệ thống mới có quyền chuyển đổi trạng thái giải đấu.";
    }

    // Check-in constraints
    if (targetState === "lane_assignment") {
      const athletes = tour.athletes || [];
      const checkedInCount = athletes.filter(a => a.status === "checked_in").length;
      if (checkedInCount === 0 && !isGlobalAdmin) {
        return "Yêu cầu điểm danh ít nhất 1 vận động viên trước khi chuyển sang bước phân bệ bắn.";
      }
    }

    // Ready constraints
    if (targetState === "ready") {
      if (!tour.headReferee && !isGlobalAdmin) {
        return "Vui lòng chỉ định Trọng tài chính (Head Referee) trước khi xác nhận Sẵn sàng.";
      }
    }

    // Verify ordering is correct
    const currentIndex = WORKFLOW_STATES_ORDER.indexOf(current);
    const targetIndex = WORKFLOW_STATES_ORDER.indexOf(targetState);

    // Special transition: from registration_closed back to registration_open is allowed
    if (current === "registration_closed" && targetState === "registration_open") {
      return null;
    }

    if (targetIndex < currentIndex) {
      return `Không thể đi ngược thứ tự quy trình (từ ${WORKFLOW_STATE_METADATA[current].label} về ${WORKFLOW_STATE_METADATA[targetState].label}).`;
    }

    if (targetIndex > currentIndex + 1) {
      return `Không được bỏ qua bước. Trạng thái tiếp theo hợp lệ phải là: ${
        WORKFLOW_STATE_METADATA[WORKFLOW_STATES_ORDER[currentIndex + 1]].label
      }.`;
    }

    return null;
  }

  /**
   * Helper to map legacy status to modern workflowState
   */
  static mapStatusToWorkflowState(status?: string): TournamentWorkflowState {
    if (!status) return "draft";
    switch (status) {
      case "draft":
        return "draft";
      case "registration":
        return "registration_open";
      case "ready":
        return "ready";
      case "live":
        return "live";
      case "completed":
        return "completed";
      case "archived":
        return "archived";
      default:
        return "draft";
    }
  }

  /**
   * Helper to map modern workflowState to legacy status
   */
  static mapWorkflowStateToStatus(
    wfState: TournamentWorkflowState
  ): "draft" | "registration" | "ready" | "live" | "completed" | "archived" {
    switch (wfState) {
      case "draft":
        return "draft";
      case "registration_open":
      case "registration_closed":
        return "registration";
      case "checkin":
      case "lane_assignment":
      case "ready":
        return "ready";
      case "live":
        return "live";
      case "verification":
      case "ranking_locked":
      case "award":
      case "completed":
        return "completed";
      case "archived":
        return "archived";
      default:
        return "draft";
    }
  }
}

export class WorkflowEngine extends TournamentWorkflowEngine {}
