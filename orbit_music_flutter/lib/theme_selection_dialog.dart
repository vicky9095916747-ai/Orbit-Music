import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'theme_provider.dart';

class ThemeSelectionDialog extends StatelessWidget {
  const ThemeSelectionDialog({super.key});

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      title: Text(
        'Select Theme',
        style: GoogleFonts.orbitron(
          color: Theme.of(context).primaryColor,
          fontWeight: FontWeight.bold,
        ),
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildThemeOption(context, AppTheme.space, 'Deep Space (Default)'),
          _buildThemeOption(context, AppTheme.solar, 'Solar Flare'),
          _buildThemeOption(context, AppTheme.nebula, 'Cosmic Nebula'),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(
            'Close',
            style: TextStyle(color: Theme.of(context).primaryColor),
          ),
        ),
      ],
    );
  }

  Widget _buildThemeOption(BuildContext context, AppTheme theme, String name) {
    final isSelected = ThemeProvider().currentTheme == theme;
    return ListTile(
      title: Text(name),
      trailing: isSelected
          ? Icon(Icons.check_circle, color: Theme.of(context).primaryColor)
          : null,
      onTap: () {
        ThemeProvider().setTheme(theme);
        Navigator.pop(context);
      },
    );
  }
}
