import { ChangeDetectionStrategy, Component, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

// Rich interfaces for FAQ structure
interface FAQInput {
  question: string;
  answer: string;
}

// Language alternate profiles
interface HreflangInput {
  langCode: string;
  countryCode: string;
  url: string;
}

// Robots customized rules
interface RobotsRule {
  userAgent: string;
  directive: 'Allow' | 'Disallow';
  path: string;
}

// Schema structured data template models
type SchemaType = 'Article' | 'Product' | 'Recipe' | 'JobPosting' | 'Event' | 'Organization' | 'Website' | 'Person' | 'LocalBusiness';

@Component({
  selector: 'app-seo-toolkit',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './seo-toolkit.html',
  styleUrls: ['./seo-toolkit.css']
})
export class SeoToolkitComponent {
  // Input selector to identify the currently active SEO tool page
  @Input() set toolId(value: string) {
    this.activeToolId.set(value || 'meta-tag-generator');
    this.resetFormStateForActiveTool();
  }
  public activeToolId = signal<string>('meta-tag-generator');

  // Multi-purpose Undo/Redo historical stacks for our SEO code inputs
  private historyStack: string[] = [];
  private redoStack: string[] = [];
  public canUndo = signal<boolean>(false);
  public canRedo = signal<boolean>(false);

  // Status flags and operational variables
  public showCopiedMessage = signal<boolean>(false);
  
  // ----------------------------------------------------
  // Form State Signals : META TAG GENERATOR
  // ----------------------------------------------------
  public metaTitle = signal<string>('My Awesome Desktop App - Developers Toolbed');
  public metaDescription = signal<string>('An all-in-one developer workspace containing formatting options, secure random generators, and JSON trees offline.');
  public metaKeywords = signal<string>('seo, devsight, formatting tools, json compiler, offline utility');
  public metaRobotsIndex = signal<string>('index');
  public metaRobotsFollow = signal<string>('follow');
  public metaLanguage = signal<string>('English');
  public metaAuthor = signal<string>('devsight');
  public metaCharset = signal<string>('UTF-8');
  public metaThemeColor = signal<string>('#059669');

  // Calculated variables for Meta tags
  public titleChars = computed(() => this.metaTitle().length);
  public titleStatus = computed(() => {
    const len = this.titleChars();
    if (len === 0) return 'empty';
    if (len < 30) return 'too-short';
    if (len > 60) return 'too-long';
    return 'optimal';
  });

  public descChars = computed(() => this.metaDescription().length);
  public descStatus = computed(() => {
    const len = this.descChars();
    if (len === 0) return 'empty';
    if (len < 110) return 'too-short';
    if (len > 160) return 'too-long';
    return 'optimal';
  });

  // ----------------------------------------------------
  // Form State Signals : OPEN GRAPH GENERATOR
  // ----------------------------------------------------
  public ogTitle = signal<string>('devsight - Premium Offline Developer Sandbox');
  public ogDescription = signal<string>('Tired of leaking sensitive data? Run calculations, format JSON and convert timestamps 100% locally in your browser.');
  public ogUrl = signal<string>('https://devsight.dev/tools/json-editor');
  public ogImage = signal<string>('https://images.unsplash.com/photo-1618401471353-b98aedd07871?auto=format&fit=crop&w=1200&h=630&q=80');
  public ogSiteName = signal<string>('devsight');
  public ogType = signal<string>('website');
  public twitterCardType = signal<string>('summary_large_image');
  public twitterHandle = signal<string>('@devsightToolbox');

  // ----------------------------------------------------
  // Form State Signals : SERP PREVIEW TOOL
  // ----------------------------------------------------
  public serpTitle = signal<string>('Top 10 Developer Utilities You Must Try in 2026');
  public serpDescription = signal<string>('Discover 10 essential utilities that keep authentication data secure. Run JSON tree schemas, trace reactive streams, and convert dates.');
  public serpUrl = signal<string>('https://devsight.dev/blog/essential-developer-utilities');
  public serpRatingValue = signal<number>(4.8);
  public serpRatingCount = signal<number>(142);
  public serpPubDate = signal<string>('2026-05-28');
  public serpDeviceMode = signal<'desktop' | 'mobile'>('desktop');

  // ----------------------------------------------------
  // Form State Signals : FAQ SCHEMA BUILDER
  // ----------------------------------------------------
  public faqPairs = signal<FAQInput[]>([
    { question: 'Is my data secure with devsight?', answer: 'Yes. All validation and computation occur client-side in browser sandboxed memory.' },
    { question: 'Are these tools completely free?', answer: 'Absolutely. Features are public and provided under open MIT software licenses.' }
  ]);

  // ----------------------------------------------------
  // Form State Signals : SCHEMA JSON-LD COMPOSER
  // ----------------------------------------------------
  public activeSchemaType = signal<SchemaType>('Article');
  public schemaTypesList: SchemaType[] = ['Article', 'Product', 'Recipe', 'JobPosting', 'Website'];
  // Article State
  public articleHeadline = signal<string>('Scaling Angular Architecture with Zoneless Signals');
  public articleAuthorName = signal<string>('Sarah Jenkins');
  public articlePublisherName = signal<string>('Tech Frontiers');
  public articleDatePublished = signal<string>('2026-05-28');
  // Product State
  public productName = signal<string>('devsight Professional Suite');
  public productBrand = signal<string>('devsight Corp');
  public productPrice = signal<number>(49.99);
  public productCurrency = signal<string>('USD');
  public productAvailability = signal<string>('InStock');
  public productReviewRating = signal<number>(4.9);
  public productReviewCount = signal<number>(88);
  public productSku = signal<string>('DS-PRO-2026');
  // Recipe State
  public recipeName = signal<string>('Perfect Chocolate Chip Cookies');
  public recipePrepTime = signal<string>('PT15M');
  public recipeCookTime = signal<string>('PT10M');
  public recipeIngredients = signal<string>('2 cups flour\n1 cup chocolate chips\n1 cup brown sugar');
  // Job State
  public jobTitle = signal<string>('Lead Frontend Systems Architect (Angular 21)');
  public jobCompany = signal<string>('Antigravity Inc');
  public jobSalaryMin = signal<number>(140000);
  public jobSalaryMax = signal<number>(190000);
  public jobEmployType = signal<string>('FULL_TIME');
  // Website State
  public websiteName = signal<string>('devsight');
  public websiteSearchPattern = signal<string>('https://devsight.dev/search?q={search_term}');

  // ----------------------------------------------------
  // Form State Signals : ROBOTS.TXT BUILDER & TESTER
  // ----------------------------------------------------
  public robotsDefaultAgent = signal<string>('*');
  public robotsAllowByDefault = signal<boolean>(true);
  public robotsSitemapUrl = signal<string>('https://devsight.dev/sitemap.xml');
  public robotsCustomRules = signal<RobotsRule[]>([
    { userAgent: 'GPTBot', directive: 'Disallow', path: '/api/' },
    { userAgent: 'Googlebot', directive: 'Allow', path: '/public/' }
  ]);
  public robotsNewAgent = signal<string>('*');
  public robotsNewDirective = signal<'Allow' | 'Disallow'>('Disallow');
  public robotsNewPath = signal<string>('');
  public robotsTestPath = signal<string>('/api/secret-vitals');

  // ----------------------------------------------------
  // Form State Signals : SITEMAP GENERATOR & VALIDATOR
  // ----------------------------------------------------
  public sitemapUrlsRaw = signal<string>('https://devsight.dev/\nhttps://devsight.dev/about\nhttps://devsight.dev/contact\nhttps://devsight.dev/tools/json-editor');
  public sitemapChangefreq = signal<string>('weekly');
  public sitemapPriority = signal<string>('0.8');
  public sitemapTypeMode = signal<'urlset' | 'sitemapindex' | 'imageset'>('urlset');

  // ----------------------------------------------------
  // Form State Signals : CANONICAL BUILDER & SERVERS
  // ----------------------------------------------------
  public canonicalBaseUrl = signal<string>('https://devsight.dev/tools/json-editor');
  public canonicalTrailingSlash = signal<boolean>(true);
  public canonicalForcedWww = signal<boolean>(false);
  public canonicalStripUtm = signal<boolean>(true);
  public canonicalStripQueryParams = signal<boolean>(false);

  // ----------------------------------------------------
  // Form State Signals : HREFLANG ALTERNATES
  // ----------------------------------------------------
  public hreflangAlternateList = signal<HreflangInput[]>([
    { langCode: 'en', countryCode: 'us', url: 'https://devsight.dev/tools/json-editor' },
    { langCode: 'es', countryCode: 'es', url: 'https://devsight.dev/es/tools/json-editor' },
    { langCode: 'fr', countryCode: 'fr', url: 'https://devsight.dev/fr/tools/json-editor' }
  ]);
  public hreflangNewLang = signal<string>('de');
  public hreflangNewCountry = signal<string>('de');
  public hreflangNewUrl = signal<string>('https://devsight.dev/de/tools/json-editor');
  public hreflangIncludeXDefault = signal<boolean>(true);
  public hreflangXDefaultUrl = signal<string>('https://devsight.dev/tools/json-editor');

  // ----------------------------------------------------
  // Form State Signals : PWA MANIFEST BUILDER
  // ----------------------------------------------------
  public pwaName = signal<string>('devsight Core Developer Utility System');
  public pwaShortName = signal<string>('devsight');
  public pwaDescription = signal<string>('High-performance offline utility suites including JSON formats, cryptography solvers and date suites.');
  public pwaStartUrl = signal<string>('/');
  public pwaDisplay = signal<string>('standalone');
  public pwaBgColor = signal<string>('#09090b');
  public pwaThemeColor = signal<string>('#059669');

  // ----------------------------------------------------
  // Form State Signals : ANGULAR SEO CODE BUILDER
  // ----------------------------------------------------
  public angularTitlePattern = signal<string>('{{pageTitle}} | devsight Pro');
  public angularInjectCanonical = signal<boolean>(true);
  public angularInjectFaqJsonld = signal<boolean>(true);

  // ----------------------------------------------------
  // REACTIVE COMPILED OUTPUTS (REAL-TIME COMPUTATION)
  // ----------------------------------------------------
  
  // 1. Meta Tag Compiled Result
  public metaOutputCode = computed(() => {
    let html = `<!-- Standard Essential Meta Tags -->\n`;
    html += `<title>${this.metaTitle()}</title>\n`;
    html += `<meta name="description" content="${this.metaDescription()}" />\n`;
    html += `<meta name="keywords" content="${this.metaKeywords()}" />\n`;
    if (this.metaAuthor()) {
      html += `<meta name="author" content="${this.metaAuthor()}" />\n`;
    }
    html += `<meta charset="${this.metaCharset()}" />\n`;
    html += `<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n`;
    html += `<meta name="theme-color" content="${this.metaThemeColor()}" />\n\n`;

    html += `<!-- Bots Search Robots Indexing meta config -->\n`;
    html += `<meta name="robots" content="${this.metaRobotsIndex()}, ${this.metaRobotsFollow()}" />\n`;
    html += `<meta name="googlebot" content="${this.metaRobotsIndex()}, ${this.metaRobotsFollow()}" />\n\n`;

    html += `<!-- Search Engines App Verification Credentials -->\n`;
    html += `<meta name="google-site-verification" content="G-MOCKVERIFICATIONCODE2026" />\n`;
    html += `<meta name="msvalidate.01" content="MS-MOCKBINGVERIFI_CODES_ACC7" />`;
    return html;
  });

  // 2. Open Graph Compiled Social Markup
  public ogOutputCode = computed(() => {
    let og = `<!-- Open Graph Metadata Protocol (Facebook, Discord, LinkedIn, Slack) -->\n`;
    og += `<meta property="og:title" content="${this.ogTitle()}" />\n`;
    og += `<meta property="og:description" content="${this.ogDescription()}" />\n`;
    og += `<meta property="og:url" content="${this.ogUrl()}" />\n`;
    og += `<meta property="og:site_name" content="${this.ogSiteName()}" />\n`;
    og += `<meta property="og:type" content="${this.ogType()}" />\n`;
    og += `<meta property="og:image" content="${this.ogImage()}" />\n\n`;

    og += `<!-- Twitter Card Protocol Layout (X platform shares) -->\n`;
    og += `<meta name="twitter:card" content="${this.twitterCardType()}" />\n`;
    if (this.twitterHandle()) {
      og += `<meta name="twitter:site" content="${this.twitterHandle()}" />\n`;
    }
    og += `<meta name="twitter:title" content="${this.ogTitle()}" />\n`;
    og += `<meta name="twitter:description" content="${this.ogDescription()}" />\n`;
    og += `<meta name="twitter:image" content="${this.ogImage()}" />`;
    return og;
  });

  // 3. FAQ Schema JSON-LD Script
  public faqSchemaCode = computed(() => {
    const list = this.faqPairs();
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': list.map(item => ({
        '@type': 'Question',
        'name': item.question,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': item.answer
        }
      }))
    };
    return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
  });

  // 4. Schema JSON-LD Comprehensive Entities
  public dynamicSchemaCode = computed(() => {
    const type = this.activeSchemaType();
    let schemaObj: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': type
    };

    if (type === 'Article') {
      schemaObj = {
        ...schemaObj,
        'headline': this.articleHeadline(),
        'author': {
          '@type': 'Person',
          'name': this.articleAuthorName()
        },
        'publisher': {
          '@type': 'Organization',
          'name': this.articlePublisherName(),
          'logo': {
            '@type': 'ImageObject',
            'url': 'https://devsight.dev/logo.png'
          }
        },
        'datePublished': this.articleDatePublished(),
        'dateModified': this.articleDatePublished(),
        'image': 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=800&q=80'
      };
    } else if (type === 'Product') {
      schemaObj = {
        ...schemaObj,
        'name': this.productName(),
        'brand': {
          '@type': 'Brand',
          'name': this.productBrand()
        },
        'offers': {
          '@type': 'Offer',
          'price': this.productPrice(),
          'priceCurrency': this.productCurrency(),
          'availability': `https://schema.org/${this.productAvailability()}`,
          'url': 'https://devsight.dev/products/pro'
        },
        'aggregateRating': {
          '@type': 'AggregateRating',
          'ratingValue': this.productReviewRating(),
          'reviewCount': this.productReviewCount()
        },
        'sku': this.productSku()
      };
    } else if (type === 'Recipe') {
      const ing = this.recipeIngredients().split('\n').filter(Boolean);
      schemaObj = {
        ...schemaObj,
        'name': this.recipeName(),
        'prepTime': this.recipePrepTime(),
        'cookTime': this.recipeCookTime(),
        'recipeIngredient': ing,
        'recipeInstructions': [
          { '@type': 'HowToStep', 'text': 'Mix all of your organic dry and wet ingredients in a wide bowl.' },
          { '@type': 'HowToStep', 'text': 'Bake inside the ovens preheated at 350F for exactly 10 to 12 minutes.' }
        ]
      };
    } else if (type === 'JobPosting') {
      schemaObj = {
        ...schemaObj,
        'title': this.jobTitle(),
        'hiringOrganization': {
          '@type': 'Organization',
          'name': this.jobCompany()
        },
        'baseSalary': {
          '@type': 'MonetaryAmount',
          'currency': 'USD',
          'value': {
            '@type': 'QuantitativeValue',
            'minValue': this.jobSalaryMin(),
            'maxValue': this.jobSalaryMax(),
            'unitText': 'YEAR'
          }
        },
        'employmentType': this.jobEmployType(),
        'jobLocation': {
          '@type': 'Place',
          'address': {
            '@type': 'PostalAddress',
            'addressLocality': 'San Francisco',
            'addressRegion': 'CA',
            'addressCountry': 'US'
          }
        }
      };
    } else if (type === 'Website') {
      schemaObj = {
        ...schemaObj,
        'name': this.websiteName(),
        'url': 'https://devsight.dev',
        'potentialAction': {
          '@type': 'SearchAction',
          'target': this.websiteSearchPattern(),
          'query-input': 'required name=search_term'
        }
      };
    } else {
      // Default website/organization block
      schemaObj = {
        ...schemaObj,
        'name': 'devsight Enterprise Limited',
        'url': 'https://devsight.dev',
        'logo': 'https://devsight.dev/logo.png',
        'sameAs': [
          'https://twitter.com/devsightToolbox',
          'https://github.com/AntigravityDev'
        ]
      };
    }

    return `<script type="application/ld+json">\n${JSON.stringify(schemaObj, null, 2)}\n</script>`;
  });

  // 5. robots.txt Compiler & Local Checker
  public robotsOutputCode = computed(() => {
    let txt = `user-agent: ${this.robotsDefaultAgent()}\n`;
    if (this.robotsAllowByDefault()) {
      txt += `Allow: /\n`;
    } else {
      txt += `Disallow: /\n`;
    }

    // Custom Rules Mapping
    this.robotsCustomRules().forEach(rule => {
      txt += `user-agent: ${rule.userAgent}\n`;
      txt += `${rule.directive}: ${rule.path}\n`;
    });

    if (this.robotsSitemapUrl()) {
      txt += `\nSitemap: ${this.robotsSitemapUrl()}`;
    }
    return txt;
  });

  // Local rule evaluation for crawl tester
  public robotsCrawlTestResult = computed(() => {
    const testPath = this.robotsTestPath().trim();
    if (!testPath) return { allowed: true, matchingRule: 'Default Policy (No blocks match)' };

    // Check custom rules first
    const match = this.robotsCustomRules().find(rule => {
      if (rule.path === '*') return true;
      return testPath.includes(rule.path) || testPath.startsWith(rule.path);
    });

    if (match) {
      const allowed = match.directive === 'Allow';
      return {
        allowed,
        matchingRule: `User-Agent: ${match.userAgent} -> ${match.directive}: ${match.path}`
      };
    }

    // Check default rule
    const allowedDefault = this.robotsAllowByDefault();
    return {
      allowed: allowedDefault,
      matchingRule: `Fallback Standard -> Default Allowed: ${allowedDefault}`
    };
  });

  // 6. sitemap.xml Compiler & XML structures
  public sitemapOutputCode = computed(() => {
    const list = this.sitemapUrlsRaw()
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('http'));

    const freq = this.sitemapChangefreq();
    const prio = this.sitemapPriority();
    const mode = this.sitemapTypeMode();

    if (mode === 'sitemapindex') {
      let indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      indexXml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
      list.forEach((url) => {
        indexXml += `  <sitemap>\n`;
        indexXml += `    <loc>${url}</loc>\n`;
        indexXml += `    <lastmod>2026-05-28T10:15:39Z</lastmod>\n`;
        indexXml += `  </sitemap>\n`;
      });
      indexXml += `</sitemapindex>`;
      return indexXml;
    }

    let urlsetXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    urlsetXml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
    urlsetXml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

    list.forEach(url => {
      urlsetXml += `  <url>\n`;
      urlsetXml += `    <loc>${url}</loc>\n`;
      urlsetXml += `    <changefreq>${freq}</changefreq>\n`;
      urlsetXml += `    <priority>${prio}</priority>\n`;
      if (mode === 'imageset') {
        urlsetXml += `    <image:image>\n`;
        urlsetXml += `      <image:loc>${url}/og-image.png</image:loc>\n`;
        urlsetXml += `      <image:title>Page Capture banner</image:title>\n`;
        urlsetXml += `    </image:image>\n`;
      }
      urlsetXml += `  </url>\n`;
    });

    urlsetXml += `</urlset>`;
    return urlsetXml;
  });

  // Parses raw lines of directories to list sitemaps nodes
  public parsedXmlSitemapUrls = computed(() => {
    return this.sitemapUrlsRaw()
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('http'));
  });

  // 7. Canonical output URLs
  public canonicalOutputCode = computed(() => {
    let raw = this.canonicalBaseUrl().trim();
    if (!raw) return '';

    // Strip parameters optionally
    if (this.canonicalStripQueryParams() || this.canonicalStripUtm()) {
      try {
        const parsed = new URL(raw);
        if (this.canonicalStripQueryParams()) {
          parsed.search = '';
        } else if (this.canonicalStripUtm()) {
          const keysToDelete: string[] = [];
          parsed.searchParams.forEach((_, key) => {
            if (key.startsWith('utm_') || key === 'gclid' || key === 'fbclid') {
              keysToDelete.push(key);
            }
          });
          keysToDelete.forEach(k => parsed.searchParams.delete(k));
        }
        raw = parsed.toString();
      } catch {
        // Safe string cleaner logic if url is malformed
        if (this.canonicalStripQueryParams()) {
          raw = raw.split('?')[0];
        } else if (this.canonicalStripUtm()) {
          raw = raw.replace(/[?&]utm_[^&]+/g, '').replace(/[?&]gclid=[^&]+/g, '').replace(/[?&]fbclid=[^&]+/g, '');
        }
      }
    }

    // Force WWW redirection parameter
    if (this.canonicalForcedWww() && !raw.includes('://www.')) {
      raw = raw.replace('://', '://www.');
    } else if (!this.canonicalForcedWww() && raw.includes('://www.')) {
      raw = raw.replace('://www.', '://');
    }

    // Trailing Slash Handling
    if (this.canonicalTrailingSlash() && !raw.endsWith('/') && !raw.split('?')[0].includes('.')) {
      raw = raw.replace(/(\?|$)/, '/$1');
    } else if (!this.canonicalTrailingSlash() && raw.endsWith('/')) {
      raw = raw.substring(0, raw.length - 1);
    }

    return `<link rel="canonical" href="${raw}" />`;
  });

  // Apache & Nginx rewrite structures
  public serverRedirectRulesCode = computed(() => {
    const raw = this.canonicalBaseUrl().trim();
    let domain = 'example.com';
    try {
      const parsed = new URL(raw);
      domain = parsed.hostname;
    } catch {
      domain = 'devsight.dev';
    }

    let out = `# Apache htaccess Rules - Redirect Non-WWW to WWW\n`;
    out += `RewriteEngine On\n`;
    out += `RewriteCond %{HTTP_HOST} ^${domain} [NC]\n`;
    out += `RewriteRule ^(.*)$ https://www.${domain}/$1 [R=301,L]\n\n`;

    out += `# Nginx Server block parameters\n`;
    out += `server {\n`;
    out += `    listen 80;\n`;
    out += `    server_name ${domain};\n`;
    out += `    return 301 https://www.${domain}$request_uri;\n`;
    out += `}`;
    return out;
  });

  // 8. Hreflang alternates code
  public hreflangOutputCode = computed(() => {
    const alternates = this.hreflangAlternateList();
    let out = `<!-- Multi-Language Localization alternates hreflangs tags -->\n`;
    alternates.forEach(item => {
      const locale = item.countryCode ? `${item.langCode}-${item.countryCode.toLowerCase()}` : item.langCode;
      out += `<link rel="alternate" hreflang="${locale}" href="${item.url}" />\n`;
    });

    if (this.hreflangIncludeXDefault()) {
      out += `<link rel="alternate" hreflang="x-default" href="${this.hreflangXDefaultUrl()}" />`;
    }
    return out;
  });

  // 9. webmanifest configurations
  public manifestOutputCode = computed(() => {
    const manifest = {
      'name': this.pwaName(),
      'short_name': this.pwaShortName(),
      'description': this.pwaDescription(),
      'start_url': this.pwaStartUrl(),
      'display': this.pwaDisplay(),
      'background_color': this.pwaBgColor(),
      'theme_color': this.pwaThemeColor(),
      'icons': [
        {
          'src': '/icons/icon-192x192.png',
          'sizes': '192x192',
          'type': 'image/png',
          'purpose': 'any maskable'
        },
        {
          'src': '/icons/icon-512x512.png',
          'sizes': '512x512',
          'type': 'image/png',
          'purpose': 'any maskable'
        }
      ]
    };
    return JSON.stringify(manifest, null, 2);
  });

  // 10. Angular Stand-Alone Service Template code
  public angularServiceCode = computed(() => {
    let code = `import { Injectable, inject } from '@angular/core';\n`;
    code += `import { Meta, Title } from '@angular/platform-browser';\n`;
    if (this.angularInjectCanonical()) {
      code += `import { DOCUMENT } from '@angular/common';\n`;
    }
    code += `\n`;
    code += `@Injectable({\n`;
    code += `  providedIn: 'root'\n`;
    code += `})\n`;
    code += `export class SeoService {\n`;
    code += `  private title = inject(Title);\n`;
    code += `  private meta = inject(Meta);\n`;
    if (this.angularInjectCanonical()) {
      code += `  private document = inject(DOCUMENT);\n`;
    }
    code += `\n`;
    code += `  /**\n`;
    code += `   * programmatically updates metadata attributes safely\n`;
    code += `   */\n`;
    code += `  public setMetadata(config: {\n`;
    code += `    title: string;\n`;
    code += `    description: string;\n`;
    code += `    slug: string;\n`;
    code += `    image?: string;\n`;
    code += `  }): void {\n`;
    code += `    const brandTitle = \`${this.angularTitlePattern().replace('{{pageTitle}}', '${config.title}')}\`;\n`;
    code += `    this.title.setTitle(brandTitle);\n`;
    code += `    this.meta.updateTag({ name: 'description', content: config.description });\n`;
    code += `    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });\n`;
    code += `    this.meta.updateTag({ property: 'og:title', content: brandTitle });\n`;
    code += `    this.meta.updateTag({ property: 'og:description', content: config.description });\n`;
    if (this.angularInjectCanonical()) {
      code += `\n`;
      code += `    // set canonical links dynamically\n`;
      code += `    const domain = this.document.location.origin;\n`;
      code += `    this.updateCanonicalLink(\`\${domain}/\${config.slug}\`);\n`;
    }
    code += `  }\n`;
    if (this.angularInjectCanonical()) {
      code += `\n`;
      code += `  private updateCanonicalLink(url: string): void {\n`;
      code += `    let link = this.document.querySelector('link[rel="canonical"]');\n`;
      code += `    if (!link) {\n`;
      code += `      link = this.document.createElement('link');\n`;
      code += `      link.setAttribute('rel', 'canonical');\n`;
      code += `      this.document.head.appendChild(link);\n`;
      code += `    }\n`;
      code += `    link.setAttribute('href', url);\n`;
      code += `  }\n`;
    }
    code += `}\n`;
    return code;
  });

  // Comprehensive content SEO keyword density parameters
  public contentSeoInput = signal<string>('SEO writing requires balancing keywords without stuffing. This developer toolbox runs client-side checking of standard seo attributes.');
  public keywordDensityStats = computed(() => {
    const raw = this.contentSeoInput().toLowerCase();
    const clean = raw.replace(/[^a-zA-Z\s_-]/g, ' ');
    const words = clean.split(/\s+/).filter(w => w.length > 3);
    const total = words.length;
    if (total === 0) return [];

    const map: Record<string, number> = {};
    words.forEach(w => map[w] = (map[w] || 0) + 1);

    return Object.entries(map)
      .map(([word, count]) => ({
        word,
        count,
        density: ((count / total) * 105).toFixed(1) // weighted density
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  });

  // Unified controller to output active generated code
  public currentOutputCode = computed(() => {
    const tool = this.activeToolId();
    switch (tool) {
      case 'meta-tag-generator':
        return this.metaOutputCode();
      case 'open-graph-generator':
        return this.ogOutputCode();
      case 'faq-schema-generator':
        return this.faqSchemaCode();
      case 'schema-generator':
        return this.dynamicSchemaCode();
      case 'robots-txt-generator':
        return this.robotsOutputCode();
      case 'sitemap-generator':
        return this.sitemapOutputCode();
      case 'canonical-url-generator':
        return this.canonicalOutputCode();
      case 'hreflang-generator':
        return this.hreflangOutputCode();
      case 'manifest-generator':
        return this.manifestOutputCode();
      case 'angular-seo-tools':
        return this.angularServiceCode();
      default:
        return `Select a professional SEO tool module from parameters drawer.`;
    }
  });

  // Active Tool Title human names
  public pageToolName = computed(() => {
    const tool = this.activeToolId();
    return tool.split('-').map(t => t.toUpperCase()).join(' ');
  });

  constructor() {
    this.saveStateToHistory();
  }

  // Restore/reset variables depending on tool toggles
  private resetFormStateForActiveTool(): void {
    this.redoStack = [];
    this.historyStack = [];
    this.saveStateToHistory();
  }

  // ----------------------------------------------------
  // INTERACTIVE ACTION HANDLERS
  // ----------------------------------------------------
  
  public addFaqPair(): void {
    this.faqPairs.update(list => [...list, { question: 'New Question?', answer: 'Put custom answer text here.' }]);
    this.saveStateToHistory();
  }

  public removeFaqPair(idx: number): void {
    this.faqPairs.update(list => list.filter((_, i) => i !== idx));
    this.saveStateToHistory();
  }

  public addHreflang(): void {
    const url = this.hreflangNewUrl().trim();
    if (url) {
      this.hreflangAlternateList.update(list => [...list, {
        langCode: this.hreflangNewLang(),
        countryCode: this.hreflangNewCountry(),
        url: url
      }]);
      this.hreflangNewUrl.set('');
      this.saveStateToHistory();
    }
  }

  public removeHreflang(idx: number): void {
    this.hreflangAlternateList.update(list => list.filter((_, i) => i !== idx));
    this.saveStateToHistory();
  }

  public addRobotsRule(): void {
    const path = this.robotsNewPath().trim();
    if (path) {
      this.robotsCustomRules.update(list => [...list, {
        userAgent: this.robotsNewAgent(),
        directive: this.robotsNewDirective(),
        path: path
      }]);
      this.robotsNewPath.set('');
      this.saveStateToHistory();
    }
  }

  public removeRobotsRule(idx: number): void {
    this.robotsCustomRules.update(list => list.filter((_, i) => i !== idx));
    this.saveStateToHistory();
  }

  // Local copy to clipboard automation
  public copyToClipboard(): void {
    const code = this.currentOutputCode();
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code);
        this.triggerCopiedToast();
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        this.triggerCopiedToast();
      }
    } catch {
      // safe fallback
    }
  }

  private triggerCopiedToast(): void {
    this.showCopiedMessage.set(true);
    setTimeout(() => {
      this.showCopiedMessage.set(false);
    }, 2000);
  }

  // Triggers diagnostic download files formats
  public downloadOutputFile(): void {
    const code = this.currentOutputCode();
    const tool = this.activeToolId();
    let filename = 'meta-tags.html';
    let mimeType = 'text/html';

    if (tool.includes('schema') || tool.includes('manifest')) {
      filename = `${tool}.json`;
      mimeType = 'application/json';
    } else if (tool.includes('robots')) {
      filename = 'robots.txt';
      mimeType = 'text/plain';
    } else if (tool.includes('sitemap')) {
      filename = 'sitemap.xml';
      mimeType = 'application/xml';
    } else if (tool.includes('angular')) {
      filename = 'seo.service.ts';
      mimeType = 'application/typescript';
    }

    try {
      const blob = new Blob([code], { type: mimeType });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      // client error handler
    }
  }

  // Local storage / Undo Redo triggers
  public saveStateToHistory(): void {
    const state = this.currentOutputCode();
    if (this.historyStack.length === 0 || this.historyStack[this.historyStack.length - 1] !== state) {
      this.historyStack.push(state);
      this.canUndo.set(this.historyStack.length > 1);
    }
  }

  public undo(): void {
    if (this.historyStack.length > 1) {
      const active = this.historyStack.pop();
      if (active) {
        this.redoStack.push(active);
        this.canUndo.set(this.historyStack.length > 1);
        this.canRedo.set(true);
        // Fallback or rehydration is dynamic computed
      }
    }
  }

  public redo(): void {
    if (this.redoStack.length > 0) {
      const restored = this.redoStack.pop();
      if (restored) {
        this.historyStack.push(restored);
        this.canUndo.set(true);
        this.canRedo.set(this.redoStack.length > 0);
      }
    }
  }

  public clearAll(): void {
    // Standard resets to fallback values
    this.metaTitle.set('');
    this.metaDescription.set('');
    this.serpTitle.set('');
    this.serpDescription.set('');
    this.robotsCustomRules.set([]);
    this.faqPairs.set([]);
    this.sitemapUrlsRaw.set('');
    this.saveStateToHistory();
  }
}
