import { supabase } from '@/lib/supabase';
import { createSupabaseRepository, type CloudRepository } from './cloudRepository';

/** The cloud project store, or null when Supabase isn't configured. */
export const cloudRepository: CloudRepository | null = supabase
  ? createSupabaseRepository(supabase)
  : null;
