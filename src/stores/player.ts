import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { Song } from '@/types';
import { musicApi } from '@/api/music';
import { Howl, Howler } from 'howler';
import { useToast } from '@/composables/useToast';
import { useLibraryStore } from '@/stores/library';

export const usePlayerStore = defineStore('player', () => {
  const libraryStore = useLibraryStore();
  // State
  const currentSong = ref<Song | null>(null);
  const queue = ref<Song[]>([]);
  const currentIndex = ref(-1);
  const isPlaying = ref(false);
  const volume = ref(1.0);
  const playMode = ref<'sequence' | 'repeat-all' | 'repeat-one' | 'shuffle'>('sequence');
  const quality = ref<'low' | 'medium' | 'high' | 'lossless' | 'original'>('original');
  const progress = ref(0);
  const duration = ref(0);
  
  // 随机播放相关状态
  const shuffleHistory = ref<number[]>([]); // 随机播放历史记录（索引）
  const shuffleRemaining = ref<number[]>([]); // 剩余未播放的歌曲索引
  
  let sound: Howl | null = null;
  let progressInterval: any = null;
  const toast = useToast();
  // We can't use useI18n inside defineStore directly in some setups, but here it's likely fine if called inside actions
  // Or we can just use simple English/Chinese fallback
  
  // Actions
  const initSound = async (song: Song, resetProgress = true) => {
    if (sound) {
      sound.unload();
    }

    if (resetProgress) {
      progress.value = 0;
      duration.value = 0;
    }

    let src: string;
    try {
      const { data } = await musicApi.getStreamToken(song.id, quality.value);
      src = musicApi.buildStreamUrl(song.id, quality.value, data.stream_token);
    } catch {
      toast.error('播放失败: 无法获取播放凭证');
      isPlaying.value = false;
      return;
    }

    sound = new Howl({
      src: [src],
      html5: true,
      format: ['mp3', 'flac', 'wav', 'ogg', 'aac', 'm4a', 'opus', 'webm', 'weba', 'mp4'],
      volume: volume.value,
      onload: () => {
        duration.value = sound?.duration() || 0;
      },
      onplay: () => {
        isPlaying.value = true;
        startProgressTimer();
      },
      onpause: () => {
        isPlaying.value = false;
        stopProgressTimer();
      },
      onend: () => {
        isPlaying.value = false;
        stopProgressTimer();
        next();
      },
      onloaderror: () => {
        isPlaying.value = false;
        toast.error('播放失败: 无法加载音频');
      },
      onplayerror: () => {
        isPlaying.value = false;
        toast.error('播放失败: 发生错误');
      },
      onseek: () => {
      }
    });
  };

  const play = async (song?: Song) => {
    if (song) {
      if (currentSong.value?.id !== song.id) {
        const enrichedSong = { ...song };
        if (!enrichedSong.artist) {
           if (enrichedSong.artist_name) {
             enrichedSong.artist = enrichedSong.artist_name;
           } else {
             const artistName = libraryStore.getArtistName(song.artist_id);
             if (artistName) {
               enrichedSong.artist = artistName;
             }
           }
        }
        currentSong.value = enrichedSong;

        if (!queue.value.find(s => s.id === song.id)) {
          addToQueue(song);
        }
        currentIndex.value = queue.value.findIndex(s => s.id === song.id);
        
        await initSound(song);
      }
    } else if (currentSong.value && !sound) {
      await initSound(currentSong.value, false);
      if (sound && progress.value > 0) {
        (sound as Howl).seek(progress.value);
      }
    }

    if (sound) {
      sound.play();
    } else if (currentSong.value) {
       await initSound(currentSong.value);
       if (sound) {
         (sound as Howl).play();
       }
    }
  };

  const pause = () => {
    sound?.pause();
    // Force update state if sound is not initialized (e.g. after refresh)
    if (!sound) {
      isPlaying.value = false;
    }
  };

  const togglePlay = () => {
    if (isPlaying.value) {
      pause();
    } else {
      play();
    }
  };

  // 初始化随机播放池
  const initShufflePool = () => {
    shuffleRemaining.value = Array.from({ length: queue.value.length }, (_, i) => i);
    // 移除当前正在播放的歌曲
    if (currentIndex.value >= 0) {
      const idx = shuffleRemaining.value.indexOf(currentIndex.value);
      if (idx > -1) {
        shuffleRemaining.value.splice(idx, 1);
      }
    }
  };

  // 获取下一首随机歌曲的索引
  const getNextShuffleIndex = (): number => {
    // 如果剩余池为空，重新初始化（排除当前歌曲）
    if (shuffleRemaining.value.length === 0) {
      initShufflePool();
    }
    
    // 如果还是空（只有一首歌的情况），返回当前索引
    if (shuffleRemaining.value.length === 0) {
      return currentIndex.value;
    }
    
    // 从剩余池中随机选择
    const randomIdx = Math.floor(Math.random() * shuffleRemaining.value.length);
    const nextIndex = shuffleRemaining.value[randomIdx];
    
    // 从剩余池中移除
    shuffleRemaining.value.splice(randomIdx, 1);
    
    return nextIndex;
  };

  const replayCurrentSong = () => {
    if (sound) {
      sound.seek(0);
      progress.value = 0;
      sound.play();
    }
  };

  const stopPlayback = () => {
    if (sound) {
      sound.stop();
    }
    progress.value = 0;
    isPlaying.value = false;
    stopProgressTimer();
  };

  const next = () => {
    if (queue.value.length === 0) return;
    
    let nextIndex = currentIndex.value + 1;
    
    if (playMode.value === 'shuffle') {
      nextIndex = getNextShuffleIndex();
      if (currentIndex.value >= 0) {
        shuffleHistory.value.push(currentIndex.value);
        if (shuffleHistory.value.length > 50) {
          shuffleHistory.value.shift();
        }
      }
    } else if (playMode.value === 'repeat-one') {
      nextIndex = currentIndex.value;
    } else if (playMode.value === 'repeat-all') {
      if (nextIndex >= queue.value.length) {
        nextIndex = 0;
      }
    } else {
      // 顺序播放：播放完最后一首后停止
      if (nextIndex >= queue.value.length) {
        stopPlayback();
        return;
      }
    }
    
    if (nextIndex === currentIndex.value) {
      replayCurrentSong();
      return;
    }
    
    currentIndex.value = nextIndex;
    play(queue.value[nextIndex]);
  };

  const prev = () => {
    if (queue.value.length === 0) return;
    
    let prevIndex = currentIndex.value - 1;
    
    if (playMode.value === 'shuffle') {
      if (shuffleHistory.value.length > 0) {
        prevIndex = shuffleHistory.value.pop()!;
        if (currentIndex.value >= 0 && !shuffleRemaining.value.includes(currentIndex.value)) {
          shuffleRemaining.value.push(currentIndex.value);
        }
      } else {
        prevIndex = getNextShuffleIndex();
      }
    } else {
      if (prevIndex < 0) prevIndex = queue.value.length - 1;
    }
    
    if (prevIndex === currentIndex.value) {
      replayCurrentSong();
      return;
    }
    
    currentIndex.value = prevIndex;
    play(queue.value[prevIndex]);
  };

  const seek = (time: number) => {
    sound?.seek(time);
    progress.value = time;
  };

  const setVolume = (vol: number) => {
    volume.value = vol;
    Howler.volume(vol);
  };

  const addToQueue = (song: Song) => {
    queue.value.push(song);
  };

  const setQueue = (songs: Song[]) => {
    queue.value = [...songs];
    currentIndex.value = 0;
    // 初始化随机播放池
    if (playMode.value === 'shuffle') {
      initShufflePool();
    }
  };
  
  // 监听播放模式变化
  watch(playMode, (newMode, oldMode) => {
    if (newMode === 'shuffle') {
      // 切换到随机模式时，初始化随机播放池
      shuffleHistory.value = [];
      initShufflePool();
    } else if (oldMode === 'shuffle') {
      // 离开随机模式时，清空历史和剩余池
      shuffleHistory.value = [];
      shuffleRemaining.value = [];
    }
  });
  
  // 监听队列变化
  watch(queue, () => {
    if (playMode.value === 'shuffle') {
      // 队列改变时，重新初始化随机播放池
      initShufflePool();
    }
  });
  
  const startProgressTimer = () => {
    stopProgressTimer();
    progressInterval = setInterval(() => {
      if (sound && isPlaying.value) {
        progress.value = sound.seek() as number;
      }
    }, 1000);
  };
  
  const stopProgressTimer = () => {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  };

  const clearQueue = () => {
    if (sound) {
      sound.stop();
      sound.unload();
      sound = null;
    }
    currentSong.value = null;
    queue.value = [];
    currentIndex.value = -1;
    isPlaying.value = false;
    progress.value = 0;
    duration.value = 0;
    stopProgressTimer();
  };

  return {
    currentSong,
    queue,
    currentIndex,
    isPlaying,
    volume,
    playMode,
    quality,
    progress,
    duration,
    play,
    pause,
    togglePlay,
    next,
    prev,
    seek,
    setVolume,
    addToQueue,
    setQueue,
    clearQueue
  };
}, {
  persist: {
    paths: ['currentSong', 'queue', 'currentIndex', 'volume', 'playMode', 'quality', 'progress', 'duration'],
    afterRestore: (ctx: any) => {
      // Ensure isPlaying is false on restore to avoid UI showing pause button when no audio is playing
      ctx.store.isPlaying = false;
    }
  } as any
});
