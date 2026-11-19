// jsdom has no matchMedia, so useMediaQuery reports false for every query (the phone layout).
// stubMatchMedia makes the given queries match, e.g. the desktop table layout:
//   beforeEach(() => stubMatchMedia([TABLE_QUERY]));  afterEach(unstubMatchMedia);

export function stubMatchMedia(matching = []) {
  globalThis.matchMedia = (query) => ({
    matches: matching.includes(query),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  });
}

export function unstubMatchMedia() {
  delete globalThis.matchMedia;
}
