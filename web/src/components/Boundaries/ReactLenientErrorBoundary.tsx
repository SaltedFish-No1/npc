import { Component, ErrorInfo, ReactNode } from 'react';
import { toast } from 'sonner';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class ReactLenientErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

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
