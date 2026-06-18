import React from "react";
import { Box, Typography, Button, Paper } from "@mui/material";
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error("[ErrorBoundary] Caught error:", error);
    console.error("[ErrorBoundary] Error info:", errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Check if it's the specific React hooks error
    if (
      error?.message?.includes("Invalid hook call") ||
      error?.message?.includes("Cannot read properties of null")
    ) {
      console.error(
        "[ErrorBoundary] React hooks error detected - likely HMR or navigation issue"
      );
    }
  }

  handleReset = () => {
    // Clear error state and try to recover
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Reload the page to fully reset React
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
            bgcolor: "background.default",
            p: 3,
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 600,
              textAlign: "center",
            }}
          >
            <ErrorIcon
              sx={{
                fontSize: 64,
                color: "error.main",
                mb: 2,
              }}
            />
            <Typography variant="h4" gutterBottom color="error">
              Oops! Something went wrong
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              The application encountered an unexpected error. This usually
              happens during development when hot module replacement fails.
            </Typography>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <Paper
                sx={{
                  p: 2,
                  mb: 3,
                  bgcolor: "grey.100",
                  textAlign: "left",
                  maxHeight: 200,
                  overflow: "auto",
                }}
              >
                <Typography variant="caption" component="pre" sx={{ m: 0 }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </Typography>
              </Paper>
            )}

            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<RefreshIcon />}
              onClick={this.handleReset}
            >
              Reload Application
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
