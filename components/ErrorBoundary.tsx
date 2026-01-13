import React, { ReactNode, ErrorInfo } from 'react';

// FIX: Renamed generic 'Props' and 'State' to be more specific to avoid potential naming conflicts.
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
          <div className="w-full max-w-lg p-8 text-center bg-gray-800 rounded-lg shadow-lg border border-red-500/30">
            <h1 className="text-2xl font-bold text-red-400 mb-2">서비스 접속 오류</h1>
            <p className="text-sm text-gray-400 mb-4">(Service Connection Error)</p>
            
            <p className="text-gray-300 mb-2">
              애플리케이션을 시작하는 중 예기치 않은 오류가 발생했습니다.
              <br/>
              현재 YouTube API 규정 준수 검토로 인해 서비스가 일시적으로 정지되었을 수 있습니다.
            </p>
            <p className="text-xs text-gray-500 mb-6">
              (An unexpected error occurred while starting the application. The service may be temporarily suspended due to a YouTube API compliance review.)
            </p>

            <p className="text-gray-400 text-sm mb-1">
              문제가 지속될 경우, 관리자에게 문의해주시기 바랍니다.
            </p>
            <p className="text-xs text-gray-500 mb-4">
              (If the problem persists, please contact the administrator.)
            </p>

            <a href="mailto:8friend8ship@hanmail.net" className="mt-4 inline-block text-blue-400 hover:text-blue-300">
              관리자 이메일 (Administrator Email): 8friend8ship@hanmail.net
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
