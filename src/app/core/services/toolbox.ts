import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal, effect } from '@angular/core';

export type AppTheme = 'dark' | 'light';

@Injectable({
  providedIn: 'root',
})
export class ToolboxService {
  private document = inject(DOCUMENT);
  
  // Theme state signal
  public theme = signal<AppTheme>('dark');
  
  // Favorites list signal
  public favorites = signal<string[]>([]);
  
  // Recently used tool slugs signal
  public recentlyUsed = signal<string[]>([]);

  constructor() {
    this.hydrateFromStorage();

    // Effect to auto-apply theme changes to document DOM element
    effect(() => {
      const activeTheme = this.theme();
      try {
        const root = this.document.documentElement;
        if (activeTheme === 'dark') {
          root.classList.add('dark');
          root.classList.remove('light');
          root.style.colorScheme = 'dark';
        } else {
          root.classList.remove('dark');
          root.classList.add('light');
          root.style.colorScheme = 'light';
        }
      } catch {
        // safe for initial SSR compilation pass
      }
    });
  }

  /**
   * Safe hydration of Client layout properties
   */
  private hydrateFromStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Hydrate Theme
        const storedTheme = window.localStorage.getItem('devsight-theme') as AppTheme | null;
        if (storedTheme) {
          this.theme.set(storedTheme);
        } else {
          // Default to Dark Mode as it is highly preferred by developers, matching our clean aesthetics
          this.theme.set('dark');
        }

        // Hydrate Favorites
        const storedFavs = window.localStorage.getItem('devsight-favorites');
        if (storedFavs) {
          this.favorites.set(JSON.parse(storedFavs));
        }

        // Hydrate Recents
        const storedRecents = window.localStorage.getItem('devsight-recents');
        if (storedRecents) {
          this.recentlyUsed.set(JSON.parse(storedRecents));
        }
      }
    } catch {
      // safe during SSR
    }
  }

  /**
   * Rotate active dark / light modes
   */
  public toggleTheme(): void {
    const nextTheme: AppTheme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(nextTheme);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('devsight-theme', nextTheme);
      }
    } catch {
      // safe write
    }
  }

  /**
   * Toggle bookmark state for a specific tool ID
   */
  public toggleFavorite(toolId: string): void {
    this.favorites.update((current) => {
      let updated: string[];
      if (current.includes(toolId)) {
        updated = current.filter((id) => id !== toolId);
      } else {
        updated = [...current, toolId];
      }

      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('devsight-favorites', JSON.stringify(updated));
        }
      } catch {
        // safe write
      }
      return updated;
    });
  }

  /**
   * Mark a tool as active to include in recently used listings
   */
  public recordUsage(toolSlug: string): void {
    this.recentlyUsed.update((current) => {
      // Filter out existing occurrence to move it to the front
      const cleanList = current.filter((slug) => slug !== toolSlug);
      const updated = [toolSlug, ...cleanList].slice(0, 5); // Limit to top 5 recent

      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('devsight-recents', JSON.stringify(updated));
        }
      } catch {
        // safe write
      }
      return updated;
    });
  }
}
