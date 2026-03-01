import { SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseClient = new SupabaseClient(SUPABASE_URL, SUPABASE_KEY);


export default supabaseClient;