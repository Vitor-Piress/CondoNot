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

const CONDOMINIO_LOGO_BUCKET = "images-app";
export const CONDOMINIO_REGIMENTO_BUCKET = "regimentos-internos";
export const MAX_REGIMENTO_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const NORMALIZED_LOGO_WIDTH = 1200;
const NORMALIZED_LOGO_HEIGHT = 720;

export async function uploadCondominioRegimento(
  condominioId: string,
  file: File,
): Promise<string> {
  if (!supabase) {
    throw new Error("O Supabase não está configurado.");
  }

  if (!file.name.toLocaleLowerCase().endsWith(".pdf")) {
    throw new Error("Selecione um arquivo PDF.");
  }

  if (file.size > MAX_REGIMENTO_SIZE_BYTES) {
    throw new Error("O PDF deve ter no máximo 20 MB.");
  }

  const signature = await file.slice(0, 5).text();
  if (signature !== "%PDF-") {
    throw new Error("O arquivo selecionado não parece ser um PDF válido.");
  }

  const path = `condominios/${condominioId}/regimento/${crypto.randomUUID()}.pdf`;
  const { error } = await supabase.storage
    .from(CONDOMINIO_REGIMENTO_BUCKET)
    .upload(path, file, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) throw error;
  return path;
}

export async function createCondominioRegimentoSignedUrl(
  path: string,
): Promise<string> {
  if (!supabase) {
    throw new Error("O Supabase não está configurado.");
  }

  const { data, error } = await supabase.storage
    .from(CONDOMINIO_REGIMENTO_BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (error) throw error;
  return data.signedUrl;
}

export async function deleteCondominioRegimento(path: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.storage
    .from(CONDOMINIO_REGIMENTO_BUCKET)
    .remove([path]);

  if (error) throw error;
}

async function normalizeLogoFile(file: File): Promise<File> {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.src = imageUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    });

    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = image.naturalWidth;
    sourceCanvas.height = image.naturalHeight;
    const sourceContext = sourceCanvas.getContext("2d");

    if (!sourceContext) {
      throw new Error("Não foi possível preparar a imagem da logo.");
    }

    sourceContext.drawImage(image, 0, 0);
    const pixels = sourceContext.getImageData(
      0,
      0,
      sourceCanvas.width,
      sourceCanvas.height,
    ).data;
    let left = sourceCanvas.width;
    let top = sourceCanvas.height;
    let right = -1;
    let bottom = -1;

    for (let y = 0; y < sourceCanvas.height; y += 1) {
      for (let x = 0; x < sourceCanvas.width; x += 1) {
        const alpha = pixels[(y * sourceCanvas.width + x) * 4 + 3];
        if (alpha > 8) {
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x);
          bottom = Math.max(bottom, y);
        }
      }
    }

    const cropX = right >= 0 ? left : 0;
    const cropY = bottom >= 0 ? top : 0;
    const cropWidth = right >= 0 ? right - left + 1 : image.naturalWidth;
    const cropHeight = bottom >= 0 ? bottom - top + 1 : image.naturalHeight;
    const canvas = document.createElement("canvas");
    canvas.width = NORMALIZED_LOGO_WIDTH;
    canvas.height = NORMALIZED_LOGO_HEIGHT;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Não foi possível preparar a imagem da logo.");
    }

    const scale = Math.min(
      NORMALIZED_LOGO_WIDTH / cropWidth,
      NORMALIZED_LOGO_HEIGHT / cropHeight,
    );
    const width = cropWidth * scale;
    const height = cropHeight * scale;

    context.drawImage(
      sourceCanvas,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      (NORMALIZED_LOGO_WIDTH - width) / 2,
      (NORMALIZED_LOGO_HEIGHT - height) / 2,
      width,
      height,
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );

    if (!blob) {
      throw new Error("Não foi possível preparar a imagem da logo.");
    }

    return new File([blob], "logo.png", { type: "image/png" });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export async function uploadCondominioLogo(
  condominioId: string,
  file: File,
): Promise<{ publicUrl: string; path: string }> {
  if (!supabase) {
    throw new Error("O Supabase não está configurado.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem.");
  }

  if (file.size > MAX_LOGO_SIZE_BYTES) {
    throw new Error("A imagem deve ter no máximo 5 MB.");
  }

  const normalizedFile = await normalizeLogoFile(file);
  const path = `condominios/${condominioId}/logo-${Date.now()}.png`;
  const { error } = await supabase.storage
    .from(CONDOMINIO_LOGO_BUCKET)
    .upload(path, normalizedFile, {
      contentType: normalizedFile.type,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from(CONDOMINIO_LOGO_BUCKET)
    .getPublicUrl(path);

  return { publicUrl: data.publicUrl, path };
}

export async function deleteCondominioLogoFromStorage(
  publicUrl: string | null,
): Promise<void> {
  if (!supabase || !publicUrl) return;

  const publicPath = `/storage/v1/object/public/${CONDOMINIO_LOGO_BUCKET}/`;
  const pathStart = publicUrl.indexOf(publicPath);
  if (pathStart < 0) return;

  const path = decodeURIComponent(
    publicUrl.slice(pathStart + publicPath.length),
  );
  if (!path.startsWith("condominios/")) return;

  await deleteImageFromStorage(CONDOMINIO_LOGO_BUCKET, path);
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
