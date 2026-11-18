import { Component, effect, inject, signal } from '@angular/core';
import { ToastMessage, ToastService } from '../toast-service';

// Draws the current toast message at the bottom of the screen.
// The timer pauses while the mouse is over the toast or keyboard focus is inside it.
@Component({
  selector: 'app-toast',
  styleUrl: './toast.css',
  templateUrl: './toast.html',
})
export class Toast {
  protected toast = inject(ToastService);
  protected visible = signal(false);

  private timerId: ReturnType<typeof setTimeout> | null = null;
  private remaining = 0;
  private startedAt = 0;
  private persistent = false;
  private hovering = false;
  private focused = false;

  constructor() {
    // Runs every time a new message arrives (or the message is dismissed)
    effect(() => {
      const message = this.toast.current();
      this.stopTimer();
      this.visible.set(false);
      if (!message) return;

      this.remaining = message.duration;
      this.persistent = message.duration === 0;
      this.hovering = false;
      this.focused = false;

      requestAnimationFrame(() => this.visible.set(true)); // lets the slide-in animation play
      this.startTimer();
    });
  }

  private startTimer(): void {
    if (this.persistent || this.timerId !== null) return;
    this.startedAt = Date.now();
    this.timerId = setTimeout(() => this.toast.dismiss(), this.remaining);
  }

  private stopTimer(): void {
    if (this.timerId !== null) clearTimeout(this.timerId);
    this.timerId = null;
  }

  private pauseTimer(): void {
    if (this.timerId === null) return;
    this.stopTimer();
    // always leave a couple of seconds after a pause
    this.remaining = Math.max(this.remaining - (Date.now() - this.startedAt), 2000);
  }

  private syncTimer(): void {
    if (this.hovering || this.focused) this.pauseTimer();
    else this.startTimer();
  }

  protected onHover(isOver: boolean): void {
    this.hovering = isOver;
    this.syncTimer();
  }

  protected onFocusIn(): void {
    this.focused = true;
    this.syncTimer();
  }

  protected onFocusOut(event: FocusEvent, toastElement: HTMLElement): void {
    this.focused = toastElement.contains(event.relatedTarget as Node | null);
    this.syncTimer();
  }

  protected runAction(message: ToastMessage): void {
    const opener = message.opener;
    this.toast.dismiss();
    message.onAction?.(opener);
  }
}
