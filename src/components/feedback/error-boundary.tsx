"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  message?: string;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Unhandled UI error:", error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, message: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="mx-auto w-full max-w-lg">
          <CardHeader className="space-y-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangleIcon className="size-5 text-destructive" aria-hidden="true" />
            </div>
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription>
              {this.state.message ?? "An unexpected error occurred. Please try again."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={this.handleReset}>Try again</Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
