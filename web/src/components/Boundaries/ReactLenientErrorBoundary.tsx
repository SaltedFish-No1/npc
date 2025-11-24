/**
 * 文件：web/src/components/Boundaries/ReactLenientErrorBoundary.tsx
 * 功能描述：React 宽容错误边界，在UI异常时提示并避免整站崩溃 | Description: Lenient React error boundary that surfaces errors without crashing whole app
 * 作者：NPC 项目组  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖 sonner 通知
 */
import { Component, ErrorInfo, ReactNode } from 'react';
import { toast } from 'sonner';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

/**
 * 错误边界组件：捕获子树异常并显示友好提示
 * Error boundary component: capture subtree errors and display friendly message
 */
export class ReactLenientErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  /**
   * 功能：捕获错误后提示并输出到控制台
   * Description: Notify and log when an error is caught
   */
  componentDidCatch(error: Error, info: ErrorInfo) {
    // Lightweight surface for runtime errors without crashing the entire shell
    toast.error('Something went wrong in the UI. Check console for details.');
    console.error('UI Error Boundary:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, color: '#fca5a5', fontFamily: 'monospace' }}>
          UI crashed. Reload or check logs.
        </div>
      );
    }
    return this.props.children;
  }
}
