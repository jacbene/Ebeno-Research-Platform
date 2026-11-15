// backend/src/services/textExtractor.ts
import fs from 'fs';
import mammoth from 'mammoth';
import { v2 as cloudinary } from 'cloudinary';

const fetch = require('node-fetch');

cloudinary.config();

const parsePDF = async (buffer: Buffer) => {
  const pdfParse = require('pdf-parse');
  return await pdfParse(buffer);
};

const getDownloadUrl = (url: string): string => {
  return url;
};

export const extractText = async (filePath: string, mimeType: string): Promise<string> => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier introuvable: ${filePath}`);
  }
  const buffer = await fs.promises.readFile(filePath);
  return extractTextFromBuffer(buffer, mimeType);
};

export const extractTextFromUrl = async (url: string, mimeType: string): Promise<string> => {
  try {
    const downloadUrl = getDownloadUrl(url);
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      if ([400, 401, 404].includes(response.status)) {
        console.warn(`⚠️ Accès refusé (${response.status}) : ${url}`);
        return '';
      }
      throw new Error(`Erreur HTTP ${response.status} lors du téléchargement de ${url}`);
    }
    const buffer = await response.buffer();
    return extractTextFromBuffer(buffer, mimeType);
  } catch (error) {
    console.error(`❌ Erreur téléchargement depuis ${url}:`, error);
    return '';
  }
};

export const extractTextFromBuffer = async (buffer: Buffer, mimeType: string): Promise<string> => {
  // TXT
  if (mimeType === 'text/plain' || mimeType.includes('text')) {
    return buffer.toString('utf-8');
  }

  // PDF
  if (mimeType === 'application/pdf' || mimeType.includes('pdf')) {
    try {
      const data = await parsePDF(buffer);
      return data.text;
    } catch (error) {
      // ✅ CORRECTION : Warn au lieu de Error, et return vide
      console.warn('⚠️ [textExtractor] Erreur extraction PDF (fichier probablement corrompu)');
      return '';
    }
  }

  // DOCX
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      mimeType.includes('word') || mimeType.includes('docx')) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      // ✅ CORRECTION : Warn au lieu de Error, et return vide
      console.warn('⚠️ [textExtractor] Erreur extraction DOCX (fichier probablement corrompu)');
      return '';
    }
  }

  // DOC non supporté
  if (mimeType === 'application/msword' || mimeType.includes('doc')) {
    console.warn('⚠️ Format .doc non supporté. Veuillez utiliser .docx.');
    throw new Error('Format .doc non supporté. Veuillez utiliser .docx, .pdf ou .txt.');
  }

  throw new Error(`Type MIME non supporté pour l'extraction de texte: ${mimeType}`);
};
