import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';
import 'package:audio_service/audio_service.dart';
import 'package:youtube_explode_dart/youtube_explode_dart.dart';
import 'youtube_service.dart';
import 'models/song.dart';
import 'services/music_repository.dart';

/// Global reference to the AudioPlayerHandler created by AudioService.init().
/// This is typed as AudioPlayerHandler so we can access its BehaviorSubjects.
late AudioPlayerHandler audioHandler;

/// The main audio manager singleton used throughout the app.
class AudioManager extends ChangeNotifier {
  // Singleton pattern
  static final AudioManager _instance = AudioManager._internal();
  factory AudioManager() => _instance;
  AudioManager._internal();

  final AudioPlayer audioPlayer = AudioPlayer();
  final YoutubeExplode ytExplode = YoutubeExplode();
  final MusicRepository _musicRepo = MusicRepository();

  // Current track info (unified Song model)
  Song? currentSong;
  // Legacy support: keep currentTrack for backward compatibility
  YTTrack? currentTrack;

  List<Song> songQueue = [];
  List<YTTrack> queue = [];
  int currentIndex = -1;
  bool isPlaying = false;
  Duration currentPosition = Duration.zero;
  Duration totalDuration = Duration.zero;

  /// The source currently being used for playback.
  MusicSource? currentSource;

  void init() {
    audioPlayer.playerStateStream.listen((state) {
      isPlaying = state.playing;
      if (state.processingState == ProcessingState.completed) {
        playNext();
      }
      _broadcastState();
      notifyListeners();
    });

    audioPlayer.positionStream.listen((position) {
      currentPosition = position;
      _broadcastState();
      notifyListeners();
    });

    audioPlayer.durationStream.listen((duration) {
      if (duration != null) {
        totalDuration = duration;
        _broadcastState();
        notifyListeners();
      }
    });
  }

  /// Broadcast the current playback state to the notification / lock screen.
  void _broadcastState() {
    final controls = <MediaControl>[
      MediaControl.skipToPrevious,
      if (isPlaying) MediaControl.pause else MediaControl.play,
      MediaControl.skipToNext,
    ];

    audioHandler.playbackState.add(
      PlaybackState(
        controls: controls,
        systemActions: const {
          MediaAction.seek,
          MediaAction.seekForward,
          MediaAction.seekBackward,
        },
        androidCompactActionIndices: const [0, 1, 2],
        processingState: _mapProcessingState(audioPlayer.processingState),
        playing: isPlaying,
        updatePosition: currentPosition,
        bufferedPosition: audioPlayer.bufferedPosition,
        speed: audioPlayer.speed,
      ),
    );
  }

  AudioProcessingState _mapProcessingState(ProcessingState state) {
    switch (state) {
      case ProcessingState.idle:
        return AudioProcessingState.idle;
      case ProcessingState.loading:
        return AudioProcessingState.loading;
      case ProcessingState.buffering:
        return AudioProcessingState.buffering;
      case ProcessingState.ready:
        return AudioProcessingState.ready;
      case ProcessingState.completed:
        return AudioProcessingState.completed;
    }
  }

  // -----------------------------------------------------------------------
  // NEW: Play a unified Song (from MusicRepository)
  // -----------------------------------------------------------------------

  /// Play a [Song] from any source (JioSaavn, YouTube Music, YouTube).
  ///
  /// If the song has a direct audio URL (JioSaavn), it plays immediately.
  /// Otherwise, it resolves the URL via [MusicRepository].
  Future<void> playSong(Song song, {List<Song>? playlist}) async {
    try {
      if (playlist != null) {
        songQueue = playlist;
        currentIndex = songQueue.indexWhere((s) => s.id == song.id);
      } else if (!songQueue.any((s) => s.id == song.id)) {
        songQueue.add(song);
        currentIndex = songQueue.length - 1;
      } else {
        currentIndex = songQueue.indexWhere((s) => s.id == song.id);
      }

      currentSong = song;
      currentSource = song.source;
      // Keep legacy field in sync
      currentTrack = YTTrack(
        videoId: song.videoId ?? song.id,
        title: song.title,
        artist: song.artist,
        thumbnail: song.thumbnail,
      );
      notifyListeners();

      // Update the media item shown in the notification
      audioHandler.mediaItem.add(
        MediaItem(
          id: song.id,
          title: song.title,
          artist: song.artist,
          artUri: song.thumbnail.isNotEmpty
              ? Uri.tryParse(song.thumbnail)
              : null,
          duration: song.duration ?? totalDuration,
        ),
      );

      // Resolve the playable URL
      String? audioUrl = song.audioUrl;

      if (audioUrl == null || audioUrl.isEmpty) {
        // Use MusicRepository to resolve the URL with fallback
        final result = await _musicRepo.getPlayableSong(song);
        switch (result) {
          case MusicSuccess<Song>():
            audioUrl = result.data.audioUrl;
            currentSong = result.data;
            currentSource = result.data.source;
            notifyListeners();
          case MusicError<Song>():
            debugPrint('All sources failed: ${result.message}');
            return;
        }
      }

      if (audioUrl == null || audioUrl.isEmpty) {
        debugPrint('No audio URL available for: ${song.title}');
        return;
      }

      await audioPlayer.setUrl(audioUrl);
      await audioPlayer.play();
    } catch (e) {
      debugPrint('Error playing song: $e');
      // On error, try fallback via repository
      _attemptFallback(song);
    }
  }

  /// Attempt to play from an alternate source when primary playback fails.
  Future<void> _attemptFallback(Song song) async {
    try {
      final result = await _musicRepo.getPlayableSong(song);
      switch (result) {
        case MusicSuccess<Song>():
          final fallbackUrl = result.data.audioUrl;
          if (fallbackUrl != null && fallbackUrl.isNotEmpty) {
            currentSong = result.data;
            currentSource = result.data.source;
            notifyListeners();
            await audioPlayer.setUrl(fallbackUrl);
            await audioPlayer.play();
          }
        case MusicError<Song>():
          debugPrint('Fallback also failed: ${result.message}');
      }
    } catch (e) {
      debugPrint('Fallback playback error: $e');
    }
  }

  // -----------------------------------------------------------------------
  // LEGACY: Play a YTTrack (backward compatibility for playlists)
  // -----------------------------------------------------------------------

  Future<void> playTrack(YTTrack track, {List<YTTrack>? playlist}) async {
    try {
      if (playlist != null) {
        queue = playlist;
        currentIndex = queue.indexWhere((t) => t.videoId == track.videoId);
      } else if (!queue.any((t) => t.videoId == track.videoId)) {
        queue.add(track);
        currentIndex = queue.length - 1;
      } else {
        currentIndex = queue.indexWhere((t) => t.videoId == track.videoId);
      }

      currentTrack = track;
      currentSong = track.toSong();
      currentSource = MusicSource.youtube;
      notifyListeners();

      // Update the media item shown in the notification
      audioHandler.mediaItem.add(
        MediaItem(
          id: track.videoId,
          title: track.title,
          artist: track.artist,
          artUri: track.thumbnail.isNotEmpty
              ? Uri.tryParse(track.thumbnail)
              : null,
          duration: totalDuration,
        ),
      );

      // Get manifest and audio stream from YouTube
      var manifest = await ytExplode.videos.streamsClient.getManifest(
        track.videoId,
      );
      var streamInfo = manifest.audioOnly.withHighestBitrate();

      await audioPlayer.setUrl(streamInfo.url.toString());
      await audioPlayer.play();
    } catch (e) {
      debugPrint("Error playing track: $e");
    }
  }

  Future<void> pause() async {
    await audioPlayer.pause();
  }

  Future<void> resume() async {
    await audioPlayer.play();
  }

  Future<void> togglePlayPause() async {
    if (audioPlayer.playing) {
      await pause();
    } else {
      await resume();
    }
  }

  Future<void> playNext() async {
    // If using new Song queue
    if (songQueue.isNotEmpty) {
      if (currentIndex < songQueue.length - 1) {
        currentIndex++;
        await playSong(songQueue[currentIndex]);
      } else {
        await pause();
      }
      return;
    }

    // Legacy YTTrack queue
    if (queue.isEmpty) return;
    if (currentIndex < queue.length - 1) {
      currentIndex++;
      await playTrack(queue[currentIndex]);
    } else {
      await pause();
    }
  }

  Future<void> playPrevious() async {
    if (currentPosition.inSeconds > 3) {
      await seek(Duration.zero);
      return;
    }

    // If using new Song queue
    if (songQueue.isNotEmpty) {
      if (currentIndex > 0) {
        currentIndex--;
        await playSong(songQueue[currentIndex]);
      }
      return;
    }

    // Legacy YTTrack queue
    if (queue.isEmpty) return;
    if (currentIndex > 0) {
      currentIndex--;
      await playTrack(queue[currentIndex]);
    }
  }

  Future<void> seek(Duration position) async {
    await audioPlayer.seek(position);
  }

  @override
  void dispose() {
    ytExplode.close();
    audioPlayer.dispose();
    _musicRepo.dispose();
    super.dispose();
  }
}

// ---------------------------------------------------------------------------
// AudioPlayerHandler — the BaseAudioHandler that AudioService.init() creates.
// It delegates every action to the AudioManager singleton.
// The BehaviorSubjects (playbackState, mediaItem, queue) are inherited from
// BaseAudioHandler and are writable.
// ---------------------------------------------------------------------------
class AudioPlayerHandler extends BaseAudioHandler with SeekHandler {
  final AudioManager _manager = AudioManager();

  @override
  Future<void> play() async => _manager.resume();

  @override
  Future<void> pause() async => _manager.pause();

  @override
  Future<void> stop() async {
    await _manager.audioPlayer.stop();
    await super.stop();
  }

  @override
  Future<void> seek(Duration position) async => _manager.seek(position);

  @override
  Future<void> skipToNext() async => _manager.playNext();

  @override
  Future<void> skipToPrevious() async => _manager.playPrevious();

  @override
  Future<void> onTaskRemoved() async {
    await _manager.audioPlayer.stop();
    await super.onTaskRemoved();
  }
}

// ---------------------------------------------------------------------------
// Call this once in main() before AudioManager().init()
// ---------------------------------------------------------------------------
Future<void> initAudioService() async {
  audioHandler = await AudioService.init(
    builder: () => AudioPlayerHandler(),
    config: const AudioServiceConfig(
      androidNotificationChannelId:
          'com.example.orbit_music_flutter.channel.audio',
      androidNotificationChannelName: 'Orbit Music',
      androidNotificationOngoing: true,
      androidStopForegroundOnPause: true,
      androidNotificationIcon: 'mipmap/ic_launcher',
      androidShowNotificationBadge: true,
    ),
  );
}
