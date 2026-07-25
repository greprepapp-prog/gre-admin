import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Dashboard render error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">This section failed to render.</p>
            <p className="mt-1 text-xs text-red-600">{this.state.error.message}</p>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="mt-2 rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
