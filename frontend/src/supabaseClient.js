import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://mrncharjkhngfehkepal.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ybmNoYXJqa2huZ2ZlaGtlcGFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MDYyNDYsImV4cCI6MjA5NTQ4MjI0Nn0.kBTsuwP2XJzB7BgB8lx8QCaaULFdDQ001wZDNL9EeKA";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);