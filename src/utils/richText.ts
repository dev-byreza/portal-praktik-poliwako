const HTML_PATTERN = /<\/?[a-z][^>]*>/i;

const allowedTags = new Set([
  'P', 'DIV', 'BR', 'H2', 'H3', 'H4', 'STRONG', 'B', 'EM', 'I', 'U',
  'UL', 'OL', 'LI', 'A', 'IMG', 'HR', 'SPAN',
]);

const safeImageSource = (value: string): boolean => (
  /^https?:\/\//i.test(value)
  || /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value)
);

const safeLink = (value: string): boolean => /^(https?:|mailto:|#)/i.test(value);

/**
 * Keeps only the small, presentation-focused HTML subset produced by the
 * local editor. This makes it safe to render instructor-authored content in
 * the student portal without allowing scripts, event handlers, or embeds.
 */
export const sanitizeRichTextHtml = (value?: string): string => {
  if (!value || typeof DOMParser === 'undefined') return '';
  if (!HTML_PATTERN.test(value)) return toRichTextHtml(value);
  const source = new DOMParser().parseFromString(value, 'text/html');
  const output = document.createElement('div');

  const copyNode = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent || '');
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const sourceElement = node as HTMLElement;
    const tagName = sourceElement.tagName.toUpperCase();
    const fragment = document.createDocumentFragment();

    if (!allowedTags.has(tagName)) {
      Array.from(sourceElement.childNodes).forEach(child => {
        const safeChild = copyNode(child);
        if (safeChild) fragment.appendChild(safeChild);
      });
      return fragment;
    }

    const cleanElement = document.createElement(tagName.toLowerCase());
    if (tagName === 'A') {
      const href = sourceElement.getAttribute('href') || '';
      if (safeLink(href)) {
        cleanElement.setAttribute('href', href);
        cleanElement.setAttribute('target', '_blank');
        cleanElement.setAttribute('rel', 'noopener noreferrer');
      }
    }
    if (tagName === 'IMG') {
      const src = sourceElement.getAttribute('src') || '';
      if (!safeImageSource(src)) return null;
      cleanElement.setAttribute('src', src);
      cleanElement.setAttribute('alt', sourceElement.getAttribute('alt') || 'Gambar materi');
      cleanElement.setAttribute('loading', 'lazy');
    }

    const alignment = sourceElement.style.textAlign;
    if (['left', 'center', 'right', 'justify'].includes(alignment)) {
      cleanElement.style.textAlign = alignment;
    }

    Array.from(sourceElement.childNodes).forEach(child => {
      const safeChild = copyNode(child);
      if (safeChild) cleanElement.appendChild(safeChild);
    });
    return cleanElement;
  };

  Array.from(source.body.childNodes).forEach(node => {
    const safeNode = copyNode(node);
    if (safeNode) output.appendChild(safeNode);
  });
  return output.innerHTML;
};

/** Converts legacy plain-text notes to safe paragraph HTML for the editor. */
export const toRichTextHtml = (value?: string): string => {
  const text = String(value || '').trim();
  if (!text) return '';
  if (HTML_PATTERN.test(text)) return sanitizeRichTextHtml(text);

  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .split(/\r?\n{2,}/)
    .map(paragraph => `<p>${paragraph.replace(/\r?\n/g, '<br>') || '<br>'}</p>`)
    .join('');
};

export const richTextToPlainText = (value?: string): string => {
  if (!value) return '';
  if (!HTML_PATTERN.test(value)) return value;
  if (typeof DOMParser === 'undefined') return value.replace(/<[^>]+>/g, ' ');
  return new DOMParser().parseFromString(sanitizeRichTextHtml(value), 'text/html').body.textContent || '';
};
