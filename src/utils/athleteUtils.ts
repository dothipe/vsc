/**
 * Utility functions for cleaning up and formatting athlete identifiers (SBD, BIB, VSC Number).
 * Prevents long, unreadable generated database IDs (e.g., vdv-1721183375836) from cluttering the UI.
 */

/**
 * Cleans and formats the VSC ID number for an athlete.
 * If a valid, short vscNumber exists, returns it.
 * Otherwise, falls back to a shortened, clean VSC-XXXX identifier based on the athlete's ID.
 */
export function getCleanVscNumber(vscNumber: string | undefined, athleteId: string | undefined): string {
  const vsc = (vscNumber || "").trim();
  const id = (athleteId || "").trim();

  // If we have a custom, clean vscNumber that is not a long generated sequence/timestamp
  if (vsc && !vsc.includes("vdv-") && !vsc.includes("ath-") && !/^\d{12,}/.test(vsc) && vsc.length < 15) {
    return vsc;
  }

  // If we don't have a clean vscNumber, let's format one from the athlete's ID
  const cleanId = id.replace(/^(vdv-|ath-)/, "");
  if (cleanId.length > 5) {
    // If it's a long timestamp, take the last 4 characters for a clean, short unique suffix
    const suffix = cleanId.substring(cleanId.length - 4).toUpperCase();
    return `VSC-${suffix}`;
  }

  return `VSC-${cleanId.toUpperCase() || "TEMP"}`;
}

/**
 * Cleans and formats the BIB (Số Báo Danh / SBD) number for an athlete.
 * If a valid, short bibNumber exists, returns it.
 * Otherwise, falls back to a shortened, clean BIB-XXX identifier based on the athlete's ID.
 */
export function getCleanBibNumber(bibNumber: string | undefined, athleteId: string | undefined): string {
  const bib = (bibNumber || "").trim();
  const id = (athleteId || "").trim();

  // A BIB is valid if it exists, does NOT start with VSC or contain vdv/ath prefixes, is not a long number sequence, and is under 15 characters
  if (bib && 
      !bib.toUpperCase().startsWith("VSC") && 
      !bib.includes("vdv-") && 
      !bib.includes("ath-") && 
      !/^\d{12,}/.test(bib) && 
      bib.length < 15
  ) {
    return bib;
  }

  const cleanId = id.replace(/^(vdv-|ath-)/, "");
  if (cleanId.length > 5) {
    // Take the last 4 characters for a short, readable BIB
    const suffix = cleanId.substring(cleanId.length - 4).toUpperCase();
    return `BIB-${suffix}`;
  }

  return `BIB-${cleanId.toUpperCase() || "TEMP"}`;
}

/**
 * Helper to get a unified display string for an athlete's main identifier.
 * Priority: Clean VSC Number, then Clean BIB Number.
 */
export function getAthleteDisplayId(athlete: any): string {
  if (!athlete) return "";
  const vsc = getCleanVscNumber(athlete.vscNumber || athlete.idCard, athlete.id || athlete.participantId);
  return vsc;
}

/**
 * Returns a clean string representing the athlete's BIB/SBD.
 */
export function getAthleteDisplayBib(athlete: any): string {
  if (!athlete) return "";
  return getCleanBibNumber(athlete.bibNumber, athlete.id || athlete.participantId);
}

/**
 * Checks if an athlete team string corresponds to "no team" / free athlete.
 * Athletes without a team (or labeled Tự Do, Free, Cá Nhân, etc.) should be excluded
 * from team rankings (Bảng xếp hạng đồng đội).
 */
export function isNoTeam(teamStr?: string | null): boolean {
  if (!teamStr) return true;
  const s = teamStr.trim().toLowerCase();
  if (s === "") return true;
  if (
    s === "tự do" ||
    s === "tu do" ||
    s === "free" ||
    s === "cá nhân" ||
    s === "ca nhan" ||
    s === "không đội" ||
    s === "khong doi" ||
    s === "vđv tự do (không đội)" ||
    s === "vđv tự do" ||
    s === "vdv tu do" ||
    s === "không" ||
    s === "none" ||
    s === "no_team" ||
    s === "không có" ||
    s === "khong co"
  ) {
    return true;
  }
  return false;
}

/**
 * Checks if an athlete is eliminated or withdrawn from the tournament or in a specific stage context.
 */
export function isAthleteEliminated(
  athlete: any,
  currentStageId?: string,
  stages?: any[]
): boolean {
  if (!athlete) return true;

  const statusLower = (athlete.status || "").toString().toLowerCase();
  if (
    statusLower === "bỏ thi" ||
    statusLower === "dns" ||
    statusLower === "withdrawn"
  ) {
    return true;
  }

  const qStatus = (athlete.qualificationStatus || "").toString();
  if (
    qStatus === "eliminated" ||
    qStatus === "not_qualified" ||
    statusLower === "eliminated"
  ) {
    return true;
  }

  if (currentStageId && Array.isArray(stages) && stages.length > 0) {
    const targetStageIndex = stages.findIndex((s) => s.id === currentStageId);
    if (targetStageIndex >= 0) {
      if (qStatus.startsWith("eliminated_")) {
        const refDistId = qStatus.replace("eliminated_", "");
        const refStageIndex = stages.findIndex((s) => s.id === refDistId);
        if (refStageIndex >= 0) {
          return refStageIndex <= targetStageIndex;
        }
        
        // Fallback by name/distance string
        const refStageIndexByName = stages.findIndex((s) => s.distance === refDistId || s.name === refDistId || (s.id && s.id.includes(refDistId)));
        if (refStageIndexByName >= 0) {
          return refStageIndexByName <= targetStageIndex;
        }

        return false;
      }
      
      if (statusLower === "bị loại") {
        // If they are marked "bị loại", check if they have qualification status pointing specifically to another stage
        if (qStatus && qStatus !== `eliminated_${currentStageId}`) {
          return true;
        }
        return false;
      }
    } else {
      // If currentStageId is not found in stages but status is "bị loại", treat as eliminated
      if (statusLower === "bị loại") {
        return true;
      }
    }
  } else if (statusLower === "bị loại") {
    return true;
  }

  return false;
}

/**
 * Checks if an athlete was eliminated specifically in any stage PRIOR to currentStageId.
 */
export function isAthleteEliminatedInPrevStage(
  athlete: any,
  currentStageId: string,
  stages: any[]
): boolean {
  if (!athlete) return true;

  const statusLower = (athlete.status || "").toString().toLowerCase();
  if (
    statusLower === "bỏ thi" ||
    statusLower === "dns" ||
    statusLower === "withdrawn"
  ) {
    return true;
  }

  const qStatus = (athlete.qualificationStatus || "").toString();

  if (!stages || stages.length === 0) {
    return false;
  }

  const cleanCurrentStageId = (currentStageId || "")
    .replace("-solo", "")
    .replace("-resolo", "")
    .replace("-main", "");

  const targetStageIndex = stages.findIndex((s) => {
    if (!s) return false;
    const sId = String(s.id || "");
    const cleanSId = sId.replace("-solo", "").replace("-resolo", "").replace("-main", "");
    return (
      sId === currentStageId ||
      cleanSId === cleanCurrentStageId ||
      String(s.distance) === currentStageId ||
      String(s.name) === currentStageId ||
      String(s.distance) === cleanCurrentStageId
    );
  });

  if (targetStageIndex === 0) {
    return false; // Cannot be eliminated prior to the first stage
  }

  let refDistId = "";
  if (qStatus.startsWith("eliminated_")) {
    refDistId = qStatus.replace("eliminated_", "");
  }

  // If elimination explicitly targets currentStageId or cleanCurrentStageId,
  // then they were eliminated IN the current stage, NOT in a previous stage!
  if (refDistId) {
    const cleanRefDistId = refDistId.replace("-solo", "").replace("-resolo", "").replace("-main", "");
    if (refDistId === currentStageId || cleanRefDistId === cleanCurrentStageId) {
      return false; // Eliminated in CURRENT stage!
    }

    const refStageIndex = stages.findIndex((s) => {
      if (!s || !s.id) return false;
      const cleanSId = String(s.id).replace("-solo", "").replace("-resolo", "").replace("-main", "");
      return s.id === refDistId || cleanSId === cleanRefDistId || s.distance === refDistId || s.name === refDistId;
    });

    if (refStageIndex >= 0) {
      if (targetStageIndex >= 0) {
        return refStageIndex < targetStageIndex; // Strictly before current stage
      }
      return true;
    }
  }

  // Check if qualificationStatus explicitly matches any PREVIOUS stage
  if (targetStageIndex > 0) {
    const previousStages = stages.slice(0, targetStageIndex);
    const isEliminatedInPrev = previousStages.some((stage) => {
      if (!stage || !stage.id) return false;
      const cleanStageId = String(stage.id).replace("-solo", "").replace("-resolo", "").replace("-main", "");
      return (
        qStatus === `eliminated_${stage.id}` ||
        qStatus === `eliminated_${cleanStageId}`
      );
    });
    if (isEliminatedInPrev) return true;
  }

  const isMarkedEliminated = statusLower === "bị loại" || statusLower === "eliminated" || qStatus === "eliminated" || qStatus === "not_qualified";

  if (isMarkedEliminated) {
    // If athlete has scores or shot data in the current stage, they are competing/evaluated in current stage!
    const currentDistScores = athlete.scores?.[currentStageId] || athlete.scores?.[cleanCurrentStageId];
    if (
      currentDistScores &&
      (Array.isArray(currentDistScores) ? currentDistScores.some((v: any) => v !== null && v !== undefined) : Boolean(currentDistScores.roundScore || currentDistScores.roundHits))
    ) {
      return false;
    }

    // If they have no refDistId and no current scores, assume eliminated earlier or manually
    if (!refDistId) {
      return true;
    }
  }

  return false;
}

export function cleanStageName(name: string): string {
  if (!name) return "Sơ đồ chưa đặt tên";
  let cleaned = name
    .replace(/undefined/gi, "")
    .replace(/\(\s*\)/g, "") // remove empty parentheses
    .replace(/:\s*$/g, "") // remove trailing colon
    .replace(/\s+/g, " ") // normalize whitespace
    .trim();
  
  if (!cleaned || cleaned === ":" || cleaned === "(Đồng Đội)") {
    return "Sơ đồ chưa đặt tên";
  }
  return cleaned;
}
