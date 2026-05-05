import { SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.SUPABASE_URL as string;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const supabaseClient = new SupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default supabaseClient;