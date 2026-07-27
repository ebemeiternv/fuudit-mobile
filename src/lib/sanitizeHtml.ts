import DOMPurify from "dompurify";

/**
 * Sanitize HTML returned by Spoonacular before rendering.
 * Allows only inline formatting + safe links; strips scripts, styles, event handlers.
 */
export const sanitizeHtml = (html: string | null | undefined): string => {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "strong", "i", "em", "u", "a", "p", "br", "ul", "ol", "li", "span"],
    ALLOWED_ATTR: ["href", "title", "target", "rel"],
    ALLOW_DATA_ATTR: false,
  });
};
