import { Injectable } from '@nestjs/common';

@Injectable()
export class HtmlSanitizerService {
  /**
   * Sanitize HTML content for CMS use
   * Source: HtmlSanitizer::sanitizeCms from AdminBlogController.store
   */
  sanitizeCms(content: string): string {
    if (!content) {
      return '';
    }

    // Basic HTML sanitization for CMS content
    // In a real implementation, this would use a library like DOMPurify or similar
    
    // Allow common CMS tags but sanitize dangerous ones
    const allowedTags = [
      'p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'strong', 'em', 'b', 'i', 'u', 'br', 'hr',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
      'a', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th'
    ];

    const allowedAttributes = [
      'href', 'src', 'alt', 'title', 'class', 'id',
      'target', 'rel', 'width', 'height'
    ];

    // Remove script tags and other dangerous elements
    let sanitized = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
    sanitized = sanitized.replace(/<embed\b[^>]*>/gi, '');
    sanitized = sanitized.replace(/<link\b[^>]*>/gi, '');
    sanitized = sanitized.replace(/<meta\b[^>]*>/gi, '');
    sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Remove onclick and other event handlers
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^>\s]+/gi, '');

    // Remove javascript: urls
    sanitized = sanitized.replace(/javascript:/gi, '');

    // Remove data: urls except for images
    sanitized = sanitized.replace(/data:(?!image\/)/gi, '');

    return sanitized.trim();
  }

  /**
   * Sanitize user input for basic use
   */
  sanitizeUserInput(input: string): string {
    if (!input) {
      return '';
    }

    // Strip all HTML tags for basic user input
    return input.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Sanitize and truncate text for excerpts
   */
  sanitizeExcerpt(content: string, maxLength = 160): string {
    if (!content) {
      return '';
    }

    // Strip HTML tags and truncate
    const stripped = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    
    if (stripped.length <= maxLength) {
      return stripped;
    }

    // Truncate at word boundary
    const truncated = stripped.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
  }
}