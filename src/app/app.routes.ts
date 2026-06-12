import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./routes/landing/landing').then(m => m.LandingPageComponent)
  },
  {
    path: 'category/:slug',
    loadComponent: () => import('./routes/category/category').then(m => m.CategoryPageComponent)
  },
  {
    path: 'tools/:slug',
    loadComponent: () => import('./routes/tool/tool-wrapper').then(m => m.ToolWrapperComponent)
  },
  {
    path: 'seo/:slug',
    loadComponent: () => import('./routes/tool/tool-wrapper').then(m => m.ToolWrapperComponent)
  },
  {
    path: 'about',
    loadComponent: () => import('./routes/static/static').then(m => m.StaticPageComponent)
  },
  {
    path: 'contact',
    loadComponent: () => import('./routes/static/static').then(m => m.StaticPageComponent)
  },
  {
    path: 'privacy-policy',
    loadComponent: () => import('./routes/static/static').then(m => m.StaticPageComponent)
  },
  {
    path: 'terms',
    loadComponent: () => import('./routes/static/static').then(m => m.StaticPageComponent)
  },
  {
    path: 'faq',
    loadComponent: () => import('./routes/static/static').then(m => m.StaticPageComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
