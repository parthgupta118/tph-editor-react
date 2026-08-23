const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:'];

// Anything the user types ends up in an href we render. javascript: and data: URLs
// execute, so this is a security boundary, not tidying.
export function safeHref(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;

  // Fragments and site-relative paths never carry a protocol.
  if (trimmed.startsWith('#') || trimmed.startsWith('/')) return trimmed;

  const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    // Parsed only to check the protocol. We hand back what was typed rather than
    // url.href, which would rewrite it — adding trailing slashes and re-encoding.
    const url = new URL(withProtocol);
    return SAFE_PROTOCOLS.includes(url.protocol) ? withProtocol : null;
  } catch {
    return null;
  }
}
