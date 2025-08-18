import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Adicionando logs mais detalhados para diagnóstico
    console.log("--- ERROR BOUNDARY CAUGHT AN ERROR ---");
    console.error("ErrorBoundary -> error:", error);
    console.error("ErrorBoundary -> errorInfo:", errorInfo);
    console.log("--- END OF ERROR BOUNDARY ---");
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h1>Something went wrong.</h1>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            <pre>{this.state.error && this.state.error.stack}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
