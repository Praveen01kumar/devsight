import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ViewerController {
  zoom = signal<number>(1);
  panX = signal<number>(0);
  panY = signal<number>(0);
  isFullscreen = signal<boolean>(false);
  theme = signal<'dark' | 'light'>('dark');

  // Zoom control limits
  readonly minZoom = 0.05;
  readonly maxZoom = 40;

  zoomIn() {
    this.zoom.update((z:number) => Math.min(this.maxZoom, z * 1.25));
  }

  zoomOut() {
    this.zoom.update((z:number) => Math.max(this.minZoom, z * 0.8));
  }

  resetView() {
    this.zoom.set(1);
    this.panX.set(0);
    this.panY.set(0);
  }

  setZoom(value: number) {
    this.zoom.set(Math.max(this.minZoom, Math.min(this.maxZoom, value)));
  }

  pan(dx: number, dy: number) {
    this.panX.update((x) => x + dx);
    this.panY.update((y) => y + dy);
  }

  setPan(x: number, y: number) {
    this.panX.set(x);
    this.panY.set(y);
  }

  toggleTheme() {
    this.theme.update((t) => (t === 'light' ? 'dark' : 'light'));
  }

  toggleFullscreen(element?: HTMLElement) {
    if (!document.fullscreenElement) {
      const target = element || document.documentElement;
      target.requestFullscreen().then(() => {
        this.isFullscreen.set(true);
      }).catch((err) => {
        console.error('Error enabling fullscreen root element:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        this.isFullscreen.set(false);
      }).catch((err) => {
        console.error('Error exiting fullscreen:', err);
      });
    }
  }

  fitToScreen(containerWidth: number, containerHeight: number, svgWidth: number, svgHeight: number) {
    if (!svgWidth || !svgHeight || !containerWidth || !containerHeight) return;

    // Put a healthy margin (e.g. 5%)
    const padding = 40;
    const availWidth = containerWidth - padding;
    const availHeight = containerHeight - padding;

    const scaleX = availWidth / svgWidth;
    const scaleY = availHeight / svgHeight;
    const fitScale = Math.min(scaleX, scaleY, 4); // limit extreme upscale if tiny

    this.zoom.set(fitScale);
    // Center it
    const offsetLeft = (containerWidth - svgWidth * fitScale) / 2;
    const offsetTop = (containerHeight - svgHeight * fitScale) / 2;
    this.panX.set(offsetLeft);
    this.panY.set(offsetTop);
  }
}
