import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="absolute inset-0 flex items-center justify-center bg-red-900/80 text-white p-10 z-50">
                    <div className="max-w-xl">
                        <h2 className="text-2xl font-bold mb-4">Simulation Critical Failure</h2>
                        <pre className="bg-black/50 p-4 rounded text-sm overflow-auto">
                            {this.state.error?.message}
                        </pre>
                        <button
                            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 rounded"
                            onClick={() => window.location.reload()}
                        >
                            Reboot System
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
