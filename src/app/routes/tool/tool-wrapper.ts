import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Import All Utilities
import { CATEGORIES, TOOLS } from '../../constants/constant';
import { ToolboxService } from '../../core/services/toolbox';
import { SeoService } from '../../core/services/seo';

// Import Specific Tool Components
import { JsonEditorComponent } from '../../tools/json-editor/json-editor';
import { PasswordGeneratorComponent } from '../../tools/password-generator/password-generator';
import { UuidGeneratorComponent } from '../../tools/uuid-generator/uuid-generator';
import { JwtDecoderComponent } from '../../tools/jwt-decoder/jwt-decoder';
import { Base64EncoderComponent } from '../../tools/base64-encoder/base64-encoder';
import { AngularComponentGeneratorComponent } from '../../tools/angular-component-generator/angular-component-generator';
import { UnixTimestampComponent } from '../../tools/unix-timestamp/unix-timestamp';
import { UnitConverterComponent } from '../../tools/unit-converter/unit-converter';
import { ImageFilterComponent } from '../../tools/image-filter/image-filter';
import { SvgViewer } from '../../tools/svg-viewer/svg-viewer';
import { ImageCompressoerComponent } from '../../tools/image-compressor/image-compressor';
import { ImageTypeConverter } from '../../tools/image-type-converter/image-type-converter';
import { FlexboxPlaygroundComponent } from '../../tools/flexbox-playground/flexbox-playground';
import { TypescriptWorkspaceComponent } from '../../tools/typescript-workspace/typescript-workspace';
import { RxjsVisualizerComponent } from '../../tools/rxjs-visualizer/rxjs-visualizer';
import { RegexStudioComponent } from '../../tools/regex-studio/regex-studio';
import { HtmlViewerComponent } from '../../tools/html-viewer/html-viewer';
import { DateTimeSuite } from '../../tools/date-time-suite/date-time-suite';
import { TextToolkitComponent } from '../../tools/text-toolkit/text-toolkit';
import { SeoToolkitComponent } from '../../tools/seo-toolkit/seo-toolkit';

// New Color & CSS Tools Imports
import { ColorPickerComponent } from '../../tools/color-picker/color-picker';
import { ContrastCheckerComponent } from '../../tools/contrast-checker/contrast-checker';
import { GradientGeneratorComponent } from '../../tools/gradient-generator/gradient-generator';
import { BoxShadowGeneratorComponent } from '../../tools/box-shadow-generator/box-shadow-generator';
import { TextShadowGeneratorComponent } from '../../tools/text-shadow-generator/text-shadow-generator';
import { GlassmorphismGeneratorComponent } from '../../tools/glassmorphism-generator/glassmorphism-generator';
import { NeumorphismGeneratorComponent } from '../../tools/neumorphism-generator/neumorphism-generator';
import { PaletteGeneratorComponent } from '../../tools/palette-generator/palette-generator';
import { ShadeGeneratorComponent } from '../../tools/shade-generator/shade-generator';
import { AccessibilitySimulatorComponent } from '../../tools/accessibility-simulator/accessibility-simulator';
import { ThemeBuilderComponent } from '../../tools/theme-builder/theme-builder';
import { ImageColorExtractorComponent } from '../../tools/image-color-extractor/image-color-extractor';
import { CssFilterGeneratorComponent } from '../../tools/css-filter-generator/css-filter-generator';
import { BorderRadiusGeneratorComponent } from '../../tools/border-radius-generator/border-radius-generator';
import { CubicBezierGeneratorComponent } from '../../tools/cubic-bezier-generator/cubic-bezier-generator';
import { DesignTokenStudioComponent } from '../../tools/design-token-studio/design-token-studio';
import { DevUtilitiesComponent } from '../../tools/dev-utilities/dev-utilities';
import { UiPreviewStudioComponent } from '../../tools/ui-preview-studio/ui-preview-studio';
import { ParquetViewerComponent } from '../../tools/parquet-viewer/parquet-viewer';
import { FakeDataGeneratorComponent } from '../../tools/fake-data-generator/fake-data-generator.component';
import { JsonDifferenceComponent } from '../../tools/json-difference/json-difference';
import { JsonMergeComponent } from '../../tools/json-merge/json-merge.component';

@Component({
  selector: 'app-tool-wrapper',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    JsonEditorComponent,
    PasswordGeneratorComponent,
    UuidGeneratorComponent,
    JwtDecoderComponent,
    Base64EncoderComponent,
    AngularComponentGeneratorComponent,
    UnixTimestampComponent,
    UnitConverterComponent,
    SvgViewer,
    ParquetViewerComponent,
    FakeDataGeneratorComponent,
    JsonDifferenceComponent,
    JsonMergeComponent,
    ImageFilterComponent,
    ImageCompressoerComponent,
    ImageTypeConverter,
    FlexboxPlaygroundComponent,
    TypescriptWorkspaceComponent,
    RxjsVisualizerComponent,
    RegexStudioComponent,
    HtmlViewerComponent,
    DateTimeSuite,
    TextToolkitComponent,
    SeoToolkitComponent,
    ColorPickerComponent,
    ContrastCheckerComponent,
    GradientGeneratorComponent,
    BoxShadowGeneratorComponent,
    TextShadowGeneratorComponent,
    GlassmorphismGeneratorComponent,
    NeumorphismGeneratorComponent,
    PaletteGeneratorComponent,
    ShadeGeneratorComponent,
    AccessibilitySimulatorComponent,
    ThemeBuilderComponent,
    ImageColorExtractorComponent,
    CssFilterGeneratorComponent,
    BorderRadiusGeneratorComponent,
    CubicBezierGeneratorComponent,
    DesignTokenStudioComponent,
    DevUtilitiesComponent,
    UiPreviewStudioComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 select-text">
      @if (currentTool()) {
        <div class="flex flex-col lg:flex-row gap-6 items-start relative">
          <!-- Main Content Area -->
          <div class="flex-grow flex-1 min-w-0 space-y-6 w-full">
            <!-- breadcrumbs moved here: top of title div -->
            <nav class="flex items-center gap-2 font-mono text-[10px] text-zinc-500 font-semibold select-none flex-wrap mb-2">
              <a routerLink="/" class="hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors">HOME</a>
              <span>&bull;</span>
              <a [routerLink]="['/category', categorySlug()]" class="hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors">CATEGORY: {{ categoryName() | uppercase }}</a>
              <span>&bull;</span>
              <span class="text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-150 dark:border-emerald-500/30 px-2 py-0.5 rounded-md font-bold">TOOL: {{ currentTool()?.name | uppercase }}</span>
            </nav>

            <!-- Collapsible Sidebar: All tools in selected category -->
            <aside
              class="relative w-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 mb-3"
            >
              <!-- Toggle Button -->
              <button
                (click)="toggleSidebar()"
                type="button" tabindex="0"
                class="absolute top-2 cursor-pointer right-3 z-20 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 rounded-lg flex items-center justify-center transition"
                [title]="sidebarExpanded() ? 'Collapse tools' : 'Expand tools'"
              >
                <mat-icon style="font-size:18px;width:18px;height:18px;">
                  {{ sidebarExpanded() ? 'expand_circle_up' : 'expand_circle_down' }}
                </mat-icon>
              </button>

              @if (sidebarExpanded()) {
                <!-- Expanded State -->
                <div class="p-4 pr-12 border-b border-zinc-150 dark:border-zinc-850">
                  <span class="text-[10px] font-mono font-extrabold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase">
                    {{ categoryName() }}
                  </span>
                </div>

                <div class="p-2 space-y-1">
                  <!-- Tool Headers -->
                  <div class="p-3 md:p-2 mb-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl text-left space-y-3 relative overflow-hidden select-text shadow-sm">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div class="space-y-1.5 flex-1 p-0">
                        <h1 class="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white leading-tight flex items-center gap-2">
                          <mat-icon class="text-emerald-600 dark:text-emerald-400 align-middle">{{ currentTool()?.icon }}</mat-icon>
                          {{ currentTool()?.name }}
                        </h1>
                        <p class="text-xs md:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed select-text">
                          {{ currentTool()?.shortDescription }}
                        </p>
                      </div>

                      <!-- Header buttons -->
                      <div class="flex items-center gap-2 self-start sm:self-center shrink-0">
                        <button (click)="toggleFavorite()"
                          class="px-3.5 py-1.5 border border-zinc-250 dark:border-zinc-800 hover:border-zinc-350 dark:hover:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs font-mono font-bold rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition flex items-center gap-1.5 select-none cursor-pointer">
                          <mat-icon class="scale-75 text-amber-500">
                            {{ isBookmarked() ? 'star' : 'star_border' }}
                          </mat-icon>
                          {{ isBookmarked() ? 'BOOKMARKED' : 'BOOKMARK' }}
                        </button>
                      </div>
                    </div>
                  </div>
                  @for (tool of categoryAllTools(); track tool.id) {
                    <a
                      [routerLink]="[tool.categoryId === 'seo-tools' ? '/seo' : '/tools', tool.slug]"
                      [class]="tool.id === currentTool()?.id ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-500/20 font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800'"
                      class="p-2.5 rounded-xl transition-all duration-150 flex items-center gap-2.5 text-xs font-medium">
                      <mat-icon style="font-size:14px;width:14px;height:14px;"
                        class="leading-none shrink-0">
                        {{ tool.icon }}
                      </mat-icon>
                      <span class="truncate">
                        {{ tool.name }}
                      </span>
                    </a>
                  }
                </div>
              } @else {
                <!-- Collapsed State -->
                <div class="flex items-center gap-2 p-2 pr-12 overflow-x-auto scrollbar-thin">
                  @for (tool of categoryAllTools(); track tool.id) {
                    <a [routerLink]="[tool.categoryId === 'seo-tools' ? '/seo' : '/tools', tool.slug]"
                      [class]="tool.id === currentTool()?.id ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-500/20' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800'"
                      class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150"
                      [title]="tool.name">
                      <mat-icon style="font-size:14px;width:14px;height:14px;" class="leading-none">
                        {{ tool.icon }}
                      </mat-icon>
                    </a>
                  }
                  <button (click)="toggleFavorite()"
                      class="px-2 py-1 border border-zinc-250 dark:border-zinc-800 hover:border-zinc-350 dark:hover:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs font-mono font-bold rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition flex items-center gap-1.5 select-none cursor-pointer">
                      <mat-icon class="scale-75 text-amber-500">
                        {{ isBookmarked() ? 'star' : 'star_border' }}
                      </mat-icon>
                  </button>
                </div>
              }
            </aside>

            <!-- Tool Module Core Rendering -->
            <section class="min-h-[200px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/35 rounded-2xl p-4 relative shadow-sm">
              @if (currentTool()?.id === 'json-editor') {
                <app-json-editor />
              } @else if (currentTool()?.id === 'password-generator') {
                <app-password-generator [mode]="currentTool()?.id || 'password-generator'" />
              } @else if (currentTool()?.id === 'uuid-generator') {
                <app-uuid-generator />
              } @else if (currentTool()?.id === 'jwt-decoder') {
                <app-jwt-decoder />
              } @else if (currentTool()?.id  === 'base64-toolkit') {
                <app-base64-encoder [mode]="currentTool()!.id" />
              } @else if (currentTool()?.id === 'angular-component-generator') {
                <app-angular-component-generator />
              } @else if (currentTool()?.id === 'unix-timestamp') {
                <app-unix-timestamp />
              } @else if (currentTool()?.id === 'unit-converter') {
                <app-unit-converter />
              }@else if (currentTool()?.id === 'image-filter') {
                <app-image-filter />
              } @else if (currentTool()?.id === 'image-compressor') {
                <app-image-compressor />
              }@else if (currentTool()?.id === 'svg-viewer') {
                <app-svg-viewer-root />
              }@else if (currentTool()?.id === 'parquet-viewer') {
                <app-parquet-viewer />
              }@else if (currentTool()?.id === 'fake-data-generator') {
                <app-fake-data-generator />
              }@else if (currentTool()?.id === 'json-difference') {
                <app-json-difference />
              }@else if (currentTool()?.id === 'json-merge') {
                <app-json-merge />
              }@else if (currentTool()?.id === 'image-type-converter') {
                <app-image-type-converter />
              }@else if (currentTool()?.id === 'date-difference') {
                <app-date-time-suite [mode]="currentTool()!.id" />
              } @else if (currentTool()?.id === 'flexbox-playground') {
                <app-flexbox-playground />
              } @else if (currentTool()?.id === 'typescript-workspace') {
                <app-typescript-workspace />
              } @else if (currentTool()?.id === 'rxjs-visualizer') {
                <app-rxjs-visualizer />
              } @else if (currentTool()?.id === 'regex-studio') {
                <app-regex-studio />
              } @else if (currentTool()?.id === 'html-viewer') {
                <app-html-viewer/>
              } @else if (currentTool()?.id === 'color-picker') {
                <app-color-picker />
              } @else if (currentTool()?.id === 'contrast-checker') {
                <app-contrast-checker />
              } @else if (currentTool()?.id === 'gradient-generator') {
                <app-gradient-generator />
              } @else if (currentTool()?.id === 'box-shadow-generator') {
                <app-box-shadow-generator />
              } @else if (currentTool()?.id === 'text-shadow-generator') {
                <app-text-shadow-generator />
              } @else if (currentTool()?.id === 'glassmorphism-generator') {
                <app-glassmorphism-generator />
              } @else if (currentTool()?.id === 'neumorphism-generator') {
                <app-neumorphism-generator />
              } @else if (currentTool()?.id === 'palette-generator') {
                <app-palette-generator />
              } @else if (currentTool()?.id === 'shade-generator') {
                <app-shade-generator />
              } @else if (currentTool()?.id === 'accessibility-simulator') {
                <app-accessibility-simulator />
              } @else if (currentTool()?.id === 'theme-builder') {
                <app-theme-builder />
              } @else if (currentTool()?.id === 'image-color-extractor') {
                <app-image-color-extractor />
              } @else if (currentTool()?.id === 'css-filter-generator') {
                <app-css-filter-generator />
              } @else if (currentTool()?.id === 'border-radius-generator') {
                <app-border-radius-generator />
              } @else if (currentTool()?.id === 'cubic-bezier-generator') {
                <app-cubic-bezier-generator />
              } @else if (currentTool()?.id === 'design-token-studio') {
                <app-design-token-studio />
              } @else if (currentTool()?.id === 'dev-utilities') {
                <app-dev-utilities />
              } @else if (currentTool()?.id === 'ui-preview-studio') {
                <app-ui-preview-studio />
              } @else if (currentTool()?.categoryId === 'text-utilities') {
                <app-text-toolkit [toolId]="currentTool()!.id" />
              } @else if (currentTool()?.categoryId === 'seo-tools') {
                <app-seo-toolkit [toolId]="currentTool()!.id" />
              }
            </section>

            <!-- Dynamic User Guides, FAQs, and Sidebar links dual grid columns -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <!-- Main text layouts (Instruction Guide, detailed guide, and FAQ elements) -->
              <div class="lg:col-span-2 space-y-8 text-left select-text prose prose-invert prose-emerald max-w-none">
                <!-- Long Form Detailed Guide -->
                <div class="p-6 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 rounded-2xl block text-zinc-700 dark:text-zinc-350 select-all space-y-4 shadow-sm">
                  <span class="text-[10px] uppercase font-mono tracking-widest text-zinc-500 dark:text-zinc-400 font-bold block">PLATFORM OPERATING MANUAL</span>
                  <div class="space-y-3 leading-relaxed text-xs text-zinc-600 dark:text-zinc-400" [innerHTML]="currentTool()?.detailedGuide"></div>
                </div>

                <!-- FAQs Panel -->
                @if (currentTool()?.faqs && (currentTool()?.faqs ?? []).length > 0) {
                  <div class="space-y-4">
                    <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block">FREQUENTLY ASKED QUESTIONS</span>
                    <div class="space-y-3">
                      @for (faq of currentTool()?.faqs; track faq.question) {
                        <div class="p-5 border border-zinc-150 dark:border-zinc-850 bg-white dark:bg-zinc-900/30 rounded-xl space-y-1 text-left shadow-sm">
                          <h4 class="text-sm font-semibold text-zinc-900 dark:text-white font-sans">{{ faq.question }}</h4>
                          <p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{{ faq.answer }}</p>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>

              <!-- Sidebar segment (Related widgets list) -->
              <div class="lg:col-span-1 space-y-6 text-left">
                <div class="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 rounded-2xl space-y-4 shadow-sm">
                  <span class="text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-150 dark:border-zinc-850 pb-2 block">
                    RELATED UTILITIES
                  </span>
                  <div class="space-y-2.5 font-mono text-[11px]">
                    @for (related of relatedCards(); track related.id) {
                      <a [routerLink]="['/tools', related.slug]" class="p-3 border border-zinc-150 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950/20 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white rounded-lg flex items-center justify-between transition block">
                        <span class="truncate block pr-2 leading-tight font-bold">{{ related.name }}</span>
                        <span>&rarr;</span>
                      </a>
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      } @else {
        <!-- Fallback 404 block -->
        <div class="p-12 text-center space-y-3 max-w-sm mx-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900/60 font-mono shadow-sm">
          <mat-icon class="text-4xl text-rose-400">warning</mat-icon>
          <p class="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">Utility Not Found</p>
          <p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">The requested tool slug does not exist in our static registry.</p>
          <button routerLink="/" class="px-4 py-2 border border-zinc-150 dark:border-zinc-800 hover:border-zinc-350 dark:hover:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs rounded-xl font-bold text-zinc-750 dark:text-zinc-300 transition">
            &larr; BACK TO HOMEPAGE
          </button>
        </div>
      }
    </div>
  `
})
export class ToolWrapperComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly toolboxService = inject(ToolboxService);
  private readonly seoService = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);

  public currentTool = signal<typeof TOOLS[0] | null>(null);
  public sidebarExpanded = signal<boolean>(false);

  public toggleSidebar(): void {
    this.sidebarExpanded.update(v => !v);
  }

  // Collect all tools of the current category
  public categoryAllTools = computed(() => {
    const t = this.currentTool();
    if (!t) return [];
    return TOOLS.filter(item => item.categoryId === t.categoryId);
  });

  // Derive structural values
  public categorySlug = computed(() => {
    const t = this.currentTool();
    if (!t) return '';
    const cat = CATEGORIES.find(c => c.id === t.categoryId);
    return cat ? cat.slug : '';
  });

  public categoryName = computed(() => {
    const t = this.currentTool();
    if (!t) return '';
    const cat = CATEGORIES.find(c => c.id === t.categoryId);
    return cat ? cat.name : 'Utility';
  });

  // Collect related items
  public relatedCards = computed(() => {
    const t = this.currentTool();
    if (!t) return [];
    const relatedSlugs = t.relatedTools || [];
    return TOOLS.filter(item => relatedSlugs.includes(item.id) && item.id !== t.id);
  });

  ngOnInit(): void {
    // Listen to parameter mutations
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const slug = params.get('slug');
        const match = TOOLS.find(t => t.slug === slug);

        if (match) {
          this.currentTool.set(match);

          // Auto record usage history
          this.toolboxService.recordUsage(match.slug);

          // Get active Category meta definitions
          const cat = CATEGORIES.find(c => c.id === match.categoryId);
          const catName = cat ? cat.name : 'Tools';
          const catSlug = cat ? cat.slug : 'dashboard';

          const isSeoTool = match.categoryId === 'seo-tools';
          const toolSlugPath = isSeoTool ? `/seo/${match.slug}` : `/tools/${match.slug}`;

          // Inject proper search indices schemas
          this.seoService.updateMetadata({
            title: match.metaTitle,
            description: match.metaDescription,
            slug: toolSlugPath,
            faqs: match.faqs,
            breadcrumbs: [
              { name: "Home", url: "/" },
              { name: catName, url: `/category/${catSlug}` },
              { name: match.name, url: toolSlugPath }
            ]
          });
        } else {
          this.currentTool.set(null);
        }
      });
  }

  public isBookmarked(): boolean {
    const tool = this.currentTool();
    if (!tool) return false;
    return this.toolboxService.favorites().includes(tool.id);
  }

  public toggleFavorite(): void {
    const tool = this.currentTool();
    if (!tool) return;
    this.toolboxService.toggleFavorite(tool.id);
  }
}
