type SongUpdateHandler = (songIds: number[]) => void;
type LyricsChangeHandler = (songId: number) => void;

const handlers = new Set<SongUpdateHandler>();
const lyricsHandlers = new Set<LyricsChangeHandler>();

export const songEvents = {
  onSongUpdated(handler: SongUpdateHandler) {
    handlers.add(handler);
    return () => handlers.delete(handler);
  },

  emitSongUpdated(songIds: number[]) {
    if (songIds.length === 0) return;
    handlers.forEach(h => h(songIds));
  },

  onLyricsChanged(handler: LyricsChangeHandler) {
    lyricsHandlers.add(handler);
    return () => lyricsHandlers.delete(handler);
  },

  emitLyricsChanged(songId: number) {
    lyricsHandlers.forEach(h => h(songId));
  },
};
