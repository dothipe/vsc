import React, { useState, useEffect } from "react";
import { DistanceConfig, RuleTemplate } from "../types";
import { 
  Plus, Edit2, Trash2, Copy, Star, Settings, ShieldAlert, Check, 
  HelpCircle, ChevronDown, Award, Sparkles, BookOpen, Save, ListFilter
} from "lucide-react";
import { ruleTemplateRepository } from "../repositories/ruleTemplate.repository";
import { auth } from "../firebase";

export interface RuleEngineProps {
  // Individual fields
  distances: DistanceConfig[];
  setDistances: (distances: DistanceConfig[]) => void;
  shotsCount: number;
  setShotsCount: (count: number) => void;
  directMaxShots: number;
  setDirectMaxShots: (max: number) => void;
  directMaxPoints: number | undefined;
  setDirectMaxPoints: (max: number | undefined) => void;

  // Team fields
  teamDistances: DistanceConfig[];
  setTeamDistances: (distances: DistanceConfig[]) => void;
  teamShotsCount: number;
  setTeamShotsCount: (count: number) => void;
  teamDirectMaxShots: number;
  setTeamDirectMaxShots: (max: number) => void;
  teamDirectMaxPoints: number | undefined;
  setTeamDirectMaxPoints: (max: number | undefined) => void;

  // Layout toggles based on Tournament Format
  showIndividualConfig?: boolean;
  showTeamConfig?: boolean;
}

// 4 Pre-defined default templates requested
const STATIC_DEFAULT_TEMPLATES: RuleTemplate[] = [
  {
    id: "temp-vsc-national",
    name: "VSC National",
    distances: [
      { id: "vsc-ind-1", distance: "10 Met", multiplier: 10, isCumulative: true },
      { id: "vsc-ind-2", distance: "15 Met", multiplier: 12, isCumulative: true },
      { id: "vsc-ind-3", distance: "20 Met", multiplier: 15, isCumulative: true, isElimination: true, eliminationType: "count", eliminationValue: 16, isSolo: true, isResolo: true }
    ],
    teamDistances: [
      { id: "vsc-tm-1", distance: "10 Met (Đồng Đội)", multiplier: 10, isCumulative: true },
      { id: "vsc-tm-2", distance: "15 Met (Đồng Đội)", multiplier: 12, isCumulative: true, isElimination: true, eliminationType: "count", eliminationValue: 8, isSolo: true, isResolo: true }
    ],
    shotsCount: 1, // Direct scoring
    teamShotsCount: 1,
    directMaxShots: 10,
    teamDirectMaxShots: 10,
    directMaxPoints: undefined,
    teamDirectMaxPoints: undefined,
    isDefault: true
  },
  {
    id: "temp-vsc-online",
    name: "VSC Online",
    distances: [
      { id: "vsc-on-ind-1", distance: "10 Met", multiplier: 10, isCumulative: true },
      { id: "vsc-on-ind-2", distance: "15 Met", multiplier: 12, isCumulative: true, isElimination: true, eliminationType: "percent", eliminationValue: 30, isSolo: true, isResolo: true }
    ],
    teamDistances: [
      { id: "vsc-on-tm-1", distance: "10 Met (Đồng Đội)", multiplier: 10, isCumulative: true, isElimination: true, eliminationType: "percent", eliminationValue: 30, isSolo: true, isResolo: true }
    ],
    shotsCount: 5, // Binary scoring
    teamShotsCount: 5,
    directMaxShots: 10,
    teamDirectMaxShots: 10,
    directMaxPoints: undefined,
    teamDirectMaxPoints: undefined,
    isDefault: false
  },
  {
    id: "temp-club-tournament",
    name: "Club Tournament",
    distances: [
      { id: "club-ind-1", distance: "10 Met", multiplier: 10, isCumulative: false },
      { id: "club-ind-2", distance: "12 Met", multiplier: 10, isCumulative: true, isElimination: true, eliminationType: "percent", eliminationValue: 50, isSolo: true, isResolo: false }
    ],
    teamDistances: [
      { id: "club-tm-1", distance: "10 Met (Đồng Đội)", multiplier: 10, isCumulative: true, isElimination: true, eliminationType: "count", eliminationValue: 4, isSolo: true }
    ],
    shotsCount: 3,
    teamShotsCount: 3,
    directMaxShots: 10,
    teamDirectMaxShots: 10,
    directMaxPoints: undefined,
    teamDirectMaxPoints: undefined,
    isDefault: false
  },
  {
    id: "temp-friendly-tournament",
    name: "Friendly Tournament",
    distances: [
      { id: "fr-ind-1", distance: "10 Met", multiplier: 10 }
    ],
    teamDistances: [
      { id: "fr-tm-1", distance: "10 Met (Đồng Đội)", multiplier: 10 }
    ],
    shotsCount: 5,
    teamShotsCount: 5,
    directMaxShots: 10,
    teamDirectMaxShots: 10,
    directMaxPoints: undefined,
    teamDirectMaxPoints: undefined,
    isDefault: false
  }
];

export const RuleEngine: React.FC<RuleEngineProps> = ({
  distances,
  setDistances,
  shotsCount,
  setShotsCount,
  directMaxShots,
  setDirectMaxShots,
  directMaxPoints,
  setDirectMaxPoints,

  teamDistances,
  setTeamDistances,
  teamShotsCount,
  setTeamShotsCount,
  teamDirectMaxShots,
  setTeamDirectMaxShots,
  teamDirectMaxPoints,
  setTeamDirectMaxPoints,

  showIndividualConfig = true,
  showTeamConfig = false
}) => {
  // State for loaded templates
  const [dbTemplates, setDbTemplates] = useState<RuleTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateName, setTemplateName] = useState<string>("");
  const [isSavingTemplate, setIsSavingTemplate] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  
  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmDistance, setDeleteConfirmDistance] = useState<{ id: string; type: "individual" | "team" } | null>(null);

  // States for adding / editing distances
  const [indDistanceStr, setIndDistanceStr] = useState("");
  const [indMultiplierVal, setIndMultiplierVal] = useState(10);
  const [indIsCumulative, setIndIsCumulative] = useState(false);
  const [indIsElimination, setIndIsElimination] = useState(false);
  const [indIsMaxRoundScore, setIndIsMaxRoundScore] = useState(false);
  const [indEliminationType, setIndEliminationType] = useState<"count" | "percent">("percent");
  const [indEliminationValue, setIndEliminationValue] = useState(50);
  const [indIsSolo, setIndIsSolo] = useState(false);
  const [indIsResolo, setIndIsResolo] = useState(false);

  const [tmDistanceStr, setTmDistanceStr] = useState("");
  const [tmMultiplierVal, setTmMultiplierVal] = useState(10);
  const [tmIsCumulative, setTmIsCumulative] = useState(false);
  const [tmIsElimination, setTmIsElimination] = useState(false);
  const [tmIsMaxRoundScore, setTmIsMaxRoundScore] = useState(false);
  const [tmEliminationType, setTmEliminationType] = useState<"count" | "percent">("percent");
  const [tmEliminationValue, setTmEliminationValue] = useState(50);
  const [tmIsSolo, setTmIsSolo] = useState(false);
  const [tmIsResolo, setTmIsResolo] = useState(false);

  // Editing state
  const [editingDistanceId, setEditingDistanceId] = useState<string | null>(null);
  const [editingDistanceType, setEditingDistanceType] = useState<"individual" | "team" | null>(null);
  const [editStr, setEditStr] = useState("");
  const [editMultiplier, setEditMultiplier] = useState(10);
  const [editIsCumulative, setEditIsCumulative] = useState(false);
  const [editIsElimination, setEditIsElimination] = useState(false);
  const [editIsMaxRoundScore, setEditIsMaxRoundScore] = useState(false);
  const [editEliminationType, setEditEliminationType] = useState<"count" | "percent">("percent");
  const [editEliminationValue, setEditEliminationValue] = useState(50);
  const [editIsSolo, setEditIsSolo] = useState(false);
  const [editIsResolo, setEditIsResolo] = useState(false);
  
  const [indShotsCount, setIndShotsCount] = useState<number>(10);
  const [tmShotsCount, setTmShotsCount] = useState<number>(10);
  const [editShotsCount, setEditShotsCount] = useState<number>(10);

  const [validationError, setValidationError] = useState<string | null>(null);

  // Merge static defaults with loaded Firestore templates
  const allTemplates = [...STATIC_DEFAULT_TEMPLATES, ...dbTemplates];

  // Fetch custom templates from Firestore
  useEffect(() => {
    const unsub = ruleTemplateRepository.subscribeList(
      [],
      (templates) => {
        setDbTemplates(templates);
        // If there's a default in DB, or if we haven't selected anything, see if we should auto-apply
        const def = templates.find(t => t.isDefault) || STATIC_DEFAULT_TEMPLATES.find(t => t.isDefault);
        if (def && !selectedTemplateId) {
          // No auto-overwrite of already set states, but if state is empty, apply it
          if (distances.length === 0 && teamDistances.length === 0) {
            applyTemplate(def);
          }
        }
      },
      (err) => {
        console.error("Lỗi tải Rule Templates từ Firestore: ", err);
      }
    );
    return unsub;
  }, []);

  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setFeedbackMsg({ text, type });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4000);
  };

  // Auto-apply template configurations
  const applyTemplate = (tpl: RuleTemplate) => {
    setSelectedTemplateId(tpl.id);
    setDistances(tpl.distances || []);
    setTeamDistances(tpl.teamDistances || []);
    setShotsCount(tpl.shotsCount);
    setTeamShotsCount(tpl.teamShotsCount);
    setDirectMaxShots(tpl.directMaxShots || 10);
    setTeamDirectMaxShots(tpl.teamDirectMaxShots || 10);
    setDirectMaxPoints(tpl.directMaxPoints);
    setTeamDirectMaxPoints(tpl.teamDirectMaxPoints);
    showFeedback(`Đã áp dụng mẫu luật "${tpl.name}" thành công!`);
  };

  const handleCreateTemplate = async () => {
    if (!templateName.trim()) {
      showFeedback("Vui lòng nhập tên cho mẫu luật mới", "error");
      return;
    }

    setIsSavingTemplate(true);
    try {
      const currentUser = auth.currentUser;
      const tplId = `tpl-${Date.now()}`;
      const newTpl: RuleTemplate = {
        id: tplId,
        name: templateName.trim(),
        distances,
        teamDistances,
        shotsCount,
        teamShotsCount,
        directMaxShots,
        teamDirectMaxShots,
        directMaxPoints,
        teamDirectMaxPoints,
        isDefault: false
      };

      await ruleTemplateRepository.create(tplId, newTpl, currentUser?.uid, "admin");
      setTemplateName("");
      setSelectedTemplateId(tplId);
      showFeedback(`Đã lưu mẫu luật "${newTpl.name}" lên Cloud!`);
    } catch (e: any) {
      showFeedback(`Không thể lưu mẫu luật: ${e.message}`, "error");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedTemplateId) return;
    if (selectedTemplateId.startsWith("temp-")) {
      showFeedback("Không thể sửa mẫu luật mặc định của hệ thống. Vui lòng lưu thành mẫu mới!", "error");
      return;
    }

    setIsSavingTemplate(true);
    try {
      const currentUser = auth.currentUser;
      const updates: Partial<RuleTemplate> = {
        distances,
        teamDistances,
        shotsCount,
        teamShotsCount,
        directMaxShots,
        teamDirectMaxShots,
        directMaxPoints,
        teamDirectMaxPoints
      };

      await ruleTemplateRepository.update(selectedTemplateId, updates, currentUser?.uid, "admin");
      showFeedback("Đã cập nhật cấu hình mẫu luật hiện tại!");
    } catch (e: any) {
      showFeedback(`Lỗi cập nhật: ${e.message}`, "error");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: string, name: string, bypassConfirm = false) => {
    if (id.startsWith("temp-")) {
      showFeedback("Không thể xóa mẫu mặc định hệ thống", "error");
      return;
    }

    if (!bypassConfirm) {
      setDeleteConfirmTemplate({ id, name });
      return;
    }

    try {
      const currentUser = auth.currentUser;
      await ruleTemplateRepository.delete(id, currentUser?.uid, "admin");
      if (selectedTemplateId === id) setSelectedTemplateId("");
      showFeedback(`Đã xóa mẫu luật "${name}"`);
    } catch (e: any) {
      showFeedback(`Không thể xóa: ${e.message}`, "error");
    }
  };

  const handleDuplicateTemplate = async (tpl: RuleTemplate) => {
    try {
      const currentUser = auth.currentUser;
      const dupId = `tpl-dup-${Date.now()}`;
      const payload: RuleTemplate = {
        ...tpl,
        id: dupId,
        name: `${tpl.name} (Bản sao)`,
        isDefault: false
      };

      await ruleTemplateRepository.create(dupId, payload, currentUser?.uid, "admin");
      setSelectedTemplateId(dupId);
      showFeedback(`Đã nhân bản mẫu luật thành "${payload.name}"!`);
    } catch (e: any) {
      showFeedback(`Không thể nhân bản: ${e.message}`, "error");
    }
  };

  const handleSetDefaultTemplate = async (id: string) => {
    try {
      const currentUser = auth.currentUser;
      
      // Reset all others in state list first to be safe
      for (const t of dbTemplates) {
        if (t.id === id && !t.isDefault) {
          await ruleTemplateRepository.update(t.id, { isDefault: true }, currentUser?.uid, "admin");
        } else if (t.id !== id && t.isDefault) {
          await ruleTemplateRepository.update(t.id, { isDefault: false }, currentUser?.uid, "admin");
        }
      }
      
      showFeedback("Đã đặt làm cấu hình luật mặc định!");
    } catch (e: any) {
      showFeedback(`Không thể đặt mặc định: ${e.message}`, "error");
    }
  };

  // Add Distance logic
  const handleAddIndDistance = () => {
    if (!indDistanceStr.trim()) {
      setValidationError("Vui lòng nhập tên cự ly (ví dụ: '10 Met', '15m')");
      return;
    }
    setValidationError(null);

    const newDist: DistanceConfig = {
      id: `dist-ind-${Date.now()}`,
      distance: indDistanceStr.trim(),
      multiplier: indMultiplierVal,
      isCumulative: indIsCumulative,
      isElimination: indIsElimination,
      isMaxRoundScore: indIsMaxRoundScore,
      eliminationType: indIsElimination ? indEliminationType : undefined,
      eliminationValue: indIsElimination ? indEliminationValue : undefined,
      isSolo: indIsSolo,
      isResolo: indIsResolo,
      shotsCount: indShotsCount
    };

    setDistances([...distances, newDist]);
    // Reset add state
    setIndDistanceStr("");
    setIndIsCumulative(false);
    setIndIsElimination(false);
    setIndIsMaxRoundScore(false);
    setIndIsSolo(false);
    setIndIsResolo(false);
    setIndShotsCount(10);
    showFeedback("Đã thêm cự ly cá nhân mới!");
  };

  const handleAddTmDistance = () => {
    if (!tmDistanceStr.trim()) {
      setValidationError("Vui lòng nhập tên cự ly đồng đội (ví dụ: '15m (Đồng Đội)')");
      return;
    }
    setValidationError(null);

    const newDist: DistanceConfig = {
      id: `dist-tm-${Date.now()}`,
      distance: tmDistanceStr.trim(),
      multiplier: tmMultiplierVal,
      isCumulative: tmIsCumulative,
      isElimination: tmIsElimination,
      isMaxRoundScore: tmIsMaxRoundScore,
      eliminationType: tmIsElimination ? tmEliminationType : undefined,
      eliminationValue: tmIsElimination ? tmEliminationValue : undefined,
      isSolo: tmIsSolo,
      isResolo: tmIsResolo,
      shotsCount: tmShotsCount
    };

    setTeamDistances([...teamDistances, newDist]);
    // Reset add state
    setTmDistanceStr("");
    setTmIsCumulative(false);
    setTmIsElimination(false);
    setTmIsMaxRoundScore(false);
    setTmIsSolo(false);
    setTmIsResolo(false);
    setTmShotsCount(10);
    showFeedback("Đã thêm cự ly đồng đội mới!");
  };

  const startEditing = (dist: DistanceConfig, type: "individual" | "team") => {
    setEditingDistanceId(dist.id);
    setEditingDistanceType(type);
    setEditStr(dist.distance);
    setEditMultiplier(dist.multiplier);
    setEditIsCumulative(!!dist.isCumulative);
    setEditIsElimination(!!dist.isElimination);
    setEditIsMaxRoundScore(!!dist.isMaxRoundScore);
    setEditEliminationType(dist.eliminationType || "percent");
    setEditEliminationValue(dist.eliminationValue || 50);
    setEditIsSolo(!!dist.isSolo);
    setEditIsResolo(!!dist.isResolo);
    setEditShotsCount(dist.shotsCount || (type === "team" ? teamShotsCount : shotsCount) || 10);
  };

  const handleSaveEdit = () => {
    if (!editStr.trim()) return;

    if (editingDistanceType === "individual") {
      const updated = distances.map((d) => {
        if (d.id === editingDistanceId) {
          return {
            ...d,
            distance: editStr.trim(),
            multiplier: editMultiplier,
            isCumulative: editIsCumulative,
            isElimination: editIsElimination,
            isMaxRoundScore: editIsMaxRoundScore,
            eliminationType: editIsElimination ? editEliminationType : undefined,
            eliminationValue: editIsElimination ? editEliminationValue : undefined,
            isSolo: editIsSolo,
            isResolo: editIsResolo,
            shotsCount: editShotsCount
          };
        }
        return d;
      });
      setDistances(updated);
    } else {
      const updated = teamDistances.map((d) => {
        if (d.id === editingDistanceId) {
          return {
            ...d,
            distance: editStr.trim(),
            multiplier: editMultiplier,
            isCumulative: editIsCumulative,
            isElimination: editIsElimination,
            isMaxRoundScore: editIsMaxRoundScore,
            eliminationType: editIsElimination ? editEliminationType : undefined,
            eliminationValue: editIsElimination ? editEliminationValue : undefined,
            isSolo: editIsSolo,
            isResolo: editIsResolo,
            shotsCount: editShotsCount
          };
        }
        return d;
      });
      setTeamDistances(updated);
    }

    setEditingDistanceId(null);
    setEditingDistanceType(null);
    showFeedback("Đã lưu thay đổi cự ly!");
  };

  const handleDeleteDistance = (id: string, type: "individual" | "team", bypassConfirm = false) => {
    if (type === "individual") {
      if (distances.length <= 1) {
        showFeedback("Giải đấu phải có ít nhất một cự ly cá nhân!", "error");
        return;
      }
    } else {
      if (teamDistances.length <= 1) {
        showFeedback("Giải đấu phải có ít nhất một cự ly đồng đội!", "error");
        return;
      }
    }

    if (!bypassConfirm) {
      setDeleteConfirmDistance({ id, type });
      return;
    }

    if (type === "individual") {
      setDistances(distances.filter(d => d.id !== id));
    } else {
      setTeamDistances(teamDistances.filter(d => d.id !== id));
    }
    showFeedback("Đã xóa cự ly");
  };

  return (
    <div className="space-y-6">
      {/* 1. Reusable Rule Templates Management */}
      <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-900/40 dark:to-indigo-950/10 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              Mẫu Thiết Lập Luật Giải Đấu (Rule Templates)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Chọn mẫu luật có sẵn để cấu hình nhanh toàn bộ cự ly, số lượt, điểm số và luật loại trực tiếp.
            </p>
          </div>
        </div>

        {feedbackMsg && (
          <div className={`p-3 rounded-xl border text-xs font-bold animate-fadeIn flex items-center gap-2 ${
            feedbackMsg.type === "success" 
              ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400"
              : "bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-400"
          }`}>
            <Check className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Template dropdown / selection */}
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Chọn mẫu luật áp dụng:</label>
            <div className="flex flex-wrap gap-2">
              {allTemplates.map((tpl) => (
                <div 
                  key={tpl.id}
                  className={`group relative flex items-center justify-between gap-1.5 pl-3.5 pr-2 py-1.5 border rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    selectedTemplateId === tpl.id
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                      : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400"
                  }`}
                  onClick={() => applyTemplate(tpl)}
                >
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 shrink-0 text-indigo-400 group-hover:text-indigo-500" />
                    <span>{tpl.name}</span>
                    {tpl.isDefault && (
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateTemplate(tpl);
                      }}
                      className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                      title="Nhân bản mẫu này"
                    >
                      <Copy className="w-3 h-3 text-slate-400 group-hover:text-indigo-200" />
                    </button>
                    {!tpl.id.startsWith("temp-") && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefaultTemplate(tpl.id);
                          }}
                          className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                          title="Đặt mẫu này làm mặc định"
                        >
                          <Star className="w-3 h-3 text-amber-500" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(tpl.id, tpl.name);
                          }}
                          className="p-1 hover:bg-rose-500/20 text-rose-500 rounded"
                          title="Xóa mẫu"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save / Update current rules as template */}
          <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col gap-3 justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 block tracking-widest">Lưu cấu hình luật đang sửa:</span>
              <input 
                type="text" 
                placeholder="Tên mẫu luật mới..."
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-800 dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isSavingTemplate}
                onClick={handleCreateTemplate}
                className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" /> Lưu thành Mẫu Mới
              </button>
              {selectedTemplateId && !selectedTemplateId.startsWith("temp-") && (
                <button
                  type="button"
                  disabled={isSavingTemplate}
                  onClick={handleUpdateTemplate}
                  className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition-all"
                  title="Cập nhật mẫu đang chọn"
                >
                  Ghi đè
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {validationError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold animate-fadeIn">
          ⚠️ {validationError}
        </div>
      )}

      {/* Grid of config sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* SECTION A: INDIVIDUAL RULES */}
        {showIndividualConfig && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                Cấu Hình Thi Đấu Cá Nhân
              </h3>
            </div>

            {/* Shots count config */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/40">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  Số lượt bắn (Cá nhân):
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={shotsCount}
                  onChange={(e) => {
                    const newShots = Math.max(1, Math.min(30, Number(e.target.value) || 1));
                    setShotsCount(newShots);
                    if (newShots > 1) {
                      if (setDirectMaxShots) setDirectMaxShots(undefined as any);
                      if (setDirectMaxPoints) setDirectMaxPoints(undefined as any);
                    }
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold dark:border-slate-800"
                />
              </div>

              {shotsCount === 1 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      Số viên tối đa mỗi lượt:
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={directMaxShots}
                      onChange={(e) => setDirectMaxShots(Math.max(1, Number(e.target.value) || 10))}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold dark:border-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      Điểm tối đa mỗi lượt (Hệ 10):
                    </label>
                    <input
                      type="number"
                      value={directMaxPoints ?? ""}
                      onChange={(e) => setDirectMaxPoints(e.target.value === "" ? undefined : Math.max(1, Number(e.target.value)))}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold dark:border-slate-800"
                      placeholder="Không giới hạn"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* List of existing individual distances */}
            <div className="space-y-2">
              <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Danh sách vòng đấu (Cự ly):</span>
              <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                {distances.map((dist, distIdx) => (
                  <div 
                    key={dist.id} 
                    className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl transition-all"
                  >
                    {editingDistanceId === dist.id && editingDistanceType === "individual" ? (
                      /* EDIT MODE INDIVIDUAL */
                      <div className="space-y-3 animate-fadeIn">
                        <span className="text-xs font-bold text-indigo-600 block">Sửa Cự Ly Vòng {distIdx + 1}</span>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">Tên cự ly:</span>
                            <input
                              type="text"
                              value={editStr}
                              onChange={(e) => setEditStr(e.target.value)}
                              className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-slate-900"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">Hệ số nhân điểm:</span>
                            <input
                              type="number"
                              value={editMultiplier}
                              onChange={(e) => setEditMultiplier(Math.max(1, Number(e.target.value)))}
                              className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-slate-900"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">Số lượt bắn:</span>
                            <input
                              type="number"
                              value={editShotsCount}
                              onChange={(e) => setEditShotsCount(Math.max(1, Number(e.target.value)))}
                              className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-slate-900 font-mono"
                            />
                          </div>
                        </div>

                        {/* Solo options */}
                        <div className="border border-indigo-100 dark:border-indigo-900/40 p-2.5 rounded-lg bg-indigo-50/20 space-y-1.5">
                          <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider block">Thiết lập sút luân lưu (Tie-break Shootout):</span>
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={editIsSolo}
                              onChange={(e) => {
                                setEditIsSolo(e.target.checked);
                                setEditIsResolo(e.target.checked);
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>Kích hoạt vòng Solo Shootout khi bằng điểm (Tự động hỗ trợ các lượt Solo phân định)</span>
                          </label>
                        </div>

                        {/* Other general scoring methods */}
                        <div className="space-y-1.5 pt-1">
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={editIsMaxRoundScore}
                              onChange={(e) => setEditIsMaxRoundScore(e.target.checked)}
                              className="rounded text-indigo-600"
                            />
                            <span>Lấy điểm Max của các vòng đấu</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={editIsCumulative}
                              onChange={(e) => setEditIsCumulative(e.target.checked)}
                              className="rounded text-indigo-600"
                            />
                            <span>Cộng dồn điểm từ các vòng trước</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={editIsElimination}
                              onChange={(e) => setEditIsElimination(e.target.checked)}
                              className="rounded text-indigo-600"
                            />
                            <span className="font-bold text-rose-600">Có loại trực tiếp (Cut-off)</span>
                          </label>
                        </div>

                        {/* Elimination configs */}
                        {editIsElimination && (
                          <div className="pl-4 border-l-2 border-rose-500 space-y-2.5 py-1 animate-slideDown">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-slate-500 font-medium">Hình thức chọn lọc:</span>
                              <select
                                value={editEliminationType}
                                onChange={(e) => setEditEliminationType(e.target.value as any)}
                                className="bg-white dark:bg-slate-900 border rounded p-1 text-[11px]"
                              >
                                <option value="count">Chọn Top số người cụ thể</option>
                                <option value="percent">Chọn % số người cao nhất</option>
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">Số lượng đi tiếp:</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={editEliminationValue}
                                  onChange={(e) => setEditEliminationValue(Math.max(1, Number(e.target.value)))}
                                  className="w-16 p-1 text-center font-mono border rounded text-xs"
                                />
                                <span className="text-xs font-bold text-indigo-600">
                                  {editEliminationType === "count" ? "vận động viên" : "% số vận động viên"}
                                </span>
                              </div>

                              {/* Visual Examples as requested */}
                              <div className="flex gap-1.5 items-center flex-wrap pt-1">
                                <span className="text-[10px] text-slate-400">Gợi ý nhanh:</span>
                                {editEliminationType === "count" ? (
                                  <>
                                    {["8", "16", "32"].map(n => (
                                      <button
                                        key={n}
                                        type="button"
                                        onClick={() => setEditEliminationValue(Number(n))}
                                        className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border ${
                                          editEliminationValue === Number(n)
                                            ? "bg-indigo-600 border-indigo-600 text-white"
                                            : "bg-slate-100 border-slate-200 text-slate-600 hover:border-slate-300"
                                        }`}
                                      >
                                        Top {n}
                                      </button>
                                    ))}
                                  </>
                                ) : (
                                  <>
                                    {["30", "50", "100"].map(p => (
                                      <button
                                        key={p}
                                        type="button"
                                        onClick={() => setEditEliminationValue(Number(p))}
                                        className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border ${
                                          editEliminationValue === Number(p)
                                            ? "bg-indigo-600 border-indigo-600 text-white"
                                            : "bg-slate-100 border-slate-200 text-slate-600 hover:border-slate-300"
                                        }`}
                                      >
                                        Top {p}%
                                      </button>
                                    ))}
                                  </>
                                )}
                              </div>

                              {/* Clear Visual Indicator */}
                              <div className="bg-rose-50/50 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-100/60 text-[11px] text-rose-700 dark:text-rose-400 leading-normal font-medium">
                                🎯 <strong>Mô phỏng loại:</strong> Chỉ giữ lại các vận động viên nằm trong nhóm có thành tích cao nhất (
                                {editEliminationType === "count" ? `Top ${editEliminationValue} người` : `Top ${editEliminationValue}% người`}
                                ) để đi tiếp vào vòng sau. Những người dưới vạch này sẽ bị loại.
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => { setEditingDistanceId(null); setEditingDistanceType(null); }}
                            className="px-2.5 py-1 text-xs border rounded bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold"
                          >
                            Lưu
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* READ MODE INDIVIDUAL */
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                              {distIdx + 1}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{dist.distance}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 font-mono">
                              Hệ số: x{dist.multiplier}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-semibold">
                              {dist.shotsCount || shotsCount || 10} viên
                            </span>
                          </div>
                          
                          {/* Scoring indicators */}
                          <div className="flex flex-wrap gap-1.5 pl-7 pt-1">
                            {dist.isMaxRoundScore && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                                🏆 Điểm cao nhất
                              </span>
                            )}
                            {dist.isCumulative && (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-750 dark:text-indigo-400 text-[10px] font-bold">
                                ➕ Cộng dồn
                              </span>
                            )}
                            {dist.isElimination ? (
                              <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 text-[10px] font-bold border border-rose-100/40">
                                ✂️ Loại: Top {dist.eliminationValue}{dist.eliminationType === "percent" ? "%" : " người"}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px]">
                                ➡️ Đi tiếp toàn bộ
                              </span>
                            )}
                            {dist.isSolo && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                                🎯 Có sút Solo
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => startEditing(dist, "individual")}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 rounded"
                            title="Sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDistance(dist.id, "individual")}
                            className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-600 rounded"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Form to add a new individual distance */}
            <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-3">
              <span className="text-[11px] font-black uppercase text-indigo-600 dark:text-indigo-400 block tracking-wider">Thêm vòng đấu mới (Cự ly Cá Nhân)</span>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Tên cự ly:</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 10 Met"
                    value={indDistanceStr}
                    onChange={(e) => setIndDistanceStr(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border rounded dark:bg-slate-900 dark:border-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Hệ số nhân:</label>
                  <input
                    type="number"
                    value={indMultiplierVal}
                    onChange={(e) => setIndMultiplierVal(Math.max(1, Number(e.target.value)))}
                    className="w-full text-xs px-2.5 py-1.5 border rounded dark:bg-slate-900 dark:border-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Số lượt bắn:</label>
                  <input
                    type="number"
                    value={indShotsCount}
                    onChange={(e) => setIndShotsCount(Math.max(1, Number(e.target.value)))}
                    className="w-full text-xs px-2.5 py-1.5 border rounded dark:bg-slate-900 dark:border-slate-800 font-mono"
                  />
                </div>
              </div>

              {/* Tie-break Shootout rules are ALWAYS visible */}
              <div className="border border-indigo-100 dark:border-indigo-900/40 p-2.5 rounded-lg bg-indigo-50/20 space-y-1.5">
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider block">Thiết lập sút luân lưu (Tie-break Shootout):</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={indIsSolo}
                    onChange={(e) => setIndIsSolo(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Kích hoạt vòng Solo Shootout khi bằng điểm</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 pl-4">
                  <input
                    type="checkbox"
                    checked={indIsResolo}
                    disabled={!indIsSolo}
                    onChange={(e) => setIndIsResolo(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40"
                  />
                  <span className={!indIsSolo ? "text-slate-400" : ""}>Cho phép Re-Solo luân lưu nhiều loạt</span>
                </label>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={indIsMaxRoundScore}
                    onChange={(e) => setIndIsMaxRoundScore(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Lấy điểm Max các vòng</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={indIsCumulative}
                    onChange={(e) => setIndIsCumulative(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Cộng dồn điểm từ vòng trước</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={indIsElimination}
                    onChange={(e) => setIndIsElimination(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span className="font-bold text-rose-600">Áp dụng loại trực tiếp (Cut)</span>
                </label>
              </div>

              {indIsElimination && (
                <div className="pl-4 border-l-2 border-rose-500 space-y-2 animate-slideDown">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Loại bằng:</span>
                    <select
                      value={indEliminationType}
                      onChange={(e) => setIndEliminationType(e.target.value as any)}
                      className="bg-white dark:bg-slate-900 border rounded text-xs p-1"
                    >
                      <option value="count">Số người cụ thể</option>
                      <option value="percent">% số người đi tiếp</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Số đi tiếp:</span>
                    <input
                      type="number"
                      min="1"
                      value={indEliminationValue}
                      onChange={(e) => setIndEliminationValue(Math.max(1, Number(e.target.value)))}
                      className="w-14 p-1 text-center border rounded font-mono text-xs"
                    />
                    <span className="font-bold text-slate-500">
                      {indEliminationType === "count" ? "vận động viên" : "%"}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleAddIndDistance}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" /> Thêm Cự Ly Cá Nhân
              </button>
            </div>
          </div>
        )}

        {/* SECTION B: TEAM RULES (Configured completely independently as requested) */}
        {showTeamConfig && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                Cấu Hình Thi Đấu Đồng Đội (Team Configuration)
              </h3>
              <span className="px-2 py-0.5 text-[9px] uppercase font-black tracking-widest text-indigo-700 bg-indigo-50 rounded">Độc lập với Cá Nhân</span>
            </div>

            {/* Shots count config */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/40">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  Số lượt bắn (Đồng đội):
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={teamShotsCount}
                  onChange={(e) => {
                    const newTeamShots = Math.max(1, Math.min(30, Number(e.target.value) || 1));
                    setTeamShotsCount(newTeamShots);
                    if (newTeamShots > 1) {
                      if (setTeamDirectMaxShots) setTeamDirectMaxShots(undefined as any);
                      if (setTeamDirectMaxPoints) setTeamDirectMaxPoints(undefined as any);
                    }
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold dark:border-slate-800"
                />
              </div>

              {teamShotsCount === 1 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      Số viên tối đa mỗi lượt:
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={teamDirectMaxShots}
                      onChange={(e) => setTeamDirectMaxShots(Math.max(1, Number(e.target.value) || 10))}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold dark:border-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      Điểm tối đa mỗi lượt (Đồng đội):
                    </label>
                    <input
                      type="number"
                      value={teamDirectMaxPoints ?? ""}
                      onChange={(e) => setTeamDirectMaxPoints(e.target.value === "" ? undefined : Math.max(1, Number(e.target.value)))}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold dark:border-slate-800"
                      placeholder="Không giới hạn"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* List of existing team distances */}
            <div className="space-y-2">
              <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Danh sách vòng đấu (Cự ly Đồng Đội):</span>
              <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                {teamDistances.map((dist, distIdx) => (
                  <div 
                    key={dist.id} 
                    className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl transition-all"
                  >
                    {editingDistanceId === dist.id && editingDistanceType === "team" ? (
                      /* EDIT MODE TEAM */
                      <div className="space-y-3 animate-fadeIn">
                        <span className="text-xs font-bold text-indigo-600 block">Sửa Cự Ly Đồng Đội Vòng {distIdx + 1}</span>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">Tên cự ly:</span>
                            <input
                              type="text"
                              value={editStr}
                              onChange={(e) => setEditStr(e.target.value)}
                              className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-slate-900"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">Hệ số nhân điểm:</span>
                            <input
                              type="number"
                              value={editMultiplier}
                              onChange={(e) => setEditMultiplier(Math.max(1, Number(e.target.value)))}
                              className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-slate-900"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">Số lượt bắn:</span>
                            <input
                              type="number"
                              value={editShotsCount}
                              onChange={(e) => setEditShotsCount(Math.max(1, Number(e.target.value)))}
                              className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-slate-900 font-mono"
                            />
                          </div>
                        </div>

                        {/* Solo options */}
                        <div className="border border-indigo-100 dark:border-indigo-900/40 p-2.5 rounded-lg bg-indigo-50/20 space-y-1.5">
                          <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider block">Thiết lập sút luân lưu (Tie-break Shootout):</span>
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={editIsSolo}
                              onChange={(e) => {
                                setEditIsSolo(e.target.checked);
                                setEditIsResolo(e.target.checked);
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>Kích hoạt vòng Solo Shootout khi bằng điểm (Tự động hỗ trợ các lượt Solo phân định)</span>
                          </label>
                        </div>

                        {/* Other general scoring methods */}
                        <div className="space-y-1.5 pt-1">
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={editIsMaxRoundScore}
                              onChange={(e) => setEditIsMaxRoundScore(e.target.checked)}
                              className="rounded text-indigo-600"
                            />
                            <span>Lấy điểm Max của các vòng đấu</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={editIsCumulative}
                              onChange={(e) => setEditIsCumulative(e.target.checked)}
                              className="rounded text-indigo-600"
                            />
                            <span>Cộng dồn điểm từ các vòng trước</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={editIsElimination}
                              onChange={(e) => setEditIsElimination(e.target.checked)}
                              className="rounded text-indigo-600"
                            />
                            <span className="font-bold text-rose-600">Có loại trực tiếp (Cut-off)</span>
                          </label>
                        </div>

                        {/* Elimination configs */}
                        {editIsElimination && (
                          <div className="pl-4 border-l-2 border-rose-500 space-y-2.5 py-1 animate-slideDown">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-slate-500 font-medium">Hình thức chọn lọc:</span>
                              <select
                                value={editEliminationType}
                                onChange={(e) => setEditEliminationType(e.target.value as any)}
                                className="bg-white dark:bg-slate-900 border rounded p-1 text-[11px]"
                              >
                                <option value="count">Chọn Top số đội cụ thể</option>
                                <option value="percent">Chọn % số đội cao nhất</option>
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">Số lượng đi tiếp:</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={editEliminationValue}
                                  onChange={(e) => setEditEliminationValue(Math.max(1, Number(e.target.value)))}
                                  className="w-16 p-1 text-center font-mono border rounded text-xs"
                                />
                                <span className="text-xs font-bold text-indigo-600">
                                  {editEliminationType === "count" ? "đội" : "% số đội"}
                                </span>
                              </div>

                              {/* Visual Examples as requested */}
                              <div className="flex gap-1.5 items-center flex-wrap pt-1">
                                <span className="text-[10px] text-slate-400">Gợi ý nhanh:</span>
                                {editEliminationType === "count" ? (
                                  <>
                                    {["4", "8", "16"].map(n => (
                                      <button
                                        key={n}
                                        type="button"
                                        onClick={() => setEditEliminationValue(Number(n))}
                                        className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border ${
                                          editEliminationValue === Number(n)
                                            ? "bg-indigo-600 border-indigo-600 text-white"
                                            : "bg-slate-100 border-slate-200 text-slate-600 hover:border-slate-300"
                                        }`}
                                      >
                                        Top {n} Đội
                                      </button>
                                    ))}
                                  </>
                                ) : (
                                  <>
                                    {["30", "50", "100"].map(p => (
                                      <button
                                        key={p}
                                        type="button"
                                        onClick={() => setEditEliminationValue(Number(p))}
                                        className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border ${
                                          editEliminationValue === Number(p)
                                            ? "bg-indigo-600 border-indigo-600 text-white"
                                            : "bg-slate-100 border-slate-200 text-slate-600 hover:border-slate-300"
                                        }`}
                                      >
                                        Top {p}% Đội
                                      </button>
                                    ))}
                                  </>
                                )}
                              </div>

                              {/* Clear Visual Indicator */}
                              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-2 rounded-lg border border-indigo-100/60 text-[11px] text-indigo-700 dark:text-indigo-400 leading-normal font-medium">
                                👥 <strong>Mô phỏng loại đồng đội:</strong> Chỉ giữ lại các nhóm / câu lạc bộ có tổng điểm cao nhất (
                                {editEliminationType === "count" ? `Top ${editEliminationValue} Đội` : `Top ${editEliminationValue}% Đội`}
                                ) để đi tiếp. Các đội còn lại sẽ dừng bước.
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => { setEditingDistanceId(null); setEditingDistanceType(null); }}
                            className="px-2.5 py-1 text-xs border rounded bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold"
                          >
                            Lưu
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* READ MODE TEAM */
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                              {distIdx + 1}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{dist.distance}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 font-mono">
                              Hệ số: x{dist.multiplier}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-semibold">
                              {dist.shotsCount || teamShotsCount || shotsCount || 10} viên
                            </span>
                          </div>
                          
                          {/* Scoring indicators */}
                          <div className="flex flex-wrap gap-1.5 pl-7 pt-1">
                            {dist.isMaxRoundScore && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                                🏆 Điểm cao nhất
                              </span>
                            )}
                            {dist.isCumulative && (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-750 dark:text-indigo-400 text-[10px] font-bold">
                                ➕ Cộng dồn
                              </span>
                            )}
                            {dist.isElimination ? (
                              <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 text-[10px] font-bold border border-rose-100/40">
                                ✂️ Loại: Top {dist.eliminationValue}{dist.eliminationType === "percent" ? "%" : " Đội"}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px]">
                                ➡️ Đi tiếp toàn bộ
                              </span>
                            )}
                            {dist.isSolo && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                                🎯 Có sút Solo
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => startEditing(dist, "team")}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 rounded"
                            title="Sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDistance(dist.id, "team")}
                            className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-600 rounded"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Form to add a new team distance */}
            <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-3">
              <span className="text-[11px] font-black uppercase text-indigo-600 dark:text-indigo-400 block tracking-wider">Thêm vòng đấu mới (Cự ly Đồng Đội)</span>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Tên cự ly:</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 10m (Đồng Đội)"
                    value={tmDistanceStr}
                    onChange={(e) => setTmDistanceStr(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border rounded dark:bg-slate-900 dark:border-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Hệ số nhân:</label>
                  <input
                    type="number"
                    value={tmMultiplierVal}
                    onChange={(e) => setTmMultiplierVal(Math.max(1, Number(e.target.value)))}
                    className="w-full text-xs px-2.5 py-1.5 border rounded dark:bg-slate-900 dark:border-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Số lượt bắn:</label>
                  <input
                    type="number"
                    value={tmShotsCount}
                    onChange={(e) => setTmShotsCount(Math.max(1, Number(e.target.value)))}
                    className="w-full text-xs px-2.5 py-1.5 border rounded dark:bg-slate-900 dark:border-slate-800 font-mono"
                  />
                </div>
              </div>

              {/* Tie-break Shootout rules are ALWAYS visible */}
              <div className="border border-indigo-100 dark:border-indigo-900/40 p-2.5 rounded-lg bg-indigo-50/20 space-y-1.5">
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider block">Thiết lập sút luân lưu (Tie-break Shootout):</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={tmIsSolo}
                    onChange={(e) => setTmIsSolo(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Kích hoạt vòng Solo Shootout khi bằng điểm</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 pl-4">
                  <input
                    type="checkbox"
                    checked={tmIsResolo}
                    disabled={!tmIsSolo}
                    onChange={(e) => setTmIsResolo(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40"
                  />
                  <span className={!tmIsSolo ? "text-slate-400" : ""}>Cho phép Re-Solo luân lưu nhiều loạt</span>
                </label>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={tmIsMaxRoundScore}
                    onChange={(e) => setTmIsMaxRoundScore(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Lấy điểm Max các vòng</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={tmIsCumulative}
                    onChange={(e) => setTmIsCumulative(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Cộng dồn điểm từ vòng trước</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={tmIsElimination}
                    onChange={(e) => setTmIsElimination(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span className="font-bold text-rose-600">Áp dụng loại trực tiếp (Cut)</span>
                </label>
              </div>

              {tmIsElimination && (
                <div className="pl-4 border-l-2 border-rose-500 space-y-2 animate-slideDown">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Loại bằng:</span>
                    <select
                      value={tmEliminationType}
                      onChange={(e) => setTmEliminationType(e.target.value as any)}
                      className="bg-white dark:bg-slate-900 border rounded text-xs p-1"
                    >
                      <option value="count">Số đội cụ thể</option>
                      <option value="percent">% số đội đi tiếp</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Số đi tiếp:</span>
                    <input
                      type="number"
                      min="1"
                      value={tmEliminationValue}
                      onChange={(e) => setTmEliminationValue(Math.max(1, Number(e.target.value)))}
                      className="w-14 p-1 text-center border rounded font-mono text-xs"
                    />
                    <span className="font-bold text-slate-500">
                      {tmEliminationType === "count" ? "đội" : "%"}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleAddTmDistance}
                className="w-full py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" /> Thêm Cự Ly Đồng Đội
              </button>
            </div>
          </div>
        )}

      </div>

      {/* MODAL: DELETE TEMPLATE CONFIRMATION */}
      {deleteConfirmTemplate && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-tight">Xác Nhận Xóa Mẫu Luật</h3>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Bạn có chắc chắn muốn xóa mẫu luật <strong className="text-slate-900 dark:text-white font-black">"{deleteConfirmTemplate.name}"</strong>? 
              <br />
              Thao tác này sẽ loại bỏ mẫu luật khỏi danh sách tái sử dụng của bạn.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTemplate(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs cursor-pointer transition-all"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={async () => {
                  const { id, name } = deleteConfirmTemplate;
                  setDeleteConfirmTemplate(null);
                  await handleDeleteTemplate(id, name, true);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs cursor-pointer transition-all shadow-md shadow-rose-600/10"
              >
                Xác nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE DISTANCE CONFIRMATION */}
      {deleteConfirmDistance && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-tight">Xác Nhận Xóa Cự Ly</h3>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Bạn có chắc chắn muốn xóa cự ly thi đấu này không? Dữ liệu cự ly sẽ bị loại bỏ khỏi danh sách thi đấu đang thiết lập.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmDistance(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs cursor-pointer transition-all"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  const { id, type } = deleteConfirmDistance;
                  setDeleteConfirmDistance(null);
                  handleDeleteDistance(id, type, true);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs cursor-pointer transition-all shadow-md shadow-rose-600/10"
              >
                Xác nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
