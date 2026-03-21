import 'package:flutter/material.dart';
import 'package:audio_video_progress_bar/audio_video_progress_bar.dart';
import 'audio_manager.dart';
import 'models/song.dart';

class NowPlayingBar extends StatelessWidget {
  const NowPlayingBar({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: AudioManager(),
      builder: (context, child) {
        final audioManager = AudioManager();
        final currentTrack = audioManager.currentTrack;
        final currentSong = audioManager.currentSong;

        if (currentTrack == null && currentSong == null) {
          return const SizedBox.shrink();
        }

        // Use Song data if available, fallback to YTTrack
        final title = currentSong?.title ?? currentTrack?.title ?? '';
        final artist = currentSong?.artist ?? currentTrack?.artist ?? '';
        final thumbnail = currentSong?.thumbnail ?? currentTrack?.thumbnail ?? '';
        final source = audioManager.currentSource;

        return Container(
          height: 80,
          decoration: BoxDecoration(
            color: const Color(0xFF0A0F15),
            border: Border(
              top: BorderSide(
                color: const Color(0xFF00E676).withOpacity(0.1),
                width: 1,
              ),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.5),
                blurRadius: 10,
                offset: const Offset(0, -5),
              ),
            ],
          ),
          child: Column(
            children: [
              // Tiny progress indicator on top
              SizedBox(
                height: 2,
                child: ProgressBar(
                  progress: audioManager.currentPosition,
                  total: audioManager.totalDuration,
                  progressBarColor: const Color(0xFF00E676),
                  baseBarColor: Colors.white.withOpacity(0.1),
                  thumbColor: Colors.transparent,
                  thumbRadius: 0,
                  timeLabelLocation: TimeLabelLocation.none,
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    children: [
                      // Thumbnail
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(8),
                          image: thumbnail.isNotEmpty
                              ? DecorationImage(
                                  image: NetworkImage(thumbnail),
                                  fit: BoxFit.cover,
                                )
                              : null,
                          color: thumbnail.isEmpty ? Colors.white10 : null,
                        ),
                        child: thumbnail.isEmpty
                            ? const Icon(Icons.music_note, color: Colors.white54, size: 20)
                            : null,
                      ),
                      const SizedBox(width: 12),

                      // Track Info + Source Badge
                      Expanded(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    artist,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: Colors.white.withOpacity(0.6),
                                      fontSize: 11,
                                    ),
                                  ),
                                ),
                                // Source badge
                                if (source != null) ...[
                                  const SizedBox(width: 6),
                                  _buildSourceChip(source, currentSong),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ),

                      // Controls
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.skip_previous),
                            color: Colors.white,
                            onPressed: () => audioManager.playPrevious(),
                          ),
                          IconButton(
                            icon: Icon(
                              audioManager.isPlaying
                                  ? Icons.pause
                                  : Icons.play_arrow,
                            ),
                            color: const Color(0xFF00E676),
                            iconSize: 32,
                            onPressed: () => audioManager.togglePlayPause(),
                          ),
                          IconButton(
                            icon: const Icon(Icons.skip_next),
                            color: Colors.white,
                            onPressed: () => audioManager.playNext(),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  /// Build a small colored chip showing source and quality.
  Widget _buildSourceChip(MusicSource source, Song? song) {
    final label = song != null
        ? '${song.sourceLabel} • ${song.qualityLabel}'
        : _sourceLabel(source);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
      decoration: BoxDecoration(
        color: _sourceColor(source).withOpacity(0.2),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(
          color: _sourceColor(source).withOpacity(0.4),
          width: 0.5,
        ),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: _sourceColor(source),
          fontSize: 9,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.3,
        ),
      ),
    );
  }

  Color _sourceColor(MusicSource source) {
    switch (source) {
      case MusicSource.jiosaavn:
        return const Color(0xFF2BC5B4);
      case MusicSource.youtubeMusic:
        return const Color(0xFFFF4444);
      case MusicSource.youtube:
        return const Color(0xFF909090);
    }
  }

  String _sourceLabel(MusicSource source) {
    switch (source) {
      case MusicSource.jiosaavn:
        return 'JioSaavn';
      case MusicSource.youtubeMusic:
        return 'YT Music';
      case MusicSource.youtube:
        return 'YouTube';
    }
  }
}
