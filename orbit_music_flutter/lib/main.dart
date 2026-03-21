import 'package:flutter/material.dart';
import 'supabase_client.dart';
import 'auth_state.dart';
import 'theme_provider.dart';
import 'login_screen.dart';
import 'main_shell.dart';
import 'audio_manager.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initSupabase();

  // Initialize audio service for background playback
  await initAudioService();
  AudioManager().init();

  runApp(const OrbitMusicApp());
}

class OrbitMusicApp extends StatefulWidget {
  const OrbitMusicApp({super.key});

  @override
  State<OrbitMusicApp> createState() => _OrbitMusicAppState();
}

class _OrbitMusicAppState extends State<OrbitMusicApp> {
  final AuthState _authState = AuthState();

  @override
  void initState() {
    super.initState();
    _authState.addListener(() {
      setState(() {});
    });
  }

  @override
  void dispose() {
    _authState.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: ThemeProvider(),
      builder: (context, child) {
        return MaterialApp(
          title: 'Orbit Music',
          debugShowCheckedModeBanner: false,
          theme: ThemeProvider().themeData,
          home: _authState.isLoading
              ? Scaffold(
                  backgroundColor:
                      ThemeProvider().themeData.scaffoldBackgroundColor,
                  body: Center(
                    child: CircularProgressIndicator(
                      color: ThemeProvider().themeData.primaryColor,
                    ),
                  ),
                )
              : _authState.user == null
              ? LoginScreen(onGoogleLogin: _authState.signInWithGoogle)
              : const MainShellScreen(),
        );
      },
    );
  }
}
