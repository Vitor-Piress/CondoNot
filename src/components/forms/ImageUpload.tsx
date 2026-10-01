import { useState, type ChangeEvent } from "react";
import { uploadImageToStorage } from "../../services/storageService";
import { updateCondominioLogo } from "../../services/condominioService";

export function ImageUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return alert("Selecione uma imagem!");

    try {
      setUploading(true);

      // 1. Sobe para o Storage
      const publicUrl = await uploadImageToStorage(file, "images-app");
      setImageUrl(publicUrl);

      // 2. Salva no Banco (aqui usamos o ID 1 para teste)
      await updateCondominioLogo(1, publicUrl);

      alert("Imagem enviada e salva com sucesso!");
    } catch (error) {
      console.error(error);
      alert("Erro ao enviar a imagem.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h2>Upload de Imagem para o Supabase</h2>

      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
      />

      <button onClick={handleUpload} disabled={uploading || !file}>
        {uploading ? "Enviando..." : "Enviar Imagem"}
      </button>

      {imageUrl && (
        <div style={{ marginTop: "20px" }}>
          <p>Imagem enviada:</p>
          <img src={imageUrl} alt="Upload recente" style={{ width: "200px" }} />
          <p>
            <a href={imageUrl} target="_blank" rel="noreferrer">
              Ver link direto
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
