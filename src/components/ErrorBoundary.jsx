import { Component } from 'react'

/**
 * Top-level error boundary.
 *
 * A render crash anywhere in the tree would otherwise blank the whole app and
 * leave the user with no clue what happened. This catches the error, tells the
 * user their saved data is untouched, and offers a reload.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Surfaced in the browser console so it can be reported.
    console.error('App crashed:', error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="onboarding">
        <div className="onboarding__card">
          <div className="onboarding__hero">
            <span className="onboarding__badge">⚡ AI Fitness Coach</span>
            <h1>Something went wrong</h1>
            <p>
              The app hit an unexpected error. Your profile, plan and history are still saved in
              this browser, so reloading is safe.
            </p>
          </div>

          <p className="alert alert--error">{error.message || 'Unexpected error'}</p>

          <div className="onboarding__actions">
            <button type="button" className="button button--primary" onClick={this.handleReload}>
              Reload the app
            </button>
          </div>
        </div>
      </div>
    )
  }
}
