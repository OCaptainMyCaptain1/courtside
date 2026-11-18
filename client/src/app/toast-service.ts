import { Service, signal } from '@angular/core';

export interface ToastOptions {
  type?: 'success' | 'warning';
  duration?: number;                                 // milliseconds; 0 = stays until closed
  actionLabel?: string;                              // optional button, like "View cart"
  onAction?: (opener: HTMLElement | null) => void;
}

export interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'warning';
  duration: number;
  actionLabel?: string;
  onAction?: (opener: HTMLElement | null) => void;
  opener: HTMLElement | null;   // what had focus when the toast appeared
}

const TOAST_DURATION = 8000;

// Holds the one message currently on screen. The Toast component draws it.
@Service()
export class ToastService {
  readonly current = signal<ToastMessage | null>(null);
  private nextId = 1;

  show(text: string, options: ToastOptions = {}): void {
    this.current.set({
      id: this.nextId++,
      text,
      type: options.type ?? 'success',
      duration: options.duration ?? TOAST_DURATION,
      actionLabel: options.actionLabel,
      onAction: options.onAction,
      opener: document.activeElement as HTMLElement | null
    });
  }

  dismiss(): void {
    this.current.set(null);
  }
}
