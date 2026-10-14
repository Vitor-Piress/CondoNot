const MAX_IMAGE_SIDE_PX = 1200;
const JPEG_QUALITY = 0.8;

// Converte para JPEG reduzido: o react-pdf não lê WebP e isso limita o tamanho do anexo.
export async function fetchImageAsJpegDataUrl(
  url: string,
  maxSide = MAX_IMAGE_SIDE_PX,
): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Não foi possível carregar uma imagem para o PDF.");
  }

  const bitmap = await createImageBitmap(await response.blob());
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Não foi possível processar uma imagem para o PDF.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
