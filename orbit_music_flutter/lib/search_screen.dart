import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'models/song.dart';
import 'services/music_repository.dart';
import 'audio_manager.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final MusicRepository _musicRepo = MusicRepository();
  final TextEditingController _searchController = TextEditingController();
  
  List<Song> _results = [];
  bool _isLoading = false;
  String _error = '';
  String _activeCategory = '';

  final List<Map<String, String>> _presets = [
    {'emoji': '🔥', 'label': 'Trending', 'query': 'trending music 2024', 'cat': '10'},
    {'emoji': '🎵', 'label': 'Tamil', 'query': 'Tamil hits 2024', 'cat': '10'},
    {'emoji': '🌊', 'label': 'Lo-Fi', 'query': 'lo-fi chill beats', 'cat': ''},
    {'emoji': '🎸', 'label': 'Rock', 'query': 'rock music hits', 'cat': '10'},
    {'emoji': '⚡', 'label': 'EDM', 'query': 'EDM dance music', 'cat': '10'},
    {'emoji': '🎶', 'label': 'Hindi', 'query': 'Hindi songs 2024', 'cat': '10'},
  ];

  Future<void> _performSearch(String query, [String categoryId = '']) async {
    if (query.trim().isEmpty) return;
    
    setState(() {
      _isLoading = true;
      _error = '';
      _searchController.text = query;
    });

    try {
      // Use MusicRepository for multi-source search
      final results = await _musicRepo.searchSongs(query);
      setState(() {
        _results = results;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _results = [];
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _handlePresetClick(Map<String, String> preset) {
    setState(() => _activeCategory = preset['label']!);
    _performSearch(preset['query']!, preset['cat']!);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '🔭 Search the Cosmos',
                  style: GoogleFonts.orbitron(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.2,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Find music from JioSaavn, YouTube Music & more',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.white.withOpacity(0.6),
                  ),
                ),
              ],
            ),
          ),

          // Search Input
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: TextField(
              controller: _searchController,
              onSubmitted: (val) => _performSearch(val),
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Search songs across all sources...',
                hintStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
                prefixIcon: const Icon(Icons.search, color: Color(0xFF00E676)),
                filled: true,
                fillColor: Colors.white.withOpacity(0.05),
                contentPadding: const EdgeInsets.symmetric(vertical: 0),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(30),
                  borderSide: BorderSide.none,
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(30),
                  borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(30),
                  borderSide: const BorderSide(color: Color(0xFF00E676)),
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Presets
          SizedBox(
            height: 40,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _presets.length,
              itemBuilder: (context, index) {
                final preset = _presets[index];
                final isActive = _activeCategory == preset['label'];
                
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: ActionChip(
                    backgroundColor: isActive 
                        ? const Color(0xFF00E676).withOpacity(0.2) 
                        : Colors.white.withOpacity(0.05),
                    side: BorderSide(
                      color: isActive ? const Color(0xFF00E676) : Colors.transparent,
                    ),
                    label: Text(
                      '${preset['emoji']} ${preset['label']}',
                      style: TextStyle(
                        color: isActive ? const Color(0xFF00E676) : Colors.white70,
                        fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                    onPressed: () => _handlePresetClick(preset),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 16),

          // Error State
          if (_error.isNotEmpty)
            Padding(
              padding: const EdgeInsets.all(20),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.red.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: Colors.redAccent),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _error,
                        style: const TextStyle(color: Colors.redAccent),
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // Results
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF00E676)))
                : _results.isEmpty && _searchController.text.isNotEmpty && !_isLoading && _error.isEmpty
                    ? const Center(
                        child: Text(
                          'No results found drifting in space.',
                          style: TextStyle(color: Colors.white54),
                        ),
                      )
                    : GridView.builder(
                        padding: const EdgeInsets.all(20),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          childAspectRatio: 0.78,
                          crossAxisSpacing: 16,
                          mainAxisSpacing: 16,
                        ),
                        itemCount: _results.length,
                        itemBuilder: (context, index) {
                          final song = _results[index];
                          return _buildSongCard(song);
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildSongCard(Song song) {
    return GestureDetector(
      onTap: () {
        AudioManager().playSong(song, playlist: _results);
      },
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withOpacity(0.05)),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Thumbnail with source badge
            Stack(
              children: [
                AspectRatio(
                  aspectRatio: 16 / 9,
                  child: Image.network(
                    song.thumbnail,
                    fit: BoxFit.cover,
                    errorBuilder: (context, err, stack) => Container(
                      color: Colors.white10,
                      child: const Icon(Icons.music_note, color: Colors.white54),
                    ),
                  ),
                ),
                // Source badge
                Positioned(
                  top: 6,
                  right: 6,
                  child: _buildSourceBadge(song.source),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    song.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    song.artist,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.5),
                      fontSize: 11,
                    ),
                  ),
                  const SizedBox(height: 4),
                  // Quality indicator
                  Text(
                    song.qualityLabel,
                    style: TextStyle(
                      color: _sourceColor(song.source).withOpacity(0.8),
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Build a small colored badge showing the music source.
  Widget _buildSourceBadge(MusicSource source) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: _sourceColor(source).withOpacity(0.9),
        borderRadius: BorderRadius.circular(6),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 4,
          ),
        ],
      ),
      child: Text(
        _sourceShortLabel(source),
        style: const TextStyle(
          color: Colors.white,
          fontSize: 9,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  Color _sourceColor(MusicSource source) {
    switch (source) {
      case MusicSource.jiosaavn:
        return const Color(0xFF2BC5B4); // Teal for JioSaavn
      case MusicSource.youtubeMusic:
        return const Color(0xFFFF0000); // Red for YouTube Music
      case MusicSource.youtube:
        return const Color(0xFF909090); // Gray for legacy YouTube
    }
  }

  String _sourceShortLabel(MusicSource source) {
    switch (source) {
      case MusicSource.jiosaavn:
        return 'SAAVN';
      case MusicSource.youtubeMusic:
        return 'YT MUSIC';
      case MusicSource.youtube:
        return 'YOUTUBE';
    }
  }
}
