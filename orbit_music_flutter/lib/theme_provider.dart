import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

enum AppTheme { space, solar, nebula }

class ThemeProvider extends ChangeNotifier {
  static final ThemeProvider _instance = ThemeProvider._internal();
  factory ThemeProvider() => _instance;
  ThemeProvider._internal();

  AppTheme _currentTheme = AppTheme.space;

  AppTheme get currentTheme => _currentTheme;

  void setTheme(AppTheme theme) {
    if (_currentTheme != theme) {
      _currentTheme = theme;
      notifyListeners();
    }
  }

  ThemeData get themeData {
    switch (_currentTheme) {
      case AppTheme.solar:
        return ThemeData(
          brightness: Brightness.dark,
          scaffoldBackgroundColor: const Color(0xFF1F1105),
          primaryColor: const Color(0xFFFF9800),
          colorScheme: const ColorScheme.dark(
            primary: Color(0xFFFF9800),
            secondary: Color(0xFFFFC107),
          ),
          fontFamily: GoogleFonts.dmSans().fontFamily,
          useMaterial3: true,
        );
      case AppTheme.nebula:
        return ThemeData(
          brightness: Brightness.dark,
          scaffoldBackgroundColor: const Color(0xFF140524),
          primaryColor: const Color(0xFFE040FB),
          colorScheme: const ColorScheme.dark(
            primary: Color(0xFFE040FB),
            secondary: Color(0xFF7C4DFF),
          ),
          fontFamily: GoogleFonts.dmSans().fontFamily,
          useMaterial3: true,
        );
      case AppTheme.space:
        return ThemeData(
          brightness: Brightness.dark,
          scaffoldBackgroundColor: const Color(0xFF0D0630),
          primaryColor: const Color(0xFF00E676),
          colorScheme: const ColorScheme.dark(
            primary: Color(0xFF00E676),
            secondary: Color(0xFF69FF47),
          ),
          fontFamily: GoogleFonts.dmSans().fontFamily,
          useMaterial3: true,
        );
    }
  }
}
