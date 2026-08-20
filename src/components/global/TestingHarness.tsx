import React, { useState } from "react";
import { Play, CheckCircle, XCircle, ShieldAlert, Award, Activity, HelpCircle, RefreshCw } from "lucide-react";
import { testingHarnessInstance, TestResult } from "../../utils/harness";
import { motion } from "motion/react";

export const TestingHarnessComponent: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const handleRunTests = async () => {
    setRunning(true);
    try {
      const suiteResults = await testingHarnessInstance.runAllTests();
      setResults(suiteResults);
    } catch (e) {
      console.error(e);
    } finally {
      setRunning(false);
    }
  };

  const total = results.length;
  const passed = results.filter((r) => r.success).length;
  const failed = total - passed;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-950 text-base flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            <span>Diagnostic Testing Harness</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Chạy bộ kiểm thử tự động để xác nhận tính toàn vẹn của phân quyền và phòng chống lỗ hổng bảo mật.
          </p>
        </div>
        <button
          onClick={handleRunTests}
          disabled={running}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
        >
          {running ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>ĐANG KIỂM TRA...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>CHẠY KIỂM THỬ</span>
            </>
          )}
        </button>
      </div>

      {total > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-6">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center gap-3">
            <Award className="w-8 h-8 text-indigo-500" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Tỷ lệ Đạt</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{passRate}%</p>
            </div>
          </div>
          <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Vượt Qua</p>
              <p className="text-xl font-bold text-emerald-700 mt-1">{passed} / {total}</p>
            </div>
          </div>
          <div className="bg-rose-50/50 rounded-xl p-4 border border-rose-100 flex items-center gap-3">
            <XCircle className="w-8 h-8 text-rose-500" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Thất Bại</p>
              <p className="text-xl font-bold text-rose-700 mt-1">{failed}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results details */}
      {results.length > 0 ? (
        <div className="space-y-3 mt-2 max-h-96 overflow-y-auto pr-1">
          {results.map((res) => (
            <div
              key={res.id}
              className={`p-3.5 rounded-xl border flex items-start justify-between gap-4 text-xs font-sans transition-all ${
                res.success
                  ? "bg-slate-50 border-slate-100 text-slate-700"
                  : "bg-rose-50 border-rose-100 text-rose-800"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{res.name}</span>
                  <span className="bg-slate-200/60 text-slate-500 font-mono text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
                    {res.category}
                  </span>
                </div>
                <p className="text-slate-500 mt-1 leading-relaxed">{res.message}</p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span className="font-mono text-[10px] text-slate-400">{res.durationMs}ms</span>
                {res.success ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 mt-4">
          <HelpCircle className="w-8 h-8 text-slate-300" />
          <span>Chưa chạy quy trình kiểm thử hệ thống. Hãy nhấn nút để bắt đầu.</span>
        </div>
      )}
    </div>
  );
};
export default TestingHarnessComponent;
