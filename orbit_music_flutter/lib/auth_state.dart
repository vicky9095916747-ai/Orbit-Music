import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart'; // for kIsWeb
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'supabase_client.dart';

// Conditionally get the current web URL for redirect
String? _getWebRedirectUrl() {
  if (!kIsWeb) return null;
  // On web, use the current origin so the redirect comes back to the same host
  // This works for both localhost (development) and production (Vercel)
  try {
    // ignore: avoid_web_libraries_in_flutter
    // We use Uri.base which works on all platforms but gives the browser URL on web
    final origin = Uri.base.origin;
    return origin;
  } catch (_) {
    return null;
  }
}

class AuthState extends ChangeNotifier {
  User? _user;
  bool _isLoading = true;

  User? get user => _user;
  bool get isLoading => _isLoading;

  AuthState() {
    _initAuth();
  }

  void _initAuth() {
    supabase.auth.onAuthStateChange.listen((data) async {
      _user = data.session?.user;
      
      // Store the Google provider token for YouTube API calls
      if (data.session?.providerToken != null) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('provider_token', data.session!.providerToken!);
      }
      
      _isLoading = false;
      notifyListeners();
    });
  }

  Future<void> signInWithGoogle() async {
    try {
      final redirectUrl = kIsWeb
          ? _getWebRedirectUrl()
          : 'com.vicky.orbitmusic://login-callback/';

      await supabase.auth.signInWithOAuth(
        OAuthProvider.google,
        scopes: 'https://www.googleapis.com/auth/youtube.readonly',
        redirectTo: redirectUrl,
      );
    } catch (e) {
      debugPrint('SignIn Error: $e');
      rethrow;
    }
  }

  Future<void> signOut() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('provider_token');
    await supabase.auth.signOut();
  }
}

