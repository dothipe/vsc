import React from "react";
import { Image as ImageIcon, DollarSign } from "lucide-react";
import { RuleEngine } from "../RuleEngine";
import { DistanceConfig } from "../../types";

interface TournamentConfigTabProps {
  canUpdate: boolean;
  tournamentName: string;
  setTournamentName: (val: string) => void;
  season: string;
  setSeason: (val: string) => void;
  availableSeasons: any[];
  organizer: string;
  setOrganizer: (val: string) => void;
  location: string;
  setLocation: (val: string) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  tournamentFormat: "individual" | "mixed";
  setTournamentFormat: (val: "individual" | "mixed") => void;
  logo: string;
  banner: string;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "banner") => void;
  registrationFee: number;
  setRegistrationFee: (val: number) => void;
  bankName: string;
  setBankName: (val: string) => void;
  bankAccountNumber: string;
  setBankAccountNumber: (val: string) => void;
  bankAccountName: string;
  setBankAccountName: (val: string) => void;
  payosClientId: string;
  setPayosClientId: (val: string) => void;
  payosApiKey: string;
  setPayosApiKey: (val: string) => void;
  payosChecksumKey: string;
  setPayosChecksumKey: (val: string) => void;
  payosAutoApprove: boolean;
  setPayosAutoApprove: (val: boolean) => void;
  configSubTab: "general" | "rules";
  setConfigSubTab: (val: "general" | "rules") => void;
  distances: any[];
  setDistances: (val: any[]) => void;
  shotsCount: number;
  setShotsCount: (val: number) => void;
  directMaxShots: number;
  setDirectMaxShots: (val: number) => void;
  directMaxPoints: number | undefined;
  setDirectMaxPoints: (val: number | undefined) => void;
  teamDistances: DistanceConfig[];
  setTeamDistances: (val: DistanceConfig[]) => void;
  teamShotsCount: number;
  setTeamShotsCount: (val: number) => void;
  teamDirectMaxShots: number;
  setTeamDirectMaxShots: (val: number) => void;
  teamDirectMaxPoints: number | undefined;
  setTeamDirectMaxPoints: (val: number | undefined) => void;
}

export const TournamentConfigTab: React.FC<TournamentConfigTabProps> = ({
  canUpdate,
  tournamentName,
  setTournamentName,
  season,
  setSeason,
  availableSeasons,
  organizer,
  setOrganizer,
  location,
  setLocation,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  description,
  setDescription,
  tournamentFormat,
  setTournamentFormat,
  logo,
  banner,
  handleImageUpload,
  registrationFee,
  setRegistrationFee,
  bankName,
  setBankName,
  bankAccountNumber,
  setBankAccountNumber,
  bankAccountName,
  setBankAccountName,
  payosClientId,
  setPayosClientId,
  payosApiKey,
  setPayosApiKey,
  payosChecksumKey,
  setPayosChecksumKey,
  payosAutoApprove,
  setPayosAutoApprove,
  configSubTab,
  setConfigSubTab,
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
}) => {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Sub-tabs header pills */}
      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setConfigSubTab("general")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            configSubTab === "general"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850"
          }`}
        >
          Thông Tin Chung & Logo (General Profile)
        </button>
        <button
          type="button"
          onClick={() => setConfigSubTab("rules")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            configSubTab === "rules"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850"
          }`}
        >
          Cấu Hình Quy Chế (Rule Engine Settings)
        </button>
      </div>

      {configSubTab === "general" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Thông Tin Chung & Logo/Banner</h2>
            <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">Đặt cấu hình cơ bản cho hồ sơ giải đấu.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo upload */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950/20">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Ảnh Logo Giải Đấu</span>
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-750 bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden shadow-sm">
                {logo ? (
                  <img src={logo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-300" />
                )}
              </div>
              {canUpdate && (
                <label className="mt-3 px-3 py-1.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer shadow-sm hover:bg-slate-50">
                  Chọn ảnh logo
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "logo")} />
                </label>
              )}
            </div>

            {/* Banner upload */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950/20">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Ảnh Banner Giải Đấu</span>
              <div className="w-full h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-750 bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden shadow-sm">
                {banner ? (
                  <img src={banner} alt="Banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-300" />
                )}
              </div>
              {canUpdate && (
                <label className="mt-3 px-3 py-1.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer shadow-sm hover:bg-slate-50">
                  Chọn ảnh banner
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "banner")} />
                </label>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tên Giải Đấu *</label>
              <input
                type="text"
                disabled={!canUpdate}
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Giải Slingshot Toàn Quốc"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Mùa Giải (Season) *</label>
              <select
                disabled={!canUpdate}
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="">-- Chọn Mùa Giải --</option>
                {availableSeasons.map((s: any) => (
                  <option key={s.seasonId} value={s.name}>
                    {s.name} ({s.year})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nhà Tổ Chức *</label>
              <input
                type="text"
                disabled={!canUpdate}
                value={organizer}
                onChange={(e) => setOrganizer(e.target.value)}
                className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Địa Điểm (Location) *</label>
              <input
                type="text"
                disabled={!canUpdate}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Ngày Bắt Đầu *</label>
              <input
                type="date"
                disabled={!canUpdate}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Ngày Kết Thúc *</label>
              <input
                type="date"
                disabled={!canUpdate}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Mô Tả Chi Tiết</label>
              <textarea
                rows={3}
                disabled={!canUpdate}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Mô tả tôn chỉ mục đích giải đấu..."
              />
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Thể thức giải đấu *</label>
              <select
                disabled={!canUpdate}
                value={tournamentFormat}
                onChange={(e) => setTournamentFormat(e.target.value as any)}
                className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              >
                <option value="individual">Cá Nhân (Individual Only)</option>
                <option value="mixed">Cá Nhân + Đồng Đội (Combined Format)</option>
              </select>
            </div>

            {/* Cổng Thanh Toán & Lệ Phí Đăng Ký (VietQR & PayOS) */}
            <div className="sm:col-span-2 bg-slate-50/70 dark:bg-slate-950/20 p-5 rounded-2xl border border-indigo-100/80 dark:border-indigo-950/40 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Hệ Thống Lệ Phí & Thanh Toán Tự Động (Napas VietQR / PayOS)</h3>
                  <p className="text-[10px] text-slate-500">Người tạo giải có thể tích hợp trực tiếp với MB Bank của anh Nguyễn Hữu Hiệp và đối tác PayOS để tự động hóa quy trình đối soát.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Lệ Phí Đăng Ký (VND)</label>
                  <input
                    type="number"
                    disabled={!canUpdate}
                    value={registrationFee}
                    onChange={(e) => setRegistrationFee(Number(e.target.value))}
                    className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                    placeholder="e.g. 200000"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Ngân hàng thụ hưởng</label>
                  <select
                    disabled={!canUpdate}
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="MB Bank">MB Bank (Ngân hàng Quân Đội)</option>
                    <option value="Vietcombank">Vietcombank</option>
                    <option value="Techcombank">Techcombank</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Số tài khoản thụ hưởng</label>
                  <input
                    type="text"
                    disabled={!canUpdate}
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                    placeholder="0968210586"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Tên chủ tài khoản (In hoa)</label>
                  <input
                    type="text"
                    disabled={!canUpdate}
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value.toUpperCase())}
                    className="border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 font-bold"
                    placeholder="NGUYEN HUU HIEP"
                  />
                </div>

                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    Trạng thái đồng bộ PayOS
                    <span className="inline-block text-[9px] font-extrabold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-450 rounded-full border border-emerald-200/50">
                      ● ĐÃ LIÊN KẾT (CAS ID)
                    </span>
                  </label>
                  <div className="text-slate-500 text-[10px] bg-indigo-50/40 dark:bg-slate-900 px-3 py-2 rounded-xl border border-indigo-100/30 font-medium">
                    Tài khoản MB <strong>{bankAccountNumber}</strong> của bạn đã được kết nối thông qua CAS ID sang PayOS.vn. Trạng thái Webhook lắng nghe giao dịch chuyển khoản hoạt động bình thường.
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={payosAutoApprove}
                    onChange={(e) => setPayosAutoApprove(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <div>
                    <span className="text-[11px] font-bold text-slate-800 dark:text-white block">Tự động duyệt VĐV & điểm danh khi nhận đủ lệ phí (Auto-approve)</span>
                    <span className="text-[10px] text-slate-450 block">Hệ thống sẽ đối soát nội dung chuyển khoản để tự động chuyển trạng thái VĐV sang Đã Đóng & Checked-In ngay khi nhận thông báo biến động số dư.</span>
                  </div>
                </label>
              </div>

              <div className="p-3.5 bg-slate-100/60 dark:bg-slate-900/60 rounded-xl space-y-2">
                <span className="text-[10px] font-extrabold text-slate-550 dark:text-slate-400 block tracking-wider uppercase">Cấu hình API Key (Lấy từ PayOS Dashboard) - Tùy chọn nâng cao</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-450">Client ID</label>
                    <input
                      type="password"
                      value={payosClientId}
                      onChange={(e) => setPayosClientId(e.target.value)}
                      className="border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-850 dark:text-white rounded-lg px-2.5 py-1 text-[10px] font-mono"
                      placeholder="••••••••••••••••••••"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-450">API Key</label>
                    <input
                      type="password"
                      value={payosApiKey}
                      onChange={(e) => setPayosApiKey(e.target.value)}
                      className="border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-850 dark:text-white rounded-lg px-2.5 py-1 text-[10px] font-mono"
                      placeholder="••••••••••••••••••••"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-450">Checksum Key</label>
                    <input
                      type="password"
                      value={payosChecksumKey}
                      onChange={(e) => setPayosChecksumKey(e.target.value)}
                      className="border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-850 dark:text-white rounded-lg px-2.5 py-1 text-[10px] font-mono"
                      placeholder="••••••••••••••••••••"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {configSubTab === "rules" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Cấu Hình Quy Chế Tổng Thể (Rule Engine)</h2>
            <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">
              Sử dụng động cơ cấu hình duy nhất để chỉnh sửa cự ly cá nhân & đồng đội.
            </p>
          </div>

          <RuleEngine
            distances={distances}
            setDistances={setDistances}
            shotsCount={shotsCount}
            setShotsCount={setShotsCount}
            directMaxShots={directMaxShots}
            setDirectMaxShots={setDirectMaxShots}
            directMaxPoints={directMaxPoints}
            setDirectMaxPoints={setDirectMaxPoints}
            teamDistances={teamDistances}
            setTeamDistances={setTeamDistances}
            teamShotsCount={teamShotsCount}
            setTeamShotsCount={setTeamShotsCount}
            teamDirectMaxShots={teamDirectMaxShots}
            setTeamDirectMaxShots={setTeamDirectMaxShots}
            teamDirectMaxPoints={teamDirectMaxPoints}
            setTeamDirectMaxPoints={setTeamDirectMaxPoints}
            showIndividualConfig={true}
            showTeamConfig={tournamentFormat === "mixed"}
          />
        </div>
      )}
    </div>
  );
};
