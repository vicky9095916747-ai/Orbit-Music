/// The source from which a song was fetched.
enum MusicSource {
  jiosaavn,
  youtubeMusic,
  youtube,
}

/// Unified song model used across all music sources.
class Song {
  final String id;
  final String title;
  final String artist;
  final String album;
  final String thumbnail;
  final String? audioUrl;
  final String? videoId;
  final Duration? duration;
  final MusicSource source;
  final int? bitrate;
  final String? language;
  final String? year;

  const Song({
    required this.id,
    required this.title,
    required this.artist,
    this.album = '',
    this.thumbnail = '',
    this.audioUrl,
    this.videoId,
    this.duration,
    required this.source,
    this.bitrate,
    this.language,
    this.year,
  });

  /// Whether this song has a direct playback URL (no extraction needed).
  bool get hasDirectUrl => audioUrl != null && audioUrl!.isNotEmpty;

  /// Whether this song needs YouTube stream extraction.
  bool get needsStreamExtraction => videoId != null && videoId!.isNotEmpty && !hasDirectUrl;

  /// Human-readable source label.
  String get sourceLabel {
    switch (source) {
      case MusicSource.jiosaavn:
        return 'JioSaavn';
      case MusicSource.youtubeMusic:
        return 'YT Music';
      case MusicSource.youtube:
        return 'YouTube';
    }
  }

  /// Quality label for display.
  String get qualityLabel {
    if (bitrate != null && bitrate! > 0) {
      return '${bitrate}kbps';
    }
    switch (source) {
      case MusicSource.jiosaavn:
        return '320kbps';
      case MusicSource.youtubeMusic:
        return 'High';
      case MusicSource.youtube:
        return 'Standard';
    }
  }

  /// Create a copy with updated fields.
  Song copyWith({
    String? id,
    String? title,
    String? artist,
    String? album,
    String? thumbnail,
    String? audioUrl,
    String? videoId,
    Duration? duration,
    MusicSource? source,
    int? bitrate,
    String? language,
    String? year,
  }) {
    return Song(
      id: id ?? this.id,
      title: title ?? this.title,
      artist: artist ?? this.artist,
      album: album ?? this.album,
      thumbnail: thumbnail ?? this.thumbnail,
      audioUrl: audioUrl ?? this.audioUrl,
      videoId: videoId ?? this.videoId,
      duration: duration ?? this.duration,
      source: source ?? this.source,
      bitrate: bitrate ?? this.bitrate,
      language: language ?? this.language,
      year: year ?? this.year,
    );
  }
}
