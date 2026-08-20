import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertOctagon, RotateCcw, ShieldAlert, FileText } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error inside boundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    try {
      if (typeof indexedDB !== "undefined") {
        indexedDB.deleteDatabase("SlingshotDeviceStorage");
      }
    } catch (e) {
      console.warn(e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let isPermissionError = false;
      let parsedInfo: any = null;

      if (this.state.error?.message) {
        try {
          if (this.state.error.message.includes("{") && this.state.error.message.includes("}")) {
            const start = this.state.error.message.indexOf("{");
            const end = this.state.error.message.lastIndexOf("}") + 1;
            const jsonStr = this.state.error.message.substring(start, end);
            parsedInfo = JSON.parse(jsonStr);
            isPermissionError = parsedInfo.code === "permission-denied";
          }
        } catch (e) {
          // ignore parsing issues
        }
      }

      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
          <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 flex flex-col items-center text-center">
            {isPermissionError ? (
              <div className="p-4 rounded-full bg-rose-50 text-rose-600 mb-6 border border-rose-100">
                <ShieldAlert className="w-12 h-12" />
              </div>
            ) : (
              <div className="p-4 rounded-full bg-amber-50 text-amber-600 mb-6 border border-amber-100">
                <AlertOctagon className="w-12 h-12" />
              </div>
            )}

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {isPermissionError ? "Truy cập bị từ chối" : "Đã xảy ra sự cố ngoài ý muốn"}
            </h1>

            <p className="text-slate-500 mt-2 text-sm max-w-md">
              {isPermissionError
                ? "Tài khoản của bạn không có đủ quyền thực hiện hành động này. Vui lòng liên hệ Trọng tài trưởng hoặc Trưởng ban tổ chức."
                : "Hệ thống gặp lỗi nghiêm trọng trong lúc xử lý thành phần hiển thị giao diện."}
            </p>

            {/* Diagnostic Box */}
            <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 mt-6 text-left font-mono text-xs text-slate-700 max-h-48 overflow-y-auto">
              <div className="flex items-center gap-2 text-slate-900 font-semibold mb-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Thông tin chẩn đoán:</span>
              </div>
              {parsedInfo ? (
                <pre className="whitespace-pre-wrap">{JSON.stringify(parsedInfo, null, 2)}</pre>
              ) : (
                <div className="space-y-1">
                  <p className="font-semibold text-rose-600">{this.state.error?.name}: {this.state.error?.message}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="text-slate-400 mt-2 leading-relaxed whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full mt-8">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-colors text-sm"
              >
                Tải lại trang
              </button>
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition-all text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset ứng dụng (Clear cache)</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
