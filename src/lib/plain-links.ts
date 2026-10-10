// Discord descriptions use bare URLs so pasted links do not acquire Markdown wrappers.
export function plainLinks(text: string): string {
  return text.replace(/\[([^\]\n]*)\]\((https?:\/\/(?:[^\s()]|\([^\s()]*\))+)\)/gi,
    (_match, label: string, url: string) => /^https?:\/\//i.test(label.trim()) ? url : `${label}: ${url}`);
}
