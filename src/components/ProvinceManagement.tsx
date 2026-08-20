import React, { useState, useEffect } from "react";
import { 
  subscribeToVscSystemAthletes, 
  subscribeToVscSystemClubs,
  subscribeToTournamentsList,
  subscribeToVscSystemProvinces,
  saveVscSystemProvince
} from "../lib/firebaseService";
import { 
  MapPin, 
  Users, 
  Building, 
  Trophy, 
  Search, 
  Plus, 
  Edit3, 
  Check, 
  Calendar, 
  TrendingUp, 
  Sparkles,
  Layers,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AVATAR_MALE, AVATAR_FEMALE } from "./AthleteRegistry";

interface ProvinceInfo {
  provinceId: string;
  name: string;
  code: string;
  region: "Bắc" | "Trung" | "Nam";
  status: "active" | "inactive";
  description?: string;
}

const DEFAULT_PROVINCES: ProvinceInfo[] = [
  // Miền Bắc
  { provinceId: "HN", name: "Hà Nội", code: "29", region: "Bắc", status: "active", description: "Đơn vị thủ đô với lực lượng vận động viên hùng hậu" },
  { provinceId: "HP", name: "Hải Phòng", code: "15", region: "Bắc", status: "active", description: "Phong trào ná cao su đất Cảng đầy nhiệt huyết" },
  { provinceId: "BN", name: "Bắc Ninh", code: "99", region: "Bắc", status: "active", description: "Vùng đất dân ca Quan họ Kinh Bắc" },
  { provinceId: "VPh", name: "Vĩnh Phúc", code: "88", region: "Bắc", status: "active" },
  { provinceId: "HDo", name: "Hải Dương", code: "34", region: "Bắc", status: "active" },
  { provinceId: "HY", name: "Hưng Yên", code: "89", region: "Bắc", status: "active" },
  { provinceId: "QN", name: "Quảng Ninh", code: "14", region: "Bắc", status: "active", description: "Đơn vị mới nổi với phong trào phát triển mạnh" },
  { provinceId: "PTh", name: "Phú Thọ", code: "19", region: "Bắc", status: "active", description: "Đất tổ Hùng Vương nghìn năm văn hiến" },
  { provinceId: "TNg", name: "Thái Nguyên", code: "20", region: "Bắc", status: "active", description: "Thủ phủ chè và gang thép miền Bắc" },
  { provinceId: "BGi", name: "Bắc Giang", code: "98", region: "Bắc", status: "active" },
  { provinceId: "HGa", name: "Hà Giang", code: "23", region: "Bắc", status: "active", description: "Cao nguyên đá Đồng Văn kỳ vĩ" },
  { provinceId: "CBa", name: "Cao Bằng", code: "11", region: "Bắc", status: "active" },
  { provinceId: "BKa", name: "Bắc Kạn", code: "97", region: "Bắc", status: "active" },
  { provinceId: "TQu", name: "Tuyên Quang", code: "22", region: "Bắc", status: "active" },
  { provinceId: "LSon", name: "Lạng Sơn", code: "12", region: "Bắc", status: "active" },
  { provinceId: "LCai", name: "Lào Cai", code: "24", region: "Bắc", status: "active", description: "Địa bàn du lịch Sa Pa kỳ vĩ" },
  { provinceId: "YBai", name: "Yên Bái", code: "21", region: "Bắc", status: "active" },
  { provinceId: "DBi", name: "Điện Biên", code: "27", region: "Bắc", status: "active", description: "Chiến trường lịch sử Điện Biên Phủ lừng lẫy" },
  { provinceId: "LCha", name: "Lai Châu", code: "25", region: "Bắc", status: "active" },
  { provinceId: "SLa", name: "Sơn La", code: "26", region: "Bắc", status: "active" },
  { provinceId: "HBin", name: "Hòa Bình", code: "28", region: "Bắc", status: "active" },
  { provinceId: "HNa", name: "Hà Nam", code: "90", region: "Bắc", status: "active" },
  { provinceId: "NDi", name: "Nam Định", code: "18", region: "Bắc", status: "active" },
  { provinceId: "TBi", name: "Thái Bình", code: "17", region: "Bắc", status: "active" },
  { provinceId: "NBi", name: "Ninh Bình", code: "35", region: "Bắc", status: "active", description: "Cố đô Hoa Lư vùng đất Tràng An di sản" },

  // Miền Trung
  { provinceId: "TH", name: "Thanh Hóa", code: "36", region: "Trung", status: "active", description: "Cái nôi của phong trào bắn ná cao su miền Trung" },
  { provinceId: "NA", name: "Nghệ An", code: "37", region: "Trung", status: "active", description: "Địa phương giàu tiềm năng thi đấu chuyên nghiệp" },
  { provinceId: "HTi", name: "Hà Tĩnh", code: "38", region: "Trung", status: "active" },
  { provinceId: "QBi", name: "Quảng Bình", code: "73", region: "Trung", status: "active", description: "Vương quốc hang động Phong Nha - Kẻ Bàng" },
  { provinceId: "QTri", name: "Quảng Trị", code: "74", region: "Trung", status: "active" },
  { provinceId: "TTH", name: "Thừa Thiên Huế", code: "75", region: "Trung", status: "active", description: "Cố đô Huế mộng mơ di sản cung đình" },
  { provinceId: "DN", name: "Đà Nẵng", code: "43", region: "Trung", status: "active", description: "Trung tâm phát triển Slingshot duyên hải miền Trung" },
  { provinceId: "QNa", name: "Quảng Nam", code: "92", region: "Trung", status: "active", description: "Phố cổ Hội An thánh địa Mỹ Sơn" },
  { provinceId: "QNg", name: "Quảng Ngãi", code: "76", region: "Trung", status: "active" },
  { provinceId: "BDi", name: "Bình Định", code: "77", region: "Trung", status: "active", description: "Đất võ Tây Sơn hào khí hùng thiêng" },
  { provinceId: "PYe", name: "Phú Yên", code: "78", region: "Trung", status: "active" },
  { provinceId: "KHo", name: "Khánh Hòa", code: "79", region: "Trung", status: "active", description: "Vịnh biển Nha Trang tuyệt mỹ" },
  { provinceId: "NTu", name: "Ninh Thuận", code: "85", region: "Trung", status: "active" },
  { provinceId: "BTh", name: "Bình Thuận", code: "86", region: "Trung", status: "active" },
  { provinceId: "KTu", name: "Kon Tum", code: "82", region: "Trung", status: "active" },
  { provinceId: "GLa", name: "Gia Lai", code: "81", region: "Trung", status: "active" },
  { provinceId: "DL", name: "Đắk Lắk", code: "47", region: "Trung", status: "active", description: "Thủ phủ cà phê Buôn Ma Thuột Tây Nguyên" },
  { provinceId: "DNo", name: "Đắk Nông", code: "48", region: "Trung", status: "active" },
  { provinceId: "LDo", name: "Lâm Đồng", code: "49", region: "Trung", status: "active", description: "Thành phố ngàn hoa Đà Lạt mộng mơ" },

  // Miền Nam
  { provinceId: "HCM", name: "TP. Hồ Chí Minh", code: "50", region: "Nam", status: "active", description: "Đại diện khu vực miền Nam với phong cách thi đấu hiện đại" },
  { provinceId: "BD", name: "Bình Dương", code: "61", region: "Nam", status: "active", description: "Khu vực miền Đông Nam Bộ với nhiều nhân tố trẻ triển vọng" },
  { provinceId: "DNa", name: "Đồng Nai", code: "60", region: "Nam", status: "active" },
  { provinceId: "BPh", name: "Bình Phước", code: "93", region: "Nam", status: "active" },
  { provinceId: "TNin", name: "Tây Ninh", code: "70", region: "Nam", status: "active" },
  { provinceId: "BRVT", name: "Bà Rịa - Vũng Tàu", code: "72", region: "Nam", status: "active", description: "Thành phố biển du lịch nghỉ dưỡng sôi động" },
  { provinceId: "LAn", name: "Long An", code: "62", region: "Nam", status: "active" },
  { provinceId: "DTh", name: "Đồng Tháp", code: "66", region: "Nam", status: "active", description: "Đất sen hồng Tháp Mười" },
  { provinceId: "TGi", name: "Tiền Giang", code: "63", region: "Nam", status: "active" },
  { provinceId: "AGi", name: "An Giang", code: "67", region: "Nam", status: "active" },
  { provinceId: "BTre", name: "Bến Tre", code: "71", region: "Nam", status: "active", description: "Xứ dừa Đồng Khởi miền sông nước" },
  { provinceId: "VLo", name: "Vĩnh Long", code: "64", region: "Nam", status: "active" },
  { provinceId: "TVi", name: "Trà Vinh", code: "84", region: "Nam", status: "active" },
  { provinceId: "HGi", name: "Hậu Giang", code: "95", region: "Nam", status: "active" },
  { provinceId: "KGi", name: "Kiên Giang", code: "68", region: "Nam", status: "active", description: "Đảo ngọc Phú Quốc danh tiếng" },
  { provinceId: "STr", name: "Sóc Trăng", code: "83", region: "Nam", status: "active" },
  { provinceId: "BLi", name: "Bạc Liêu", code: "94", region: "Nam", status: "active" },
  { provinceId: "CMa", name: "Cà Mau", code: "69", region: "Nam", status: "active", description: "Đất mũi Cực Nam tổ quốc sông nước" },
  { provinceId: "CTh", name: "Cần Thơ", code: "65", region: "Nam", status: "active", description: "Thủ phủ Tây Đô gạo trắng nước trong" }
];

interface ProvinceManagementProps {
  currentUser?: any;
  userRole?: string;
}

export function ProvinceManagement({ currentUser, userRole }: ProvinceManagementProps) {
  const [provinces, setProvinces] = useState<ProvinceInfo[]>(DEFAULT_PROVINCES);
  const [masterAthletes, setMasterAthletes] = useState<any[]>([]);
  const [masterClubs, setMasterClubs] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [selectedProvince, setSelectedProvince] = useState<ProvinceInfo | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newProvName, setNewProvName] = useState("");
  const [newProvCode, setNewProvCode] = useState("");
  const [newProvRegion, setNewProvRegion] = useState<"Bắc" | "Trung" | "Nam">("Bắc");
  const [newProvDesc, setNewProvDesc] = useState("");

  const isAdmin = userRole === "admin" || userRole === "super_admin" || userRole === "system_owner";

  useEffect(() => {
    // Subscribe to system data to aggregate real statistics
    const unsubAthletes = subscribeToVscSystemAthletes((data) => {
      setMasterAthletes(data || []);
    });

    const unsubClubs = subscribeToVscSystemClubs((data) => {
      setMasterClubs(data || []);
    });

    const unsubTournaments = subscribeToTournamentsList((data) => {
      setTournaments(data || []);
    });

    const unsubProvinces = subscribeToVscSystemProvinces((data) => {
      if (data && data.length > 0) {
        setProvinces(data);
      } else {
        // Seed default provinces in Firestore so they are stored directly on the Store
        DEFAULT_PROVINCES.forEach((p) => {
          saveVscSystemProvince(p.provinceId, p);
        });
        setProvinces(DEFAULT_PROVINCES);
      }
    });

    return () => {
      unsubAthletes();
      unsubClubs();
      unsubTournaments();
      unsubProvinces();
    };
  }, []);

  const handleAddProvince = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProvName.trim() || !newProvCode.trim()) return;

    const newProv: ProvinceInfo = {
      provinceId: `PV-${Date.now()}`,
      name: newProvName.trim(),
      code: newProvCode.trim(),
      region: newProvRegion,
      status: "active",
      description: newProvDesc.trim()
    };

    await saveVscSystemProvince(newProv.provinceId, newProv);
    setShowAddModal(false);
    
    // Clear form
    setNewProvName("");
    setNewProvCode("");
    setNewProvRegion("Bắc");
    setNewProvDesc("");
  };

  const toggleProvinceStatus = async (provId: string) => {
    const target = provinces.find(p => p.provinceId === provId);
    if (target) {
      const updatedTarget = {
        ...target,
        status: (target.status === "active" ? "inactive" : "active") as "active" | "inactive"
      };
      await saveVscSystemProvince(provId, updatedTarget);
      if (selectedProvince && selectedProvince.provinceId === provId) {
        setSelectedProvince(updatedTarget);
      }
    }
  };

  // Filter provinces
  const filteredProvinces = provinces.filter(prov => {
    const matchesSearch = prov.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          prov.code.includes(searchQuery);
    const matchesRegion = regionFilter === "all" || prov.region === regionFilter;
    return matchesSearch && matchesRegion;
  });

  // Aggregated data per province for list view
  const getProvinceStats = (provName: string) => {
    const athletesCount = masterAthletes.filter(ath => 
      (ath.province || "").trim().toLowerCase() === provName.trim().toLowerCase()
    ).length;

    const clubsCount = masterClubs.filter(club => 
      (club.province || "").trim().toLowerCase() === provName.trim().toLowerCase()
    ).length;

    // Get competition history involving this province
    const provinceTournaments = tournaments.filter(tour => {
      // tournament itself is hosted in province OR has athletes/clubs from this province
      const inLoc = (tour.location || "").trim().toLowerCase().includes(provName.trim().toLowerCase());
      const hasAthletes = (tour.athletes || []).some((a: any) => 
        (a.province || "").trim().toLowerCase() === provName.trim().toLowerCase()
      );
      return inLoc || hasAthletes;
    });

    return {
      athletesCount,
      clubsCount,
      tournamentsCount: provinceTournaments.length
    };
  };

  // Get detail list for active selected province
  const provinceAthletes = selectedProvince 
    ? masterAthletes.filter(ath => (ath.province || "").trim().toLowerCase() === selectedProvince.name.trim().toLowerCase())
    : [];

  const provinceClubs = selectedProvince 
    ? masterClubs.filter(club => (club.province || "").trim().toLowerCase() === selectedProvince.name.trim().toLowerCase())
    : [];

  const provinceHistory = selectedProvince 
    ? tournaments.filter(tour => {
        const inLoc = (tour.location || "").trim().toLowerCase().includes(selectedProvince.name.trim().toLowerCase());
        const hasAth = (tour.athletes || []).some((a: any) => 
          (a.province || "").trim().toLowerCase() === selectedProvince.name.trim().toLowerCase()
        );
        return inLoc || hasAth;
      })
    : [];

  return (
    <div className="space-y-6 font-sans">
      {/* Upper Status/Heading Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-rose-500 to-indigo-600 rounded-2xl text-white shadow-md shadow-indigo-600/10">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold uppercase tracking-widest font-mono">VSC PLATFORM V3.0</span>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Quản lý Tỉnh/Thành (Provinces Registry)</h1>
          </div>
        </div>
        
        {isAdmin && !selectedProvince && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-indigo-600/15 transition-all flex items-center gap-2 self-stretch md:self-auto justify-center cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Thêm Tỉnh/Thành mới
          </button>
        )}
        
        {selectedProvince && (
          <button
            onClick={() => setSelectedProvince(null)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-250 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!selectedProvince ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm kiếm Tỉnh/Thành (Tên, Mã Tỉnh)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800 dark:text-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 dark:text-white rounded-lg focus:outline-none"
                >
                  <option value="all">Tất cả khu vực</option>
                  <option value="Bắc">Miền Bắc</option>
                  <option value="Trung">Miền Trung</option>
                  <option value="Nam">Miền Nam</option>
                </select>
              </div>
            </div>

            {/* Grid list of provinces */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredProvinces.map((prov) => {
                const stats = getProvinceStats(prov.name);
                const regionColors: any = {
                  "Bắc": "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30",
                  "Trung": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30",
                  "Nam": "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
                };

                return (
                  <div 
                    key={prov.provinceId}
                    className={`bg-white dark:bg-slate-900 border ${prov.status === "active" ? "border-slate-200 dark:border-slate-800" : "border-slate-200 dark:border-slate-800 opacity-60"} rounded-2xl p-5 hover:border-indigo-500 dark:hover:border-indigo-550 transition-all flex flex-col justify-between gap-5 relative group shadow-sm`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-[10px] font-black font-mono px-2.5 py-0.5 rounded-md border ${regionColors[prov.region]}`}>
                          Khu vực: {prov.region}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold font-mono text-slate-400 uppercase">Mã: {prov.code}</span>
                          <span className={`w-2 h-2 rounded-full ${prov.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          Tỉnh {prov.name}
                        </h3>
                        {prov.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1.5">
                            {prov.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Stats Summary Panel */}
                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 dark:border-slate-800 text-center font-mono">
                      <div>
                        <span className="text-xs text-slate-400 font-bold uppercase block text-[9px] tracking-wider">Xạ Thủ</span>
                        <span className="text-sm font-black text-slate-800 dark:text-slate-200">{stats.athletesCount}</span>
                      </div>
                      <div className="border-x border-slate-100 dark:border-slate-800">
                        <span className="text-xs text-slate-400 font-bold uppercase block text-[9px] tracking-wider">CLB</span>
                        <span className="text-sm font-black text-slate-800 dark:text-slate-200">{stats.clubsCount}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 font-bold uppercase block text-[9px] tracking-wider">Giải Đấu</span>
                        <span className="text-sm font-black text-slate-800 dark:text-slate-200">{stats.tournamentsCount}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      {isAdmin ? (
                        <button
                          onClick={() => toggleProvinceStatus(prov.provinceId)}
                          className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all border ${
                            prov.status === "active" 
                              ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30" 
                              : "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
                          }`}
                        >
                          {prov.status === "active" ? "Khóa" : "Kích hoạt"}
                        </button>
                      ) : (
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${
                          prov.status === "active"
                            ? "bg-emerald-50/50 border-emerald-100 text-emerald-500/80 dark:bg-emerald-950/10 dark:text-emerald-500/70 dark:border-emerald-950/20"
                            : "bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-950/15 dark:text-slate-500 dark:border-slate-850"
                        }`}>
                          {prov.status === "active" ? "Hoạt động" : "Đã khóa"}
                        </span>
                      )}
                      
                      <button
                        onClick={() => setSelectedProvince(prov)}
                        className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-750 text-white font-black text-[10px] uppercase tracking-wide rounded-lg transition-all active:scale-95 cursor-pointer"
                      >
                        Chi tiết hồ sơ
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="details"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left Column: Province Profiler */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950 text-indigo-650 dark:text-indigo-400 flex items-center justify-center">
                  <MapPin className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase">Tỉnh {selectedProvince.name}</h2>
                    <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 rounded font-black text-slate-650">Mã: {selectedProvince.code}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Cơ sở dữ liệu liên kết và hồ sơ vận động viên địa phương.</p>
                </div>
              </div>

              {/* Identity Matrix */}
              <div className="border-t border-slate-150 dark:border-slate-800 pt-4 space-y-3 font-medium text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-450">Khu vực địa lý:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedProvince.region}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-450">Trạng thái vận hành:</span>
                  <span className={`font-bold font-mono uppercase ${selectedProvince.status === "active" ? "text-emerald-500" : "text-slate-400"}`}>
                    {selectedProvince.status === "active" ? "Hoạt động" : "Không hoạt động"}
                  </span>
                </div>
                {selectedProvince.description && (
                  <div className="space-y-1">
                    <span className="text-slate-450 block">Mô tả/Vị thế:</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      {selectedProvince.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Statistics Highlights */}
              <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl space-y-3 border border-slate-150 dark:border-slate-850">
                <h4 className="text-[10px] font-black uppercase text-indigo-650 dark:text-indigo-400 tracking-wider">Tổng quan thành tích địa phương</h4>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] text-slate-450 block uppercase font-bold tracking-wide">Tổng số VĐV</span>
                    <span className="text-lg font-black text-slate-800 dark:text-slate-200">{provinceAthletes.length}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] text-slate-450 block uppercase font-bold tracking-wide">Số Câu lạc bộ</span>
                    <span className="text-lg font-black text-slate-800 dark:text-slate-200">{provinceClubs.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Linked Registries & History tabs */}
            <div className="lg:col-span-2 space-y-6">
              {/* Tabs list inside detail card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-6">
                
                {/* 1. Clubs Registry Section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-900 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Building className="w-4 h-4 text-indigo-500" />
                    Danh sách câu lạc bộ thuộc Tỉnh ({provinceClubs.length})
                  </h3>
                  
                  {provinceClubs.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">Chưa có câu lạc bộ nào đăng ký hoạt động tại địa phương này.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {provinceClubs.map((club) => (
                        <div key={club.clubId} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850">
                          <img 
                            src={club.logo || club.logoUrl || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809"} 
                            alt={club.clubName} 
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{club.clubName}</h4>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {club.clubId}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Athletes Registry Section */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-black text-slate-900 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Users className="w-4 h-4 text-emerald-500" />
                    Danh sách vận động viên thuộc Tỉnh ({provinceAthletes.length})
                  </h3>
                  
                  {provinceAthletes.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">Chưa có vận động viên nào đăng ký địa chỉ thường trú tại địa phương này.</p>
                  ) : (
                    <div className="max-h-[240px] overflow-y-auto pr-2 space-y-2">
                      {provinceAthletes.map((ath) => (
                        <div key={ath.id} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850 text-xs font-medium">
                          <div className="flex items-center gap-3">
                            <img 
                              src={ath.avatarUrl || (ath.gender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE)} 
                              alt={ath.fullName} 
                              className="w-8 h-8 rounded-full object-cover border border-slate-200"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200">{ath.fullName}</p>
                              <span className="text-[10px] text-slate-450 font-mono">Biệt danh: {ath.nickname || "Không"}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 px-2 py-0.5 rounded font-black">{ath.vscNumber || `VSC-${ath.id}`}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Competition History Section */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-black text-slate-900 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Calendar className="w-4 h-4 text-rose-500" />
                    Lịch sử thi đấu giải đấu thuộc địa bàn / có xạ thủ tỉnh tham gia ({provinceHistory.length})
                  </h3>
                  
                  {provinceHistory.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">Chưa phát hiện lịch sử tham gia thi đấu nào của địa phương này.</p>
                  ) : (
                    <div className="space-y-2">
                      {provinceHistory.map((tour) => (
                        <div key={tour.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850 flex justify-between items-center text-xs">
                          <div className="space-y-1">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200">{tour.tournamentName}</h4>
                            <div className="flex gap-3 text-[10px] text-slate-400">
                              <span>Mùa giải: {tour.season}</span>
                              <span>Địa điểm: {tour.location}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono uppercase">
                            {tour.status === "completed" ? "Hoàn thành" : "Đang chạy"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Province Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4"
          >
            <h3 className="text-base font-extrabold text-slate-950 dark:text-white uppercase tracking-tight">Thêm Tỉnh/Thành Mới</h3>
            <form onSubmit={handleAddProvince} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Tên Tỉnh/Thành *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nghệ An"
                  value={newProvName}
                  onChange={(e) => setNewProvName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Mã Tỉnh (Mã Vùng) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 37"
                    value={newProvCode}
                    onChange={(e) => setNewProvCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Khu vực *</label>
                  <select
                    value={newProvRegion}
                    onChange={(e) => setNewProvRegion(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
                  >
                    <option value="Bắc">Miền Bắc</option>
                    <option value="Trung">Miền Trung</option>
                    <option value="Nam">Miền Nam</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Mô tả đặc điểm (Tùy chọn)</label>
                <textarea
                  placeholder="Mô tả phong trào ná cao su tại địa phương..."
                  value={newProvDesc}
                  onChange={(e) => setNewProvDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-650 hover:bg-indigo-750 text-white rounded-lg font-bold"
                >
                  Xác nhận lưu
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
