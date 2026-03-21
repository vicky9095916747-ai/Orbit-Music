import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../models/song.dart';

/// Service for fetching music from JioSaavn via the anxkhn/jiosaavn-api backend.
///
/// The backend must be running (self-hosted FastAPI) and accessible from the device.
/// Endpoints used:
///   - GET /song/?query=...&songdata=true   → search songs
///   - GET /song/get?song_id=...            → get song by ID
class JioSaavnService {
  /// Base URL for the JioSaavn API backend.
  /// Change this to your deployed URL (e.g., https://your-jiosaavn-api.railway.app)
  /// or keep localhost for local development via adb port-forwarding.
  static const String _baseUrl = 'https://jiosaavn-api-rho-liart.vercel.app';

  final http.Client _client;

  JioSaavnService({http.Client? client}) : _client = client ?? http.Client();

  /// Search for songs on JioSaavn.
  ///
  /// Returns a list of [Song] objects with `audioUrl` set to the 320kbps
  /// decrypted media URL when available.
  Future<List<Song>> searchSongs(String query) async {
    if (query.trim().isEmpty) return [];

    try {
      final uri = Uri.parse('$_baseUrl/song/').replace(
        queryParameters: {
          'query': query.trim(),
          'songdata': 'true',
          'lyrics': 'false',
        },
      );

      final response = await _client
          .get(uri, headers: {'Accept': 'application/json'})
          .timeout(const Duration(seconds: 10));

      if (response.statusCode != 200) {
        debugPrint('JioSaavn search failed: ${response.statusCode}');
        return [];
      }

      final data = json.decode(response.body);

      // The API returns a list of song objects directly
      if (data is List) {
        return data
            .map<Song?>((item) => _parseSong(item))
            .whereType<Song>()
            .toList();
      }

      // Some versions may wrap in a result object
      if (data is Map && data.containsKey('results')) {
        final results = data['results'] as List? ?? [];
        return results
            .map<Song?>((item) => _parseSong(item))
            .whereType<Song>()
            .toList();
      }

      return [];
    } catch (e) {
      debugPrint('JioSaavn search error: $e');
      return [];
    }
  }

  /// Get detailed song info by JioSaavn song ID.
  Future<Song?> getSongDetails(String songId) async {
    try {
      final uri = Uri.parse('$_baseUrl/song/get').replace(
        queryParameters: {
          'song_id': songId,
          'lyrics': 'false',
        },
      );

      final response = await _client
          .get(uri, headers: {'Accept': 'application/json'})
          .timeout(const Duration(seconds: 10));

      if (response.statusCode != 200) {
        debugPrint('JioSaavn get song failed: ${response.statusCode}');
        return null;
      }

      final data = json.decode(response.body);

      // Response can be a single object or a list with one item
      if (data is List && data.isNotEmpty) {
        return _parseSong(data.first);
      }
      if (data is Map<String, dynamic>) {
        return _parseSong(data);
      }

      return null;
    } catch (e) {
      debugPrint('JioSaavn getSongDetails error: $e');
      return null;
    }
  }

  /// Check if the JioSaavn API backend is healthy.
  Future<bool> isHealthy() async {
    try {
      final response = await _client
          .get(Uri.parse('$_baseUrl/ping'))
          .timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['status'] == 'healthy';
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /// Parse a single JSON song object into a [Song].
  Song? _parseSong(dynamic json) {
    try {
      if (json is! Map<String, dynamic>) return null;

      final id = json['id']?.toString() ?? '';
      if (id.isEmpty) return null;

      // Title can be in 'song' or 'title' field
      final title = (json['song'] ?? json['title'] ?? '').toString();
      if (title.isEmpty) return null;

      // Artist info
      final artist = (json['primary_artists'] ?? json['singers'] ?? json['music'] ?? 'Unknown').toString();

      // Album
      final album = (json['album'] ?? '').toString();

      // Thumbnail — pick the highest quality available
      String thumbnail = '';
      if (json['image'] != null) {
        thumbnail = json['image'].toString();
        // JioSaavn images come in 150x150 by default; upgrade to 500x500
        thumbnail = thumbnail.replaceAll('150x150', '500x500');
      }

      // Audio URL — the decrypted 320kbps URL
      final audioUrl = (json['media_url'] ?? '').toString();

      // Duration in seconds
      Duration? duration;
      if (json['duration'] != null) {
        final seconds = int.tryParse(json['duration'].toString()) ?? 0;
        if (seconds > 0) {
          duration = Duration(seconds: seconds);
        }
      }

      // Check if 320kbps is available
      final has320 = json['320kbps']?.toString() == 'true';

      return Song(
        id: 'jiosaavn_$id',
        title: _cleanHtml(title),
        artist: _cleanHtml(artist),
        album: _cleanHtml(album),
        thumbnail: thumbnail,
        audioUrl: audioUrl.isNotEmpty ? audioUrl : null,
        source: MusicSource.jiosaavn,
        bitrate: has320 ? 320 : 128,
        duration: duration,
        language: json['language']?.toString(),
        year: json['year']?.toString(),
      );
    } catch (e) {
      debugPrint('Error parsing JioSaavn song: $e');
      return null;
    }
  }

  /// Remove HTML entities and tags from strings.
  String _cleanHtml(String text) {
    return text
        .replaceAll('&amp;', '&')
        .replaceAll('&quot;', '"')
        .replaceAll('&#039;', "'")
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll(RegExp(r'<[^>]*>'), '')
        .trim();
  }
}
