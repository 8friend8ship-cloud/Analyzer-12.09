import * as React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public props: ErrorBoundaryProps;
  public state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'UNKNOWN_FRONTEND_ERROR',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Content OS uncaught frontend error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white p-4">
          <div className="w-full max-w-lg p-8 text-center bg-gray-800 rounded-lg shadow-lg border border-red-500/30">
            <h1 className="text-2xl font-bold text-red-400 mb-2">서비스 접속 오류</h1>
            <p className="text-sm text-gray-400 mb-4">(Frontend Runtime Error)</p>

            <p className="text-gray-300 mb-4">
              Content OS 화면을 불러오는 중 오류가 발생했습니다. 중앙 백엔드 상태와는 별도로 프런트 런타임을 점검해야 합니다.
            </p>

            <div className="text-left bg-gray-900/70 border border-gray-700 rounded-md p-3 mb-5">
              <div className="text-xs text-gray-500 mb-1">ERROR</div>
              <code className="text-xs text-red-300 break-all">{this.state.message}</code>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium"
            >
              다시 불러오기
            </button>

            <p className="text-gray-400 text-sm mt-6 mb-1">문제가 계속되면 관리자에게 문의하세요.</p>
            <a href="mailto:homedesigntaedi@gmail.com" className="inline-block text-blue-400 hover:text-blue-300">
              관리자 이메일: homedesigntaedi@gmail.com
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
