import 'package:flutter/foundation.dart';
import 'package:youtube_explode_dart/youtube_explode_dart.dart';
import '../models/song.dart';

/// Enhanced YouTube Music service using youtube_explode_dart.
///
/// This differs from the legacy YouTubeService by:
/// - Searching specifically for music content
/// - Extracting the highest-bitrate audio-only stream
/// - Preferring audio codecs like Opus/AAC for better quality
/// - Better metadata extraction
class YouTubeMusicService {
  final YoutubeExplode _ytExplode;

  YouTubeMusicService({YoutubeExplode? ytExplode})
      : _ytExplode = ytExplode ?? YoutubeExplode();

  /// Search for songs using YouTube's search with music filtering.
  ///
  /// Returns up to [maxResults] songs with metadata extracted from
  /// YouTube video information.
  Future<List<Song>> searchSongs(String query, {int maxResults = 20}) async {
    if (query.trim().isEmpty) return [];

    try {
      // Search for videos; we append "song" to bias toward music results
      final searchQuery = '${query.trim()} song';
      final searchList = await _ytExplode.search.search(searchQuery);

      final songs = <Song>[];
      for (final video in searchList.take(maxResults)) {
        songs.add(_videoToSong(video));
      }
      return songs;
    } catch (e) {
      debugPrint('YouTube Music search error: $e');
      return [];
    }
  }

  /// Get the highest-bitrate audio-only stream URL for a video ID.
  ///
  /// Returns the direct stream URL or null if extraction fails.
  /// Prefers the highest bitrate audio-only stream.
  Future<String?> getAudioUrl(String videoId) async {
    try {
      final manifest = await _ytExplode.videos.streamsClient.getManifest(videoId);
      final audioStreams = manifest.audioOnly.sortByBitrate();

      if (audioStreams.isEmpty) return null;

      // Get the highest bitrate audio stream
      final bestStream = audioStreams.last;
      return bestStream.url.toString();
    } catch (e) {
      debugPrint('YouTube Music getAudioUrl error: $e');
      return null;
    }
  }

  /// Get the bitrate of the best available audio stream for a video.
  Future<int?> getBestBitrate(String videoId) async {
    try {
      final manifest = await _ytExplode.videos.streamsClient.getManifest(videoId);
      final audioStreams = manifest.audioOnly.sortByBitrate();
      if (audioStreams.isEmpty) return null;
      return audioStreams.last.bitrate.kiloBitsPerSecond.round();
    } catch (e) {
      return null;
    }
  }

  /// Convert a YouTube search result into a unified [Song].
  Song _videoToSong(Video video) {
    // Pick the best thumbnail available
    String thumbnail = '';
    try {
      thumbnail = video.thumbnails.highResUrl;
    } catch (_) {
      try {
        thumbnail = video.thumbnails.standardResUrl;
      } catch (_) {
        thumbnail = video.thumbnails.lowResUrl;
      }
    }

    return Song(
      id: 'ytmusic_${video.id.value}',
      title: video.title,
      artist: video.author,
      album: '',
      thumbnail: thumbnail,
      videoId: video.id.value,
      duration: video.duration,
      source: MusicSource.youtubeMusic,
    );
  }

  /// Dispose resources.
  void dispose() {
    _ytExplode.close();
  }
}
