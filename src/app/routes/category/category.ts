import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CATEGORIES, TOOLS } from '../../constants/constant';
import { ToolboxService } from '../../core/services/toolbox';
import { SeoService } from '../../core/services/seo';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-category-page',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8 select-text">
      <!-- Category Banner -->
      @if (currentCategory()) {
        <div class="p-6 md:p-8 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl text-left space-y-3 relative overflow-hidden shadow-sm">
          <!-- breadcrumbs -->
          <nav class="flex items-center gap-2 font-mono text-[10px] text-zinc-500 font-semibold select-none flex-wrap">
            <a routerLink="/" class="hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors">HOME</a>
            <span>&bull;</span>
            <span class="text-emerald-650 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-150 dark:border-emerald-500/30 px-2 py-0.5 rounded-md font-bold">CATEGORY: {{ currentCategory()?.name | uppercase }}</span>
          </nav>

          <h1 class="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white leading-tight">
            {{ currentCategory()?.name }} Tools
          </h1>
          <p class="text-xs md:text-sm text-zinc-650 dark:text-zinc-400 max-w-2xl leading-relaxed select-text">
            {{ currentCategory()?.description }}
          </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <!-- Tools Grid list -->
          <div class="lg:col-span-3 space-y-6 text-left">
            <div class="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-800 pb-2">
              <h2 class="text-xs font-mono font-bold tracking-wider text-zinc-500 uppercase">AVAILABLE TOOLS IN THIS CATEGORY</h2>
              <div class="flex items-center bg-zinc-100 dark:bg-zinc-800/40 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800/80">
                <button (click)="isGridView.set(true)" 
                        type="button"
                        [class]="isGridView() ? 'p-1.5 bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 rounded-md shadow-xs flex items-center justify-center transition-all' : 'p-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 rounded-md flex items-center justify-center transition-all'"
                        title="Card View">
                  <mat-icon style="font-size: 16px; width: 16px; height: 16px;" class="leading-none">grid_view</mat-icon>
                </button>
                <button (click)="isGridView.set(false)" 
                        type="button"
                        [class]="!isGridView() ? 'p-1.5 bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 rounded-md shadow-xs flex items-center justify-center transition-all' : 'p-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 rounded-md flex items-center justify-center transition-all'"
                        title="List View">
                  <mat-icon style="font-size: 16px; width: 16px; height: 16px;" class="leading-none">view_list</mat-icon>
                </button>
              </div>
            </div>
            
            @if (categoryTools().length === 0) {
              <div class="p-12 border border-zinc-200 dark:border-zinc-850/60 rounded-2xl bg-white dark:bg-zinc-950/20 text-center text-zinc-500 shadow-sm">
                <mat-icon class="text-3xl text-zinc-300 dark:text-zinc-700 animate-pulse">workspaces</mat-icon>
                <p class="text-xs font-mono font-bold uppercase mt-2">Under Development</p>
                <p class="text-[11px] leading-relaxed mt-1 text-zinc-600 dark:text-zinc-600">More high performance utilities will launch in this bracket shortly.</p>
              </div>
            } @else {
              @if (isGridView()) {
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slideUp">
                  @for (tool of categoryTools(); track tool.id) {
                    <a [routerLink]="[tool.categoryId === 'seo-tools' ? '/seo' : '/tools', tool.slug]" (click)="recordToolClick(tool.slug)" (keydown.enter)="recordToolClick(tool.slug)" tabindex="0" class="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-855 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-2xl shadow-sm transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden text-left block">
                      <div class="space-y-2">
                        <div class="flex items-center justify-between">
                          <div class="p-2 border border-zinc-150 dark:border-zinc-750 bg-zinc-50 dark:bg-zinc-950 text-sky-600 dark:text-sky-400 rounded-xl">
                            <mat-icon class="scale-90">{{ tool.icon }}</mat-icon>
                          </div>
                          <button 
                            (click)="toggleFavorite($event, tool.id)"
                            class="text-zinc-400 dark:text-zinc-500 hover:text-amber-500 dark:hover:text-amber-400 transition"
                            title="Bookmark"
                          >
                            <mat-icon class="scale-90">
                              {{ isBookmarked(tool.id) ? 'star' : 'star_border' }}
                            </mat-icon>
                          </button>
                        </div>
                        <h3 class="text-sm font-extrabold text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                          {{ tool.name }}
                        </h3>
                        <p class="text-[11px] text-zinc-655 dark:text-zinc-400 leading-relaxed line-clamp-2 select-text">
                          {{ tool.shortDescription }}
                        </p>
                      </div>
                      <div class="mt-4 pt-3 border-t border-zinc-150 dark:border-zinc-850 flex items-center justify-between text-[10px] font-mono text-zinc-500 select-none">
                        <span>{{ tool.tags.slice(0, 3).join(', ') }}</span>
                        <span class="text-emerald-600 dark:text-emerald-400/80 group-hover:translate-x-1 transition duration-200 block font-bold">&rarr; OPEN</span>
                      </div>
                    </a>
                  }
                </div>
              } @else {
                <div class="space-y-3 animate-slideUp">
                  @for (tool of categoryTools(); track tool.id) {
                    <a [routerLink]="[tool.categoryId === 'seo-tools' ? '/seo' : '/tools', tool.slug]" (click)="recordToolClick(tool.slug)" (keydown.enter)="recordToolClick(tool.slug)" tabindex="0" class="p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-855 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-xl shadow-xs transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 group relative overflow-hidden text-left block">
                      <div class="flex items-center gap-4 min-w-0 flex-1">
                        <div class="p-2 border border-zinc-150 dark:border-zinc-750 bg-zinc-50 dark:bg-zinc-950 text-sky-600 dark:text-sky-400 rounded-xl shrink-0">
                          <mat-icon class="scale-90">{{ tool.icon }}</mat-icon>
                        </div>
                        <div class="min-w-0 flex-1 space-y-1">
                          <div class="flex items-center gap-2">
                            <h3 class="text-sm font-extrabold text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition truncate">
                              {{ tool.name }}
                            </h3>
                            @for (tag of tool.tags.slice(0, 1); track tag) {
                              <span class="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-950 text-zinc-550 dark:text-zinc-400 text-[9px] font-mono rounded border border-zinc-200 dark:border-zinc-800">
                                {{ tag | uppercase }}
                              </span>
                            }
                          </div>
                          <p class="text-[11px] text-zinc-655 dark:text-zinc-400 leading-relaxed line-clamp-1 select-text">
                            {{ tool.shortDescription }}
                          </p>
                        </div>
                      </div>
                      <div class="flex items-center gap-4 shrink-0 select-none">
                        <button 
                          (click)="toggleFavorite($event, tool.id)"
                          class="text-zinc-400 dark:text-zinc-500 hover:text-amber-500 dark:hover:text-amber-400 transition p-1 rounded-md hover:bg-zinc-150 dark:hover:bg-zinc-950"
                          title="Bookmark"
                        >
                          <mat-icon style="font-size: 18px; width: 18px; height: 18px;" class="leading-none">
                            {{ isBookmarked(tool.id) ? 'star' : 'star_border' }}
                          </mat-icon>
                        </button>
                        <span class="text-emerald-600 dark:text-emerald-400/80 group-hover:translate-x-1 transition duration-200 block text-xs flex items-center gap-1 font-mono font-bold select-none whitespace-nowrap">
                          OPEN <span class="font-sans">&rarr;</span>
                        </span>
                      </div>
                    </a>
                  }
                </div>
              }
            }
          </div>

          <!-- Other categories sidebar list -->
          <div class="lg:col-span-1 space-y-5 text-left">
            <div class="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 rounded-2xl shadow-sm space-y-4">
              <div class="text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-500 border-b border-zinc-150 dark:border-zinc-850 pb-2">
                OTHER CATEGORIES
              </div>
              <div class="space-y-2 font-mono text-[11px]">
                @for (cat of otherCategories(); track cat.id) {
                  <a [routerLink]="['/category', cat.slug]" class="p-2.5 border border-zinc-150 dark:border-zinc-855 hover:bg-zinc-50 dark:hover:bg-zinc-800 bg-zinc-50 dark:bg-zinc-950/20 rounded-lg cursor-pointer flex items-center justify-between text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition block">
                    <span class="truncate block">{{ cat.name }}</span>
                    <span>&rarr;</span>
                  </a>
                }
              </div>
            </div>
          </div>
        </div>
      } @else {
        <!-- 404 Category fallback -->
        <div class="p-12 text-center space-y-3 max-w-sm mx-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900/60 font-mono shadow-sm">
          <mat-icon class="text-4xl text-rose-400">warning</mat-icon>
          <p class="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">Category Not Found</p>
          <p class="text-xs text-zinc-500 dark:text-zinc-650 leading-relaxed">The requested category slug does not exist or may have been deleted.</p>
          <button routerLink="/" class="px-4 py-2 border border-zinc-150 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs rounded-xl font-bold text-zinc-750 dark:text-zinc-300 transition">
            &larr; BACK TO SAFETY
          </button>
        </div>
      }
    </div>
  `
})
export class CategoryPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly toolboxService = inject(ToolboxService);
  private readonly seoService = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);

  public currentCategory = signal<typeof CATEGORIES[0] | null>(null);
  public isGridView = signal<boolean>(true);

  // Computes tools matching this category
  public categoryTools = computed(() => {
    const cat = this.currentCategory();
    if (!cat) return [];
    return TOOLS.filter(tool => tool.categoryId === cat.id);
  });

  // Collect other category entries
  public otherCategories = computed(() => {
    const cat = this.currentCategory();
    if (!cat) return CATEGORIES;
    return CATEGORIES.filter(c => c.id !== cat.id);
  });

  ngOnInit(): void {
    // Intercept active slug parameter changes
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const slug = params.get('slug');
        const match = CATEGORIES.find(c => c.slug === slug);
        
        if (match) {
          this.currentCategory.set(match);
          
          // Trigger dynamic category meta setup
          this.seoService.updateMetadata({
            title: match.metaTitle,
            description: match.metaDescription,
            slug: `/category/${match.slug}`,
            breadcrumbs: [
              { name: "Home", url: "/" },
              { name: match.name, url: `/category/${match.slug}` }
            ]
          });
        } else {
          this.currentCategory.set(null);
        }
      });
  }

  public isBookmarked(toolId: string): boolean {
    return this.toolboxService.favorites().includes(toolId);
  }

  public toggleFavorite(event: MouseEvent, toolId: string): void {
    event.stopPropagation();
    event.preventDefault();
    this.toolboxService.toggleFavorite(toolId);
  }

  public recordToolClick(slug: string): void {
    this.toolboxService.recordUsage(slug);
  }
}
