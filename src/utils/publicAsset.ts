/** Resolve bundled public assets for both localhost and a GitHub Pages subpath. */
export function publicAsset(path: string): string {
  return `${import.meta.env?.BASE_URL ?? '/'}${path.replace(/^\/+/, '')}`;
}
