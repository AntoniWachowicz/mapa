/**
 * HTML Sanitization Utilities
 * Provides XSS protection for user-generated HTML content.
 */

import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a'];
const ALLOWED_ATTR = ['href', 'target', 'rel'];

/**
 * Sanitize HTML content to prevent XSS attacks
 * Allows only a safe subset of HTML tags and attributes
 */
export function sanitizeHTML(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') return '';

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false
  });
}

/**
 * Strip all HTML tags from a string
 * Returns plain text content only
 */
export function stripHTML(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]*>/g, '').trim();
}
