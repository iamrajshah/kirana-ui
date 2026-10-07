// Notification Service using custom event system for Ionic Toast
// This service emits events that are caught by the ToastContainer component

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export const apiErrorMessage = (error: unknown, fallback: string, includeDirectMessage = false): string => {
  if (includeDirectMessage && typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const value = error as { data?: unknown; message?: unknown };
    if (value.data && typeof value.data === 'object' && 'message' in value.data) {
      const message = (value.data as { message?: unknown }).message;
      if (typeof message === 'string' && message) return message;
    }
    if (includeDirectMessage && typeof value.message === 'string' && value.message) return value.message;
  }
  return fallback;
};

class NotificationService {
  private toastEvent = new EventTarget();
  private toastCounter = 0;

  /**
   * Subscribe to toast notifications
   */
  subscribe(callback: (toast: ToastMessage) => void) {
    const handler = (event: Event) => {
      callback((event as CustomEvent<ToastMessage>).detail);
    };
    this.toastEvent.addEventListener('toast', handler);
    return () => this.toastEvent.removeEventListener('toast', handler);
  }

  /**
   * Emit a toast notification
   */
  private emit(type: ToastType, message: string, duration?: number) {
    const toast: ToastMessage = {
      id: `toast-${++this.toastCounter}-${Date.now()}`,
      type,
      message,
      duration,
    };
    this.toastEvent.dispatchEvent(new CustomEvent('toast', { detail: toast }));
  }

  /**
   * Show success notification
   */
  success(message: string, duration = 3000) {
    this.emit('success', message, duration);
  }

  /**
   * Show error notification
   */
  error(message: string, duration = 4000) {
    this.emit('error', message, duration);
  }

  /**
   * Show info notification
   */
  info(message: string, duration = 3000) {
    this.emit('info', message, duration);
  }

  /**
   * Show warning notification
   */
  warning(message: string, duration = 3500) {
    this.emit('warning', message, duration);
  }

  /**
   * Handle API error and show appropriate message
   */
  handleApiError(error: unknown) {
    this.error(apiErrorMessage(error, 'An error occurred. Please try again.', true));
  }
}

export const notificationService = new NotificationService();
export default notificationService;
