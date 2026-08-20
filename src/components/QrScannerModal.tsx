import { X, AlertTriangle, AlertCircle, CheckCircle, QrCode } from "lucide-react";

interface QrScannerModalProps {
  showQrScanner: boolean;
  scannedAthleteConfirmData: any;
  qrScannerError: string | null;
  availableCameras: any[];
  activeCameraId: string | null;
  setScannedAthleteConfirmData: (data: any) => void;
  setShowQrScanner: (show: boolean) => void;
  setActiveCameraId: (id: string | null) => void;
  startQrScanning: (cameraId: string) => void;
  handleProcessScannedAthlete: (scannedText: string) => void;
}

export function QrScannerModal({
  showQrScanner,
  scannedAthleteConfirmData,
  qrScannerError,
  availableCameras,
  activeCameraId,
  setScannedAthleteConfirmData,
  setShowQrScanner,
  setActiveCameraId,
  startQrScanning,
  handleProcessScannedAthlete,
}: QrScannerModalProps) {
  if (!showQrScanner) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[10007] p-4 animate-fadeIn">
      <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 max-w-md w-full shadow-2xl relative text-left flex flex-col gap-4">
        
        {scannedAthleteConfirmData ? (
          /* Athlete scanned confirmation card view */
          <div className="space-y-4 font-sans text-slate-100 animate-fadeIn">
            <div className="text-center border-b border-slate-800 pb-3 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-black text-red-500 uppercase tracking-widest text-left">
                  XÁC NHẬN THÔNG TIN VẤN ĐỘNG VIÊN
                </h4>
                <p className="text-[10px] text-gray-400 mt-1 text-left">
                  Vui lòng đối chiếu thông tin VĐV thực tế trước khi thêm vào bệ bắn.
                </p>
              </div>
              <button
                onClick={() => {
                  setScannedAthleteConfirmData(null);
                  setShowQrScanner(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Athlete Bento Card representation */}
            <div className="bg-slate-950 border-2 border-red-500 rounded-2xl p-4 space-y-3 relative overflow-hidden">
              {/* Circular target backgrounds */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03]">
                <div className="w-[300px] h-[300px] rounded-full border-[8px] border-red-500" />
                <div className="absolute w-[200px] h-[200px] rounded-full border-[6px] border-red-500" />
              </div>

              <div className="text-center space-y-1 relative z-10">
                <span className="inline-block px-2.5 py-0.5 bg-gradient-to-r from-red-600 to-rose-600 text-white text-[8px] font-black rounded-full uppercase tracking-widest">
                  VSC OFFICIAL ATHLETE
                </span>
                <div className="text-[10px] font-mono text-gray-450 mt-1">
                  ID VSC: <span className="font-bold text-red-400">{(scannedAthleteConfirmData.athleteObj.vscNumber || scannedAthleteConfirmData.athleteObj.id?.substring(0, 10) || "VSC-TEMP").toUpperCase()}</span>
                </div>
              </div>

              <div className="text-center relative z-10">
                <span className="text-[8px] text-red-400 uppercase font-mono tracking-wider block mb-0.5">VẬN ĐỘNG VIÊN</span>
                <h3 className="text-lg font-black text-white uppercase tracking-tight leading-tight">
                  {scannedAthleteConfirmData.athleteObj.name || scannedAthleteConfirmData.athleteObj.fullName}
                </h3>
              </div>

              <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-2.5 text-center relative z-10 flex justify-around items-center text-xs">
                <div className="text-center flex-1">
                  <span className="text-[8px] text-gray-400 uppercase block font-mono font-bold">SỐ BIB (SBD)</span>
                  <span className="text-sm font-extrabold text-red-400 font-mono">
                    {scannedAthleteConfirmData.athleteObj.bibNumber || "CHỜ CẤP"}
                  </span>
                </div>
                <div className="h-5 w-[1px] bg-slate-800" />
                <div className="text-center flex-1">
                  <span className="text-[8px] text-gray-400 uppercase block font-mono font-bold">CÂU LẠC BỘ</span>
                  <span className="text-[10px] font-black text-gray-200 truncate block px-1">
                    {scannedAthleteConfirmData.athleteObj.clubName || scannedAthleteConfirmData.athleteObj.team || "Tự Do"}
                  </span>
                </div>
              </div>

              {/* Active round info & Heat/Lane configs */}
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 space-y-2 relative z-10 text-xs">
                <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold uppercase">
                  <span>Vòng thi hiện tại:</span>
                  <span className="font-black text-red-400">{scannedAthleteConfirmData.activeDistanceName}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/40">
                  <div className="text-center bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/60">
                    <span className="text-[7px] text-gray-405 uppercase block font-mono">LƯỢT BẮN</span>
                    <span className="text-[11px] font-extrabold text-yellow-400 uppercase">
                      {scannedAthleteConfirmData.assignedHeatNum !== null ? `Lượt ${scannedAthleteConfirmData.assignedHeatNum}` : "CHỜ XẾP LƯỢT"}
                    </span>
                  </div>
                  <div className="text-center bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/60">
                    <span className="text-[7px] text-gray-405 uppercase block font-mono">BỆ SỐ (CẤU HÌNH)</span>
                    <span className="text-[11px] font-extrabold text-white uppercase">
                      {scannedAthleteConfirmData.assignedLaneNum !== null ? `Bệ số ${scannedAthleteConfirmData.assignedLaneNum}` : "CHỜ XẾP BỆ"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Validity / Status notification */}
            <div className="space-y-1.5 text-left">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block font-mono">Trạng Thái Hợp Lệ Vòng Này:</span>
              {scannedAthleteConfirmData.isDisqualifiedOrDNS ? (
                <div className="bg-rose-950/40 border border-rose-900/50 rounded-xl p-2.5 text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span className="font-bold">{scannedAthleteConfirmData.statusMsg}</span>
                </div>
              ) : !scannedAthleteConfirmData.isPresentInCurrentHeats ? (
                <div className="bg-rose-950/40 border border-rose-900/50 rounded-xl p-2.5 text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span className="font-bold">KHÔNG ĐỦ ĐIỀU KIỆN: VĐV đã bị loại ở vòng trước hoặc không có tên trong lượt bắn vòng này!</span>
                </div>
              ) : scannedAthleteConfirmData.hasCompleted ? (
                <div className="bg-amber-950/30 border border-amber-900/40 rounded-xl p-2.5 text-xs text-amber-300 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                  <span className="font-bold">ĐÃ BẮN XONG: VĐV đã hoàn thành lượt bắn ở vòng này!</span>
                </div>
              ) : (
                <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-xl p-2.5 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 animate-pulse" />
                  <span className="font-bold">HỢP LỆ: Sẵn sàng xếp vào Bệ số #{scannedAthleteConfirmData.nextFreeLane}!</span>
                </div>
              )}
            </div>

            {/* TIẾN TRÌNH THI ĐẤU CHI TIẾT TỪNG VÒNG */}
            {scannedAthleteConfirmData.stageProgress && scannedAthleteConfirmData.stageProgress.length > 0 && (
              <div className="space-y-1.5 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">
                  TIẾN TRÌNH THI ĐẤU CHI TIẾT CÁC VÒNG:
                </span>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {scannedAthleteConfirmData.stageProgress.map((prog: any, pIdx: number) => {
                    let statusBadge = null;
                    if (prog.eliminatedInPrev) {
                      statusBadge = (
                        <span className="px-2 py-0.5 rounded bg-rose-950/60 border border-rose-900/50 text-rose-400 font-bold text-[8px] uppercase">
                          Đã bị loại
                        </span>
                      );
                    } else if (prog.eliminatedInThis) {
                      statusBadge = (
                        <span className="px-2 py-0.5 rounded bg-rose-950/60 border border-rose-900/50 text-rose-400 font-bold text-[8px] uppercase">
                          Bị loại vòng này
                        </span>
                      );
                    } else if (prog.isCompleted) {
                      statusBadge = (
                        <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-900/45 text-amber-400 font-bold text-[8px] uppercase">
                          Đã bắn xong
                        </span>
                      );
                    } else {
                      statusBadge = (
                        <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-900/45 text-emerald-400 font-bold text-[8px] uppercase">
                          Chờ bắn
                        </span>
                      );
                    }

                    return (
                      <div 
                        key={prog.stageId || pIdx} 
                        className={`p-2 rounded-xl border flex flex-col gap-1 text-[11px] ${
                          prog.isCurrent 
                            ? "bg-red-500/10 border-red-500/30" 
                            : "bg-slate-900/50 border-slate-800/80"
                        }`}
                      >
                        <div className="flex justify-between items-center gap-2">
                          <span className="font-extrabold text-slate-200 truncate">
                            {prog.stageName} {prog.isCurrent && <span className="text-red-400 font-mono text-[9px] font-black ml-1">(Hiện tại)</span>}
                          </span>
                          {statusBadge}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-slate-800/40">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-450 font-mono text-[9px]">LƯỢT BẮN:</span>
                            <span className={`font-black ${prog.assignedHeatNum ? "text-yellow-400" : "text-gray-500"}`}>
                              {prog.assignedHeatNum ? `Lượt ${prog.assignedHeatNum}` : "Chờ xếp"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-450 font-mono text-[9px]">BỆ BẮN:</span>
                            <span className={`font-black ${prog.assignedLaneNum ? "text-white" : "text-gray-500"}`}>
                              {prog.assignedLaneNum ? `Bệ ${prog.assignedLaneNum}` : "Chờ xếp"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Control Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  setScannedAthleteConfirmData(null);
                  if (activeCameraId) {
                    startQrScanning(activeCameraId);
                  }
                }}
                className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
              >
                Quét Lại / Hủy
              </button>
              <button
                onClick={() => {
                  const text = scannedAthleteConfirmData.scannedText;
                  setScannedAthleteConfirmData(null);
                  setShowQrScanner(false);
                  handleProcessScannedAthlete(text);
                }}
                className="py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center shadow-md shadow-red-900/20"
              >
                Xác nhận thêm VĐV
              </button>
            </div>
          </div>
        ) : (
          /* Original QR camera scan layout */
          <>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-black uppercase text-emerald-400 tracking-wider flex items-center gap-2 font-sans">
                  <QrCode className="w-5 h-5 text-emerald-400 animate-pulse" />
                  Quét mã QR Thẻ VĐV
                </h3>
                <p className="text-[10px] text-gray-400 mt-1 font-sans">
                  Đặt mã QR trên thẻ VĐV trước camera để nhận diện và thêm tự động vào bệ bắn.
                </p>
              </div>
              <button
                onClick={() => setShowQrScanner(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error or Video Container */}
            {qrScannerError ? (
              <div className="bg-rose-950/50 border border-rose-900/50 rounded-2xl p-5 text-center text-rose-300 text-xs">
                <p className="font-bold mb-2 font-sans">⚠️ Lỗi máy ảnh</p>
                <p className="text-[11px] leading-relaxed mb-4">{qrScannerError}</p>
                <button
                  onClick={() => setShowQrScanner(false)}
                  className="px-4 py-2 bg-rose-800 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition cursor-pointer"
                >
                  Đóng thiết bị
                </button>
              </div>
            ) : (
              <div className="relative aspect-square w-full max-w-[280px] mx-auto overflow-hidden rounded-2xl bg-black border border-slate-800 shadow-inner flex items-center justify-center">
                
                {/* HTML5 QR reader element */}
                <div id="qr-reader-view-element" className="w-full h-full" />

                {/* Overlaid scanning laser line & corner frames */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
                  {/* Corners */}
                  <div className="flex justify-between">
                    <div className="w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                    <div className="w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                  </div>
                  
                  {/* Animating laser bar */}
                  <div className="w-full h-[2px] bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-bounce animate-duration-1000" />

                  <div className="flex justify-between">
                    <div className="w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                    <div className="w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                  </div>
                </div>
              </div>
            )}

            {/* Camera Selection */}
            {availableCameras.length > 1 && !qrScannerError && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider font-mono">
                  Chọn Camera:
                </label>
                <select
                  value={activeCameraId || ""}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setActiveCameraId(newId);
                    startQrScanning(newId);
                  }}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl focus:outline-none"
                >
                  {availableCameras.map((camera) => (
                    <option key={camera.id} value={camera.id}>
                      {camera.label || `Camera ${camera.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-2 text-center">
              <button
                onClick={() => setShowQrScanner(false)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Hủy bỏ
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
