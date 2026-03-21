import 'package:supabase_flutter/supabase_flutter.dart';

const supabaseUrl = 'https://tbtphtphrkiiruppgvyv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidHBodHBocmtpaXJ1cHBndnl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODE2NjgsImV4cCI6MjA4NzE1NzY2OH0.pXjgIm6HChVU7wt9LxGcRiizcwjARVAvdRaHC0qch9E';

final supabase = Supabase.instance.client;

Future<void> initSupabase() async {
  await Supabase.initialize(
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  );
}
