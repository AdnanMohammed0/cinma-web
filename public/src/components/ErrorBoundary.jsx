import { Component } from 'react';
import { Link } from 'react-router-dom';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-dark-900 text-white gap-4 p-8">
          <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center">
            <span className="text-2xl">!</span>
          </div>
          <h2 className="text-xl font-bold">Something went wrong</h2>
          <p className="text-sm text-white/40 text-center max-w-md">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Link to="/" className="btn-primary text-sm mt-2" onClick={() => this.setState({ error: null })}>
            Go Home
          </Link>
        </div>
      );
    }
    return this.props.children;
  }
}
