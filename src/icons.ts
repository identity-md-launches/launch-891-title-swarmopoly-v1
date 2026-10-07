export function icon(name: string, cls = ""): string {
  const paths: Record<string, string> = {
    imp: '<path d="m5 4 6 4h2l6-4-1 12-6 5-6-5Z"/><path d="m8 11 2 1-2 1m8-2-2 1 2 1m-6 4h4"/>',
    seat: '<path d="M7 13V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v8M5 11v6h14v-6M7 17v4m10-4v4M5 14h14"/>',
    dog: '<path d="m8 7-3-3-3 8 5 1m9-6 3-3 3 8-5 1M8 6h8l2 9-6 6-6-6Z"/><path d="M9 11h.01M15 11h.01M10 15h4l-2 2Z"/>',
    orb: '<circle cx="12" cy="12" r="7"/><ellipse cx="12" cy="12" rx="11" ry="3.5" transform="rotate(-35 12 12)"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01"/>',
    pass: '<path d="M3 7h18v4a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4Zm12 0v11"/>',
    lore: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',
    signal: '<path d="m13 2-8 12h6l-1 8 9-12h-7Z"/>',
    fee: '<path d="M13 2s2 6-2 8c-2-1-2-3-2-3s-5 5-4 9a7 7 0 0 0 14 0c0-4-4-7-4-7s1 5-2 5"/>',
    jail: '<rect x="3" y="9" width="18" height="12" rx="3"/><path d="M7 9V6a5 5 0 0 1 10 0v3m-5 5v3"/>',
    gotojail: '<path d="m4 4 16 16M20 4 4 20"/><circle cx="12" cy="12" r="9"/>',
    park: '<path d="M12 22V10m0 5c-7 0-9-5-9-11 7 0 9 4 9 8m0 5c7 0 9-5 9-11-7 0-9 4-9 8"/>',
    start: '<path d="M4 12h15m-7-7 7 7-7 7"/>',
    utility: '<path d="M5 3v5m14-5v5M3 8h18v4a9 9 0 0 1-18 0Zm9 13v2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    play: '<path d="m8 4 12 8-12 8Z"/>',
    sound:
      '<path d="m11 4-6 5H2v6h3l6 5Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    mute: '<path d="m11 4-6 5H2v6h3l6 5Zm5 5 6 6m0-6-6 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trophy:
      '<path d="M7 3h10v8a5 5 0 0 1-10 0Zm0 2H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4m-5 4v5m-4 0h8"/>',
    book: '<path d="M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1Zm0 0v15"/>',
  };
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.orb}</svg>`;
}
export function die(n: number): string {
  const pips: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  return `<span class="die" aria-hidden="true">${Array.from({ length: 9 }, (_, i) => `<i class="${pips[n].includes(i) ? "pip" : ""}"></i>`).join("")}</span>`;
}
