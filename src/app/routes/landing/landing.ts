import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CATEGORIES, TOOLS, SITE_CONFIG } from '../../constants/constant';
import { ToolboxService } from '../../core/services/toolbox';
import { SeoService } from '../../core/services/seo';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-12">
      <!-- High Aesthetic Developer Hero Banner -->
      <section class="relative text-center py-10 md:py-16 max-w-4xl mx-auto space-y-4 px-4">
        <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-mono font-bold uppercase tracking-wider mb-2">
          <span class="w-2 h-2 bg-emerald-400 dark:bg-emerald-500 animate-pulse rounded-full"></span> Standalone Version 21 &bull; 100% Client-Side privacy
        </div>
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
          DevSight <span class="bg-gradient-to-r from-emerald-500 to-sky-500 dark:from-emerald-400 dark:to-sky-400 bg-clip-text text-transparent">Developer Toolbox</span>
        </h1>
        <p class="text-sm md:text-base text-zinc-650 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Uncompromised developer privacy. A high-performance collection of offline-first utilities for formatting JSON, decoding JWT payloads, generating secure variables, and designing flexible CSS layouts.
        </p>

        <!-- Dynamic Semantic Search Core Bar -->
        <div class="max-w-xl mx-auto pt-6 relative select-text">
          <div class="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-zinc-300 dark:hover:border-zinc-700 focus-within:border-emerald-600 transition pl-4 pr-2 py-1.5 shadow-sm">
            <mat-icon class="text-zinc-400 dark:text-zinc-500 scale-90">search</mat-icon>
            <input 
              type="text" 
              #queryInput
              [value]="searchQuery()"
              (input)="searchQuery.set(queryInput.value)"
              placeholder="Search or filter tools (e.g. JSON, JWT, password, CSS)..."
              class="w-full bg-transparent border-none outline-none text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 text-sm font-mono focus:ring-0 p-3 select-text"
            />
            @if (searchQuery()) {
              <button 
                (click)="searchQuery.set(''); queryInput.value = ''"
                class="px-2 py-1 text-xs font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg transition"
              >
                CLEAR
              </button>
            }
          </div>
        </div>
      </section>

      <!-- Main Layout Divided Structure -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        <!-- Search Results overlay section or regular dashboard -->
        <div class="lg:col-span-3 space-y-8">
          
          <!-- Query feedback state -->
          @if (searchQuery()) {
            <div class="space-y-4 text-left">
              <h2 class="text-sm font-bold font-mono tracking-wide uppercase text-zinc-500 dark:text-zinc-400">SEARCH RESULTS FOR "{{ searchQuery() }}"</h2>
              @if (filteredTools().length === 0) {
                <div class="p-8 border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-950/20 text-center rounded-2xl text-zinc-500 max-w-md mx-auto space-y-2 shadow-sm">
                  <mat-icon class="text-3xl text-zinc-300 dark:text-zinc-700 animate-pulse">search_off</mat-icon>
                  <p class="text-xs font-mono font-bold">No Matching Utilities Found</p>
                  <p class="text-[11px] leading-relaxed">Check syntax or try different terms like "base64", "strength", or "generator".</p>
                </div>
              } @else {
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  @for (tool of filteredTools(); track tool.id) {
                    <a [routerLink]="[tool.categoryId === 'seo-tools' ? '/seo' : '/tools', tool.slug]" (click)="recordToolClick(tool.slug)" (keydown.enter)="recordToolClick(tool.slug)" tabindex="0" class="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-2xl shadow-sm transition cursor-pointer flex flex-col justify-between group relative overflow-hidden select-text text-left block">
                      <div class="space-y-2">
                        <div class="flex items-center justify-between">
                          <div class="p-2 border border-zinc-150 dark:border-zinc-750 bg-zinc-50 dark:bg-zinc-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                            <mat-icon class="scale-90">{{ tool.icon }}</mat-icon>
                          </div>
                          <!-- Bookmark button -->
                          <button 
                            (click)="toggleFavorite($event, tool.id)"
                            class="text-zinc-400 dark:text-zinc-500 hover:text-amber-500 dark:hover:text-amber-400 transition"
                            title="Add to Favorites"
                          >
                            <mat-icon class="scale-90">
                              {{ isBookmarked(tool.id) ? 'star' : 'star_border' }}
                            </mat-icon>
                          </button>
                        </div>
                        <h3 class="text-sm font-extrabold text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                          {{ tool.name }}
                        </h3>
                        <p class="text-[11px] text-zinc-650 dark:text-zinc-400 leading-relaxed line-clamp-2 select-text">
                          {{ tool.shortDescription }}
                        </p>
                      </div>
                      <div class="mt-4 pt-3 border-t border-zinc-150 dark:border-zinc-850 flex items-center justify-between text-[10px] font-mono text-zinc-500 select-none">
                        <span>CATEGORY: {{ getCategoryName(tool.categoryId) }}</span>
                        <span class="text-emerald-600 dark:text-emerald-400/80 group-hover:translate-x-1 transition duration-200 block">&rarr; OPEN TOOL</span>
                      </div>
                    </a>
                  }
                </div>
              }
            </div>
          } @else {
            <!-- Regular Dashboard View: Favorites, Categories & All utilities -->
            
            <!-- Bookmarks Panel -->
            @if (favoritedTools().length > 0) {
              <div class="space-y-4">
                <div class="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 font-mono font-bold text-xs uppercase tracking-wider text-left">
                  <mat-icon class="text-amber-500 dark:text-amber-400 scale-75">star</mat-icon> YOUR BOOKMARKED FAVORITES
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  @for (tool of favoritedTools(); track tool.id) {
                    <a [routerLink]="[tool.categoryId === 'seo-tools' ? '/seo' : '/tools', tool.slug]" (click)="recordToolClick(tool.slug)" (keydown.enter)="recordToolClick(tool.slug)" tabindex="0" class="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-2xl shadow-sm transition cursor-pointer flex flex-col justify-between group relative overflow-hidden select-text text-left block">
                      <div class="space-y-2">
                        <div class="flex items-center justify-between">
                          <div class="p-2 border border-zinc-150 dark:border-zinc-750 bg-zinc-50 dark:bg-zinc-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                            <mat-icon class="scale-90">{{ tool.icon }}</mat-icon>
                          </div>
                          <button 
                            (click)="toggleFavorite($event, tool.id)"
                            class="text-amber-500 hover:text-zinc-400 dark:hover:text-zinc-500 transition"
                            title="Remove Favorite"
                          >
                            <mat-icon class="scale-90">star</mat-icon>
                          </button>
                        </div>
                        <h3 class="text-sm font-extrabold text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                          {{ tool.name }}
                        </h3>
                        <p class="text-[11px] text-zinc-650 dark:text-zinc-400 leading-relaxed line-clamp-2 select-text">
                          {{ tool.shortDescription }}
                        </p>
                      </div>
                      <div class="mt-4 pt-3 border-t border-zinc-150 dark:border-zinc-850 flex items-center justify-between text-[10px] font-mono text-zinc-500 select-none">
                        <span>CATEGORY: {{ getCategoryName(tool.categoryId) }}</span>
                        <span class="text-emerald-600 dark:text-emerald-400/80 group-hover:translate-x-1 transition duration-200 block">&rarr; OPEN TOOL</span>
                      </div>
                    </a>
                  }
                </div>
              </div>
            }

            <!-- Popular / Trending tools listing -->
            <div class="space-y-4">
              <div class="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 font-mono font-bold text-xs uppercase tracking-wider text-left">
                <mat-icon class="text-emerald-600 dark:text-emerald-400 scale-75">trending_up</mat-icon> POPULAR DEV UTILITIES
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                @for (tool of popularTools; track tool.id) {
                  <a [routerLink]="[tool.categoryId === 'seo-tools' ? '/seo' : '/tools', tool.slug]" (click)="recordToolClick(tool.slug)" (keydown.enter)="recordToolClick(tool.slug)" tabindex="0" class="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-2xl shadow-sm transition cursor-pointer flex flex-col justify-between group relative overflow-hidden select-text text-left block">
                    <div class="space-y-2">
                      <div class="flex items-center justify-between">
                        <div class="p-2 border border-zinc-150 dark:border-zinc-750 bg-zinc-50 dark:bg-zinc-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
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
                      <p class="text-[11px] text-zinc-650 dark:text-zinc-400 leading-relaxed line-clamp-2 select-text">
                        {{ tool.shortDescription }}
                      </p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-zinc-150 dark:border-zinc-850 flex items-center justify-between text-[10px] font-mono text-zinc-500 select-none">
                      <span>{{ getCategoryName(tool.categoryId) }}</span>
                      <span class="text-emerald-600 dark:text-emerald-400/80 group-hover:translate-x-1 transition duration-200 block">&rarr;</span>
                    </div>
                  </a>
                }
              </div>
            </div>

            <!-- Categories Selection Grid -->
            <div class="space-y-4">
              <div class="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 font-mono font-bold text-xs uppercase tracking-wider text-left">
                <mat-icon class="text-sky-600 dark:text-sky-400 scale-75">layers</mat-icon> CATEGORIES BROWSER
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                @for (cat of categories; track cat.id) {
                  <div [routerLink]="['/category', cat.slug]" class="p-6 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-zinc-50 dark:hover:bg-zinc-850 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-2xl shadow-sm transition cursor-pointer text-left block">
                    <div class="flex items-start gap-4">
                      <div class="p-3 border border-zinc-150 dark:border-zinc-750 bg-zinc-50 dark:bg-zinc-950 text-sky-600 dark:text-sky-400 rounded-xl">
                        <mat-icon>{{ cat.icon }}</mat-icon>
                      </div>
                      <div class="space-y-1">
                        <h3 class="text-zinc-900 dark:text-white font-bold text-sm tracking-wide">{{ cat.name }}</h3>
                        <p class="text-xs text-zinc-650 dark:text-zinc-400 leading-relaxed select-text">{{ cat.description }}</p>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- Sidebar (Recents, stats context, static index directories) -->
        <div class="lg:col-span-1 space-y-6">
          
          <!-- Recently Loaded Tools -->
          <div class="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 rounded-2xl shadow-sm text-left space-y-4 select-text">
            <div class="flex items-center gap-1.5 font-mono font-bold text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-150 dark:border-zinc-850 pb-2">
              <mat-icon class="text-emerald-600 dark:text-emerald-400 scale-75">access_time</mat-icon> RECENTLY USED
            </div>
            
            @if (recentlyUsedTools().length === 0) {
              <p class="text-xs italic text-zinc-500 dark:text-zinc-500 leading-relaxed">No tracking records yet. Explore any utility to view history indicators.</p>
            } @else {
              <div class="space-y-2 font-mono text-[11px]">
                @for (tool of recentlyUsedTools(); track tool.id) {
                  <div [routerLink]="[tool.categoryId === 'seo-tools' ? '/seo' : '/tools', tool.slug]" class="p-2 border border-zinc-150 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 rounded-lg cursor-pointer flex items-center justify-between text-zinc-655 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition group">
                    <span class="truncate pr-1 block font-bold leading-none">{{ tool.name }}</span>
                    <span class="text-emerald-600 dark:text-emerald-400 font-bold group-hover:scale-105 shrink-0 block">&rarr;</span>
                  </div>
                }
              </div>
            }
          </div>

          <!-- SEO Quick links box -->
          <div class="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 rounded-2xl shadow-sm text-left space-y-3 font-mono text-xs text-zinc-500">
            <span class="font-bold uppercase tracking-wider block text-zinc-500 dark:text-zinc-400 border-b border-zinc-150 dark:border-zinc-850 pb-2">SYSTEM POLICIES</span>
            <div class="space-y-2">
              <a routerLink="/about" class="hover:text-zinc-900 dark:hover:text-zinc-300 flex items-center gap-1">&bull; About Platform</a>
              <a routerLink="/contact" class="hover:text-zinc-900 dark:hover:text-zinc-300 flex items-center gap-1">&bull; Developer Contact</a>
              <a routerLink="/privacy-policy" class="hover:text-zinc-900 dark:hover:text-zinc-300 flex items-center gap-1">&bull; Zero-Server Privacy</a>
              <a routerLink="/terms" class="hover:text-zinc-900 dark:hover:text-zinc-300 flex items-center gap-1">&bull; Use Terms Licence</a>
              <a routerLink="/faq" class="hover:text-zinc-900 dark:hover:text-zinc-300 flex items-center gap-1">&bull; Platform General FAQs</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LandingPageComponent implements OnInit {
  private toolboxService = inject(ToolboxService);
  private seoService = inject(SeoService);

  public categories = CATEGORIES;
  public tools = TOOLS;
  public searchQuery = signal<string>('');

  // Slices specific high profile matching items
  public popularTools = TOOLS.filter(t => 
    t.id === 'json-editor' || t.id === 'jwt-decoder' || t.id === 'password-generator'
  );

  ngOnInit(): void {
    // Setup home SEO credentials
    this.seoService.updateMetadata({
      title: "devsight - 100% Free Offline Developer Utilities Dashboard",
      description: SITE_CONFIG.description,
      slug: "/",
      breadcrumbs: [
        { name: "Home", url: "/" }
      ]
    });
  }

  // Filters tools reactively
  public filteredTools = computed(() => {
    const rawQuery = this.searchQuery().trim().toLowerCase();
    if (!rawQuery) return [];
    
    return TOOLS.filter((tool) => {
      const matchName = tool.name.toLowerCase().includes(rawQuery);
      const matchDesc = tool.shortDescription.toLowerCase().includes(rawQuery);
      const matchTag = tool.tags.some(tag => tag.toLowerCase().includes(rawQuery));
      return matchName || matchDesc || matchTag;
    });
  });

  // Dynamically resolve bookmarked lists
  public favoritedTools = computed(() => {
    const favs = this.toolboxService.favorites();
    return TOOLS.filter(t => favs.includes(t.id));
  });

  // Dynamically resolve recently clicked lists
  public recentlyUsedTools = computed(() => {
    const recents = this.toolboxService.recentlyUsed();
    return recents
      .map(slug => TOOLS.find(t => t.slug === slug))
      .filter((t): t is typeof TOOLS[0] => t !== undefined)
      .slice(0, 4);
  });

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

  public getCategoryName(catId: string): string {
    const found = CATEGORIES.find(c => c.id === catId);
    return found ? found.name : 'Utility';
  }
}
