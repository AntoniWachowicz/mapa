/**
 * Async Error Handler Utility
 * Provides standardized error handling for async operations.
 */

export interface AsyncOperationOptions {
  /** Custom error message to show to user */
  errorMessage?: string;
  /** Whether to log errors to console (default: true) */
  logErrors?: boolean;
  /** Error context for logging (e.g., 'Import', 'Export') */
  errorContext?: string;
  /** Callback to run in finally block */
  onFinally?: () => void;
  /** Whether to show alert on error (default: true) */
  showAlert?: boolean;
  /** Whether to suppress AbortError handling (default: false) */
  suppressAbortError?: boolean;
}

/**
 * Execute an async operation with standardized error handling
 * Handles AbortError, logs errors, shows user alerts, and runs cleanup
 */
export async function executeAsyncOperation<T>(
  operation: () => Promise<T>,
  options: AsyncOperationOptions = {}
): Promise<T | null> {
  const {
    errorMessage = 'Wystąpił błąd',
    logErrors = true,
    errorContext = 'Operation',
    onFinally,
    showAlert = true,
    suppressAbortError = false
  } = options;

  try {
    return await operation();
  } catch (error: any) {
    // Handle abort errors (user cancellation)
    if (error.name === 'AbortError') {
      if (!suppressAbortError && logErrors) {
        console.log(`${errorContext} cancelled by user`);
      }
      return null;
    }

    // Log error
    if (logErrors) {
      console.error(`${errorContext} error:`, error);
    }

    // Show user notification
    if (showAlert) {
      const message = error instanceof Error ? error.message : errorMessage;
      alert(message);
    }

    return null;
  } finally {
    if (onFinally) {
      onFinally();
    }
  }
}

/**
 * Format error message for user display
 * Extracts message from Error object or uses default
 */
export function formatErrorMessage(error: unknown, defaultMessage: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  return defaultMessage;
}

/**
 * Handle async error with logging and user notification
 * Use when you want manual control over the try-catch but consistent error handling
 */
export function handleAsyncError(
  error: unknown,
  errorContext: string,
  userMessage: string,
  options: { showAlert?: boolean; logError?: boolean } = {}
): void {
  const { showAlert = true, logError = true } = options;

  // Skip AbortErrors silently
  if ((error as any)?.name === 'AbortError') {
    if (logError) {
      console.log(`${errorContext} cancelled by user`);
    }
    return;
  }

  // Log error
  if (logError) {
    console.error(`${errorContext} error:`, error);
  }

  // Show user notification
  if (showAlert) {
    const message = formatErrorMessage(error, userMessage);
    alert(message);
  }
}
