import { useEffect } from 'react';

export interface SeoProps {
  title: string;
  description: string;
  image?: string | null;
  url?: string;
  noindex?: boolean;
}

function setMeta(attribute: 'name' | 'property', key: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setLink(rel: string, href: string): void {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

function absolute(value: string): string {
  try {
    return new URL(value, window.location.origin).toString();
  } catch {
    return value;
  }
}

function shorten(value: string, limit = 160): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit - 1).trimEnd()}…`;
}

/** Keeps the document head in sync with the class being viewed. */
export function Seo({ title, description, image, url, noindex = false }: SeoProps) {
  useEffect(() => {
    document.title = title;
    const summary = shorten(description);
    setMeta('name', 'description', summary);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', summary);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', 'TuitEase');
    setMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', summary);
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    if (url) {
      setMeta('property', 'og:url', absolute(url));
      setLink('canonical', absolute(url));
    }
    if (image) {
      setMeta('property', 'og:image', absolute(image));
      setMeta('name', 'twitter:image', absolute(image));
    }
  }, [title, description, image, url, noindex]);

  return null;
}
