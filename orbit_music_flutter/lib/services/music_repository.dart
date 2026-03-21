import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/song.dart';
import 'jiosaavn_service.dart';
import 'youtube_music_service.dart';

/// Result type for music operations.
sealed class MusicResult<T> {
  const MusicResult();
}

class MusicSuccess<T> extends MusicResult<T> {
  final T data;
  const MusicSuccess(this.data);
}

class MusicError<T> extends MusicResult<T> {
  final String message;
  const MusicError(this.message);
}

/// Central repository that coordinates between multiple music sources.
///
/// Implements a prioritized fallback strategy:
///   1. JioSaavn (best for Tamil/Indian music, 320kbps)
///   2. YouTube Music (higher bitrate via youtube_explode_dart)
///   3. Legacy YouTube (existing youtube_explode_dart fallback)
///
/// Caches the successful source per song in SharedPreferences
/// so future plays can skip failed sources.
class MusicRepository {
  // Singleton
  static final MusicRepository _instance = MusicRepository._internal();
  factory MusicRepository() => _instance;
  MusicRepository._internal();

  final JioSaavnService _jiosaavnService = JioSaavnService();
  final YouTubeMusicService _ytMusicService = YouTubeMusicService();

  /// Search for songs across all sources and merge results.
  ///
  /// JioSaavn results come first (higher quality for Indian music),
  /// followed by YouTube Music results, deduplicated by title similarity.
  Future<List<Song>> searchSongs(String query) async {
    final List<Song> allResults = [];
    final Set<String> seenTitles = {};

    // Fetch from both sources in parallel
    final futures = await Future.wait([
      _jiosaavnService.searchSongs(query).catchError((e) {
        debugPrint('JioSaavn search failed in repo: $e');
        return <Song>[];
      }),
      _ytMusicService.searchSongs(query).catchError((e) {
        debugPrint('YT Music search failed in repo: $e');
        return <Song>[];
      }),
    ]);

    final jiosaavnResults = futures[0];
    final ytMusicResults = futures[1];

    // Add JioSaavn results first (priority source)
    for (final song in jiosaavnResults) {
      final normalizedTitle = _normalizeTitle(song.title);
      if (!seenTitles.contains(normalizedTitle)) {
        seenTitles.add(normalizedTitle);
        allResults.add(song);
      }
    }

    // Add YouTube Music results, skipping duplicates
    for (final song in ytMusicResults) {
      final normalizedTitle = _normalizeTitle(song.title);
      if (!seenTitles.contains(normalizedTitle)) {
        seenTitles.add(normalizedTitle);
        allResults.add(song);
      }
    }

    return allResults;
  }

  /// Get a playable audio URL for a song, using fallback strategy.
  ///
  /// For JioSaavn songs: uses the direct `audioUrl` if available.
  /// For YouTube songs: extracts stream URL via youtube_explode_dart.
  ///
  /// If the primary source fails, attempts alternate sources by
  /// searching for the song by title.
  Future<MusicResult<Song>> getPlayableSong(Song song) async {
    // 1. If the song already has a direct audio URL (JioSaavn), verify it
    if (song.hasDirectUrl) {
      debugPrint('Playing from ${song.sourceLabel}: ${song.title}');
      return MusicSuccess(song);
    }

    // 2. If the song has a videoId, extract audio URL
    if (song.needsStreamExtraction) {
      try {
        final audioUrl = await _ytMusicService.getAudioUrl(song.videoId!);
        if (audioUrl != null && audioUrl.isNotEmpty) {
          final bitrate = await _ytMusicService.getBestBitrate(song.videoId!);
          debugPrint('Playing from ${song.sourceLabel}: ${song.title} @ ${bitrate}kbps');
          return MusicSuccess(song.copyWith(audioUrl: audioUrl, bitrate: bitrate));
        }
      } catch (e) {
        debugPrint('Stream extraction failed for ${song.videoId}: $e');
      }
    }

    // 3. Fallback: search for the song by title on JioSaavn
    debugPrint('Attempting JioSaavn fallback for: ${song.title}');
    try {
      final jiosaavnResults = await _jiosaavnService.searchSongs(
        '${song.title} ${song.artist}',
      );
      for (final result in jiosaavnResults) {
        if (result.hasDirectUrl) {
          debugPrint('JioSaavn fallback succeeded: ${result.title}');
          await _cacheSourcePreference(song.id, MusicSource.jiosaavn);
          return MusicSuccess(result);
        }
      }
    } catch (e) {
      debugPrint('JioSaavn fallback error: $e');
    }

    // 4. Fallback: search on YouTube Music
    debugPrint('Attempting YouTube Music fallback for: ${song.title}');
    try {
      final ytResults = await _ytMusicService.searchSongs(
        '${song.title} ${song.artist}',
        maxResults: 5,
      );
      for (final result in ytResults) {
        if (result.videoId != null) {
          final audioUrl = await _ytMusicService.getAudioUrl(result.videoId!);
          if (audioUrl != null && audioUrl.isNotEmpty) {
            debugPrint('YT Music fallback succeeded: ${result.title}');
            await _cacheSourcePreference(song.id, MusicSource.youtubeMusic);
            return MusicSuccess(result.copyWith(audioUrl: audioUrl));
          }
        }
      }
    } catch (e) {
      debugPrint('YT Music fallback error: $e');
    }

    return const MusicError('Song unavailable from all sources');
  }

  /// Cache which source worked for a song so future plays skip failed sources.
  Future<void> _cacheSourcePreference(String songId, MusicSource source) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('source_$songId', source.name);
    } catch (e) {
      debugPrint('Error caching source preference: $e');
    }
  }

  /// Get cached source preference for a song.
  Future<MusicSource?> getCachedSource(String songId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final sourceName = prefs.getString('source_$songId');
      if (sourceName == null) return null;
      return MusicSource.values.firstWhere(
        (s) => s.name == sourceName,
        orElse: () => MusicSource.youtube,
      );
    } catch (e) {
      return null;
    }
  }

  /// Normalize a title for deduplication (lowercase, strip common suffixes).
  String _normalizeTitle(String title) {
    return title
        .toLowerCase()
        .replaceAll(RegExp(r'\s*[\(\[].*?[\)\]]'), '') // Remove (Official Video) etc.
        .replaceAll(RegExp(r'[^\w\s]'), '')             // Remove special chars
        .replaceAll(RegExp(r'\s+'), ' ')                 // Collapse whitespace
        .trim();
  }

  void dispose() {
    _ytMusicService.dispose();
  }
}
