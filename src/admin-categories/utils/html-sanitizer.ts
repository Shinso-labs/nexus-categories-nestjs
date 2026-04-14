export class HtmlSanitizer {
  static sanitizeCms(html: string): string {
    if (!html) return '';
    
    // Basic HTML sanitization - in production, use a proper library like DOMPurify
    // This is a simplified version for demonstration
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
}