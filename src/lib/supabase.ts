import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Faltan credenciales de Supabase. El cliente no funcionará correctamente.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const uploadToStorage = async (bucket: string, path: string, file: File): Promise<string> => {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  });

  if (error) {
    console.error('Upload Error:', error);
    throw error;
  }

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return publicData.publicUrl;
};
