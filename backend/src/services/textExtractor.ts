// backend/src/services/textExtractor.ts
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

// Fonction existante pour extraire depuis un fichier local (si nécessaire)
export const extractText = async (filePath: string, mimeType: string): Promise<string> => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier introuvable: ${filePath}`);
  }
  const buffer = await fs.promises.readFile(filePath);
  return extractTextFromBuffer(buffer, mimeType);
};

// Extraction depuis une URL (Cloudinary)
export const extractTextFromUrl = async (url: string, mimeType: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status} lors du téléchargement de ${url}`);
    }
    const buffer = await response.buffer();
    return extractTextFromBuffer(buffer, mimeType);
  } catch (error) {
    console.error(`❌ Erreur téléchargement depuis ${url}:`, error);
    throw new Error(`Impossible de télécharger le fichier depuis ${url}`);
  }
};

// Extraction depuis un buffer
export const extractTextFromBuffer = async (buffer: Buffer, mimeType: string): Promise<string> => {
  if (mimeType === 'text/plain' || mimeType.includes('text')) {
    return buffer.toString('utf-8');
  }

  if (mimeType === 'application/pdf' || mimeType.includes('pdf')) {
    try {
      const pdfParse = await import('pdf-parse');
      const data = await pdfParse.default(buffer);
      return data.text;
    } catch (error) {
      console.error('❌ Erreur extraction PDF:', error);
      return 'Impossible d\'extraire le texte du PDF.';
    }
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      mimeType.includes('word') || mimeType.includes('docx')) {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      console.error('❌ Erreur extraction DOCX:', error);
      return 'Impossible d\'extraire le texte du DOCX.';
    }
  }

  if (mimeType === 'application/msword' || mimeType.includes('doc')) {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      console.error('❌ Erreur extraction DOC:', error);
      return 'Impossible d\'extraire le texte du DOC.';
    }
  }

  throw new Error(`Type MIME non supporté pour l'extraction de texte: ${mimeType}`);
};
