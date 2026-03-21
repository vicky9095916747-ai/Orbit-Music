import 'dart:math';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class LoginScreen extends StatefulWidget {
  final Future<void> Function() onGoogleLogin;

  const LoginScreen({Key? key, required this.onGoogleLogin}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 10),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    setState(() => _isLoading = true);
    try {
      await widget.onGoogleLogin();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Login failed: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Animated Starfield Background
          AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              return CustomPaint(
                painter: StarfieldPainter(_controller.value),
                size: Size.infinite,
              );
            },
          ),

          // Main Login Card
          Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Container(
                width: double.infinity,
                constraints: const BoxConstraints(maxWidth: 400),
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: const Color(0xFF08120A).withOpacity(0.85),
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: const Color(0xFF00E676).withOpacity(0.18)),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF00E676).withOpacity(0.06),
                      blurRadius: 60,
                      spreadRadius: 10,
                    ),
                    const BoxShadow(
                      color: Colors.black87,
                      blurRadius: 80,
                      offset: Offset(0, 32),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Logo Area
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF00E676).withOpacity(0.4),
                            blurRadius: 30,
                            spreadRadius: 2,
                          )
                        ]
                      ),
                      child: const Icon(
                        Icons.rocket_launch,
                        size: 48,
                        color: Color(0xFF00E676),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'Orbit Music',
                      style: GoogleFonts.orbitron(
                        fontSize: 32,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 2.0,
                        color: const Color(0xFF69FF47),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Music streaming across the cosmos',
                      style: TextStyle(
                        color: const Color(0xFF00E676).withOpacity(0.5),
                        fontSize: 13,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 48),

                    // Google Login Button
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white.withOpacity(0.06),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                            side: BorderSide(
                              color: Colors.white.withOpacity(0.12),
                            ),
                          ),
                        ),
                        onPressed: _isLoading ? null : _handleLogin,
                        child: _isLoading 
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.g_mobiledata, size: 32),
                                SizedBox(width: 8),
                                Text(
                                  'Continue with Google',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                      ),
                    ),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class StarfieldPainter extends CustomPainter {
  final double progress;
  final Random random = Random(42); // Fixed seed for stable star positions

  StarfieldPainter(this.progress);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..style = PaintingStyle.fill;
    
    // Draw 150 stars
    for (int i = 0; i < 150; i++) {
      final x = random.nextDouble() * size.width;
      final y = random.nextDouble() * size.height;
      final maxRadius = random.nextDouble() * 1.5 + 0.5;
      
      // Calculate twinkle based on progress and star index
      final twinkleOffset = random.nextDouble() * pi * 2;
      final twinkleSpeed = random.nextDouble() * 20 + 10;
      final alpha = (sin(progress * twinkleSpeed + twinkleOffset) + 1) / 2;
      
      final isGreen = random.nextDouble() > 0.6;
      
      if (isGreen) {
        paint.color = Color.fromRGBO(0, 230, 118, alpha * 0.8);
      } else {
        paint.color = Color.fromRGBO(255, 255, 255, alpha * 0.4);
      }
      
      canvas.drawCircle(Offset(x, y), maxRadius, paint);
    }

    // Draw grid lines
    final gridPaint = Paint()
      ..color = const Color.fromRGBO(0, 230, 118, 0.03)
      ..strokeWidth = 0.5
      ..style = PaintingStyle.stroke;

    for (double i = 0; i < size.width; i += 60) {
      canvas.drawLine(Offset(i, 0), Offset(i, size.height), gridPaint);
    }
    for (double i = 0; i < size.height; i += 60) {
      canvas.drawLine(Offset(0, i), Offset(size.width, i), gridPaint);
    }
  }

  @override
  bool shouldRepaint(covariant StarfieldPainter oldDelegate) {
    return true; // We want continuous repainting for twinkling
  }
}
