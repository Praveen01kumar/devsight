import { ChangeDetectionStrategy, Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { STATIC_PAGES } from '../../constants/constant';
import { SeoService } from '../../core/services/seo';

@Component({
  selector: 'app-static-page',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8 max-w-3xl mx-auto text-left select-text leading-relaxed font-sans">
      @if (pageData()) {
        <!-- Content Header -->
        <div class="space-y-3 pb-6 border-b border-zinc-150 dark:border-zinc-850">
          <nav class="flex items-center gap-2 font-mono text-[10px] text-zinc-500 font-semibold select-none">
            <a routerLink="/" class="hover:text-zinc-900 dark:hover:text-zinc-300">HOME</a>
            <span>&bull;</span>
            <span class="text-zinc-650 dark:text-zinc-400">INFO: {{ pageData()?.title | uppercase }}</span>
          </nav>
          
          <h1 class="text-3xl md:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            {{ pageData()?.title }}
          </h1>
          <div class="text-[11px] font-mono text-zinc-500">
            Last updated: {{ pageData()?.lastUpdated }} &bull; 100% Secure Node Safe
          </div>
        </div>

        <!-- Render Segments Sections -->
        <article class="space-y-8 select-text text-sm text-zinc-700 dark:text-zinc-350">
          @for (sec of pageData()?.sections; track sec.heading) {
            <div class="space-y-3">
              @if (sec.heading) {
                <h2 class="text-lg md:text-xl font-bold text-zinc-900 dark:text-white tracking-wide font-sans mt-6">
                  {{ sec.heading }}
                </h2>
              }
              <p class="leading-relaxed select-text font-serif text-zinc-600 dark:text-zinc-400 text-sm whitespace-pre-wrap" [innerHTML]="sec.content"></p>
            </div>
          }
        </article>

        <!-- Quick back button panel -->
        <div class="pt-8 border-t border-zinc-150 dark:border-zinc-850 text-center select-none">
          <button routerLink="/" class="px-5 py-2.5 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-205 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 rounded-xl transition">
            &larr; RETURN TO LANDING TOOLS
          </button>
        </div>
      } @else {
        <!-- 404 block -->
        <div class="p-12 text-center space-y-3 max-w-sm mx-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900/60 font-mono shadow-sm">
          <mat-icon class="text-4xl text-rose-455">warning</mat-icon>
          <p class="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">Information Page Not Found</p>
          <button routerLink="/" class="px-4 py-2 border border-zinc-150 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs rounded-xl font-bold text-zinc-700 dark:text-zinc-300 transition">
            &larr; BACK TO SAFETY
          </button>
        </div>
      }
    </div>
  `
})
export class StaticPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly seoService = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);

  public pageData = signal<typeof STATIC_PAGES['about'] | null>(null);

  ngOnInit(): void {
    // Audit current activated route path key
    this.route.url
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const path = this.route.snapshot.routeConfig?.path || '';
        let key = 'about';
        if (path.includes('privacy')) key = 'privacy';
        else if (path.includes('contact')) key = 'contact';
        else if (path.includes('terms')) key = 'terms';
        else if (path.includes('faq')) key = 'faq';

        const match = STATIC_PAGES[key];
        
        if (match) {
          this.pageData.set(match);

          // Update SEO service
          this.seoService.updateMetadata({
            title: match.metaTitle,
            description: match.metaDescription,
            slug: `/${path}`,
            breadcrumbs: [
              { name: "Home", url: "/" },
              { name: match.title, url: `/${path}` }
            ]
          });
        } else {
          this.pageData.set(null);
        }
      });
  }
}
