import React, { useState } from "react";
import { 
  auth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  googleProvider 
} from "../firebase";
import { createUserProfile } from "../lib/firebaseService";
import { LogIn, Key, Mail, UserPlus, X, User, Heart, ShieldAlert } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        // Register new user
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await createUserProfile(
          credential.user.uid,
          credential.user.email || "",
          displayName || email.split("@")[0],
          ""
        );
      } else {
        // Login existing user
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      let VietnameseError = "Đã xảy ra lỗi khi đăng nhập. Vui lòng xác thực lại.";
      if (err.code === "auth/email-already-in-use") {
        VietnameseError = "Email này đã được sử dụng bởi một tài khoản khác.";
      } else if (err.code === "auth/weak-password") {
        VietnameseError = "Mật khẩu yếu, tối thiểu phải từ 6 ký tự.";
      } else if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        VietnameseError = "Tài khoản hoặc mật khẩu không chính xác.";
      } else if (err.code === "auth/invalid-email") {
        VietnameseError = "Địa chỉ email không đúng định dạng.";
      }
      setError(VietnameseError);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError("");
    setLoading(true);
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      await createUserProfile(
        credential.user.uid,
        credential.user.email || "",
        credential.user.displayName || credential.user.email?.split("@")[0] || "",
        credential.user.photoURL || ""
      );
      onClose();
    } catch (err: any) {
      console.error(err);
      const errCode = err?.code || "";
      const errMessage = err?.message || "";
      if (errCode === "auth/internal-error" || errCode.includes("unsupported") || errMessage.includes("internal-error") || errMessage.includes("storage")) {
        setError(
          "Lỗi đăng nhập Google (do chính sách chặn cookie bên thứ ba trong iframe/sandbox của trình duyệt). Vui lòng nhấn vào nút 'Mở trong tab mới' (ở góc trên bên phải thanh công cụ của AI Studio) để mở ứng dụng ở tab riêng biệt và đăng nhập lại bằng Google, hoặc bạn có thể đăng ký/đăng nhập tài khoản mới bằng Email/Mật khẩu ngay trên giao diện này!"
        );
      } else {
        setError(`Đăng nhập bằng Google không thành công hoặc bị huỷ. (${err?.message || err})`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] text-slate-800 dark:text-slate-100"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 dark:border-slate-800 p-6 relative flex flex-col gap-4 animate-scaleUp text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          title="Đóng"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex flex-col gap-1.5 mt-2">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500 animate-pulse" />
            <span className="font-sans font-black text-xs uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
              VSC Cloud Sync
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-sans tracking-tight">
            {isRegister ? "Đăng Ký Tài Khoản" : "Đăng Nhập Đồng Bộ"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans mt-0.5">
            {isRegister 
              ? "Tạo tài khoản để trực tuyến lưu trữ, quản lý giải đấu và chia sẻ bảng điểm online."
              : "Đăng nhập để chia sẻ bảng điểm thời gian thực, phân quyền trọng tài và xem trực tiếp."}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleEmailAuth} className="flex flex-col gap-3 font-sans">
          {isRegister && (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Tên hiển thị</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: trọng tài Tuấn"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-9.5 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Email của bạn</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
              <input
                type="email"
                required
                placeholder="email@vidu.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9.5 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-800 dark:text-slate-101"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Mật khẩu</label>
            <div className="relative">
              <Key className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
              <input
                type="password"
                required
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9.5 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-800 dark:text-slate-101"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 rounded-xl p-3 text-xs leading-relaxed border border-rose-100 dark:border-rose-900/30">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-98 disabled:opacity-50 disabled:pointer-events-none cursor-pointer mt-1"
          >
            {isRegister ? <UserPlus className="w-4.5 h-4.5" /> : <LogIn className="w-4.5 h-4.5" />}
            {isRegister ? "Đăng ký thành viên" : "Đăng nhập ngay"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-2 my-1 text-slate-400 text-xs font-sans">
          <div className="grow border-t border-slate-200 dark:border-slate-800"></div>
          <span>hoặc đăng nhập bằng</span>
          <div className="grow border-t border-slate-200 dark:border-slate-800"></div>
        </div>

        {/* Google Authentication */}
        <button
          onClick={handleGoogleAuth}
          disabled={loading}
          type="button"
          className="w-full py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98 disabled:opacity-50"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google Account
        </button>

        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center leading-normal max-w-xs mx-auto">
          * Lưu ý: Nếu nút đăng nhập Google bị lỗi (auth/internal-error) do trình duyệt chặn cookie bên thứ ba trong iframe, vui lòng mở ứng dụng ở <strong>Mở trong tab mới</strong> hoặc dùng tính năng đăng ký/đăng nhập Email/Mật khẩu ở trên.
        </p>

        {/* Toggle between Register & Login */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400 font-sans mt-1">
          {isRegister ? (
            <span>
              Đã có tài khoản?{" "}
              <button 
                onClick={() => setIsRegister(false)}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
              >
                Đăng nhập ngay
              </button>
            </span>
          ) : (
            <span>
              Chưa có tài khoản?{" "}
              <button 
                onClick={() => setIsRegister(true)}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
              >
                Tạo tài khoản mới
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
