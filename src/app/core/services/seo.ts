import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { SITE_CONFIG } from '../../constants/constant';

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly document = inject(DOCUMENT);

  /**
   * Dynamically write SEO attributes
   */
  public updateMetadata(config: {
    title: string;
    description: string;
    slug: string;
    type?: string;
    image?: string;
    faqs?: { question: string; answer: string }[];
    breadcrumbs?: { name: string; url: string }[];
  }): void {
    const fullTitle = `${config.title} | ${SITE_CONFIG.name}`;
    const desc = config.description || SITE_CONFIG.description;
    const cleanSlug = config.slug.startsWith('/') ? config.slug.slice(1) : config.slug;
    
    // Fallback to active browser origin if available, otherwise default base URL
    let origin = SITE_CONFIG.baseUrl;
    try {
      if (this.document && this.document.location) {
        origin = this.document.location.origin || SITE_CONFIG.baseUrl;
      }
    } catch {
      // safe fallback for SSR
    }
    
    const canonicalUrl = `${origin}/${cleanSlug}`.replace(/([^:]\/)\/+/g, "$1"); // prevent triple slashes

    // 1. Update document Title
    this.titleService.setTitle(fullTitle);

    // 2. Head Meta Tags
    this.metaService.updateTag({ name: 'description', content: desc });

    // 3. Open Graph Metadata
    this.metaService.updateTag({ property: 'og:title', content: fullTitle });
    this.metaService.updateTag({ property: 'og:description', content: desc });
    this.metaService.updateTag({ property: 'og:url', content: canonicalUrl });
    this.metaService.updateTag({ property: 'og:type', content: config.type || 'website' });
    this.metaService.updateTag({ property: 'og:site_name', content: SITE_CONFIG.name });
    this.metaService.updateTag({ property: 'og:image', content: config.image || SITE_CONFIG.defaultOgImage });

    // 4. Twitter Cards
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:site', content: SITE_CONFIG.twitterUsername });
    this.metaService.updateTag({ name: 'twitter:title', content: fullTitle });
    this.metaService.updateTag({ name: 'twitter:description', content: desc });
    this.metaService.updateTag({ name: 'twitter:image', content: config.image || SITE_CONFIG.defaultOgImage });

    // 5. Canonical link tag configuration
    this.updateCanonicalLink(canonicalUrl);

    // 6. JSON-LD structured schema injections
    this.updateSchemas(canonicalUrl, config.breadcrumbs, config.faqs, config.title, desc);
  }

  /**
   * Create or update canonical link DOM tag
   */
  private updateCanonicalLink(url: string): void {
    let link: HTMLLinkElement | null = this.document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  /**
   * Set JSON-LD structured schemas
   */
  private updateSchemas(
    canonicalUrl: string,
    breadcrumbs?: { name: string; url: string }[],
    faqs?: { question: string; answer: string }[],
    pageTitle?: string,
    pageDesc?: string
  ): void {
    // Collect schemas
    const schemas: Record<string, unknown>[] = [];

    // WebSite / Tool Schema
    schemas.push({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${canonicalUrl}#webpage`,
      "url": canonicalUrl,
      "name": pageTitle,
      "description": pageDesc,
      "publisher": {
        "@type": "Organization",
        "name": SITE_CONFIG.name,
        "logo": {
          "@type": "ImageObject",
          "url": SITE_CONFIG.defaultOgImage
        }
      }
    });

    // Breadcrumbs Schema
    if (breadcrumbs && breadcrumbs.length > 0) {
      // Find origin
      let origin = SITE_CONFIG.baseUrl;
      try {
        if (this.document && this.document.location) {
          origin = this.document.location.origin || SITE_CONFIG.baseUrl;
        }
      } catch {
        // Safe for server-side-rendering (SSR)
      }

      schemas.push({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbs.map((crumb, idx) => {
          const crumbUrl = crumb.url.startsWith('http') ? crumb.url : `${origin}/${crumb.url.startsWith('/') ? crumb.url.slice(1) : crumb.url}`;
          return {
            "@type": "ListItem",
            "position": idx + 1,
            "name": crumb.name,
            "item": crumbUrl
          };
        })
      });
    }

    // FAQ schema injection
    if (faqs && faqs.length > 0) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map((faq) => ({
          "@type": "Question",
          "name": faq.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.answer
          }
        }))
      });
    }

    // Dynamic Script Element Handling
    const scriptId = 'devsight-jsonld-schemas';
    let scriptTag = this.document.getElementById(scriptId) as HTMLScriptElement | null;
    if (scriptTag) {
      scriptTag.textContent = JSON.stringify(schemas);
    } else {
      scriptTag = this.document.createElement('script');
      scriptTag.id = scriptId;
      scriptTag.type = 'application/ld+json';
      scriptTag.textContent = JSON.stringify(schemas);
      this.document.head.appendChild(scriptTag);
    }
  }
}
