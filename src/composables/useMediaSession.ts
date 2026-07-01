import type { Song } from '@/types';

type PlayerCallbacks = {
  play: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  seek: (position: number) => void;
  getPosition: () => number;
  getDuration: () => number;
  onUnexpectedPause?: () => void;
};

let callbacks: PlayerCallbacks | null = null;
let positionTimer: ReturnType<typeof setInterval> | null = null;
let audioListenersAttached = false;

const isMediaSessionSupported = () =>
  typeof navigator !== 'undefined' && 'mediaSession' in navigator;

export function attachMediaSessionHandlers(cbs: PlayerCallbacks) {
  if (!isMediaSessionSupported()) return;
  callbacks = cbs;

  const actions: Array<[MediaSessionAction, (() => void) | null]> = [
    ['play', () => callbacks?.play()],
    ['pause', () => callbacks?.pause()],
    ['previoustrack', () => callbacks?.previous()],
    ['nexttrack', () => callbacks?.next()],
    ['stop', () => callbacks?.pause()],
    ['seekbackward', () => {
      const pos = callbacks?.getPosition() ?? 0;
      callbacks?.seek(Math.max(0, pos - 10));
    }],
    ['seekforward', () => {
      const pos = callbacks?.getPosition() ?? 0;
      const dur = callbacks?.getDuration() ?? 0;
      callbacks?.seek(Math.min(dur, pos + 10));
    }],
    ['seekto', null],
  ];

  for (const [action, handler] of actions) {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      // 部分浏览器不支持特定 action
    }
  }

  try {
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime != null) callbacks?.seek(details.seekTime);
    });
  } catch { /* noop */ }

  if (!positionTimer) {
    positionTimer = setInterval(updatePositionState, 1000);
  }
}

export function updateMediaSessionMetadata(song: Song | null) {
  if (!isMediaSessionSupported() || !song) {
    if (isMediaSessionSupported()) {
      navigator.mediaSession.metadata = null;
    }
    return;
  }

  const artist = song.artist || song.artist_name || '';
  const album = song.album || song.album_name || '';
  const artwork: MediaImage[] = [];
  if (song.cover_id) {
    const url = `/api/covers/${song.cover_id}`;
    artwork.push({ src: url, sizes: '512x512', type: 'image/jpeg' });
    artwork.push({ src: url, sizes: '256x256', type: 'image/jpeg' });
  }

  navigator.mediaSession.metadata = new MediaMetadata({
    title: song.title || 'Unknown',
    artist,
    album,
    artwork,
  });
}

export function setMediaSessionPlaybackState(playing: boolean) {
  if (!isMediaSessionSupported()) return;
  try {
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  } catch { /* noop */ }
}

export function updatePositionState() {
  if (!isMediaSessionSupported() || !callbacks) return;
  const duration = callbacks.getDuration();
  if (!duration || !isFinite(duration) || duration <= 0) return;
  const position = callbacks.getPosition();
  try {
    navigator.mediaSession.setPositionState({
      duration,
      playbackRate: 1,
      position: Math.min(position, duration),
    });
  } catch { /* noop */ }
}

/** 绑定 HTMLAudioElement 事件以检测非用户主动的暂停（如蓝牙断开） */
export function bindAudioElementEvents(audio: HTMLAudioElement) {
  if (audioListenersAttached) return;
  audioListenersAttached = true;

  audio.addEventListener('pause', () => {
    callbacks?.onUnexpectedPause?.();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && callbacks) {
      updatePositionState();
    }
  });

  window.addEventListener('focus', () => updatePositionState());
}

export function detachMediaSession() {
  if (positionTimer) {
    clearInterval(positionTimer);
    positionTimer = null;
  }
  callbacks = null;
  audioListenersAttached = false;
  if (isMediaSessionSupported()) {
    navigator.mediaSession.metadata = null;
    try {
      navigator.mediaSession.playbackState = 'none';
    } catch { /* noop */ }
  }
}
