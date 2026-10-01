import { supabase } from "./supabase";

// 1. INSERT: Faz o upload (insere) a imagem no bucket e retorna a URL
export async function uploadImageToStorage(
  file: File,
  bucket: string,
): Promise<string> {
  if (!supabase) {
    return "Erro na conexão com supabase!";
  }
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
  const filePath = `uploads/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

// 2. DELETE (Opcional): Deleta o arquivo físico do Storage caso você precise no futuro
export async function deleteImageFromStorage(
  bucket: string,
  filePath: string,
): Promise<void> {
  if (!supabase) {
    return;
  }
  const { error } = await supabase.storage.from(bucket).remove([filePath]);

  if (error) throw error;
}
