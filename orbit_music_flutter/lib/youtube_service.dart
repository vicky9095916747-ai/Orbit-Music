import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'models/song.dart';

class YTTrack {
  final String videoId;
  final String title;
  final String artist;
  final String thumbnail;

  YTTrack({
    required this.videoId,
    required this.title,
    required this.artist,
    required this.thumbnail,
  });

  /// Convert this legacy YTTrack into a unified [Song] object.
  Song toSong() {
    return Song(
      id: 'youtube_$videoId',
      title: title,
      artist: artist,
      thumbnail: thumbnail,
      videoId: videoId,
      source: MusicSource.youtube,
    );
  }

  factory YTTrack.fromJson(Map<String, dynamic> json, {bool isSearch = false}) {
    return YTTrack(
      videoId: isSearch ? json['id']['videoId'] : json['snippet']['resourceId']['videoId'],
      title: json['snippet']['title'],
      artist: isSearch ? json['snippet']['channelTitle'] : (json['snippet']['videoOwnerChannelTitle'] ?? 'YouTube'),
      thumbnail: json['snippet']['thumbnails']?['high']?['url'] ??
          json['snippet']['thumbnails']?['default']?['url'] ??
          '',
    );
  }
}

class YTPlaylist {
  final String id;
  final String title;
  final String thumbnail;
  final int trackCount;

  YTPlaylist({
    required this.id,
    required this.title,
    required this.thumbnail,
    required this.trackCount,
  });

  factory YTPlaylist.fromJson(Map<String, dynamic> json) {
    return YTPlaylist(
      id: json['id'],
      title: json['snippet']['title'],
      thumbnail: json['snippet']['thumbnails']?['high']?['url'] ??
          json['snippet']['thumbnails']?['default']?['url'] ??
          '',
      trackCount: json['contentDetails']?['itemCount'] ?? 0,
    );
  }
}

class YouTubeService {
  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('provider_token');
  }

  Future<List<YTPlaylist>> fetchPlaylists() async {
    final token = await _getToken();
    if (token == null) throw Exception('Google Auth Token is missing');

    final url = Uri.parse(
        'https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50');
    
    final response = await http.get(url, headers: {
      'Authorization': 'Bearer $token',
      'Accept': 'application/json',
    });

    if (response.statusCode != 200) {
      throw Exception('Failed to fetch playlists: ${response.body}');
    }

    final data = json.decode(response.body);
    final items = data['items'] as List? ?? [];
    
    return items.map((item) => YTPlaylist.fromJson(item)).toList();
  }

  Future<List<YTTrack>> fetchPlaylistTracks(String playlistId) async {
    final token = await _getToken();
    if (token == null) throw Exception('Google Auth Token is missing');

    List<YTTrack> allTracks = [];
    String? pageToken;

    do {
      final queryParams = {
        'part': 'snippet',
        'playlistId': playlistId,
        'maxResults': '50',
      };
      if (pageToken != null) queryParams['pageToken'] = pageToken;

      final url = Uri.parse('https://www.googleapis.com/youtube/v3/playlistItems').replace(queryParameters: queryParams);

      final response = await http.get(url, headers: {
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
      });

      if (response.statusCode != 200) {
        break; // Ignore partial failures, stop pagination
      }

      final data = json.decode(response.body);
      final items = data['items'] as List? ?? [];

      for (var item in items) {
        // Exclude deleted or private videos
        if (item['snippet']['title'] == 'Private video' || item['snippet']['title'] == 'Deleted video') {
          continue;
        }
        allTracks.add(YTTrack.fromJson(item, isSearch: false));
      }

      pageToken = data['nextPageToken'];
    } while (pageToken != null && allTracks.length < 200);

    return allTracks;
  }

  Future<List<YTTrack>> search(String query, {String categoryId = '10'}) async {
    if (query.trim().isEmpty) return [];

    final token = await _getToken();
    if (token == null) throw Exception('Google Auth Token is missing');

    final queryParams = {
      'part': 'snippet',
      'type': 'video',
      'maxResults': '24',
      'q': query.trim(),
    };
    if (categoryId.isNotEmpty) {
      queryParams['videoCategoryId'] = categoryId;
    }

    final url = Uri.parse('https://www.googleapis.com/youtube/v3/search').replace(queryParameters: queryParams);

    final response = await http.get(url, headers: {
      'Authorization': 'Bearer $token',
      'Accept': 'application/json',
    });

    if (response.statusCode != 200) {
      throw Exception('Failed to search: ${response.statusCode}');
    }

    final data = json.decode(response.body);
    final items = data['items'] as List? ?? [];

    return items.map((item) => YTTrack.fromJson(item, isSearch: true)).toList();
  }
}
