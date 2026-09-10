// backend/src/services/textExtractor.ts
import fs from 'fs';
import mammoth from 'mammoth';
import { v2 as cloudinary } from 'cloudinary';

// ⚠️ IMPORTANT : ne PAS require('pdf-parse') ici (bug connu : plante au démarrage)
const fetch = require('node-fetch');

cloudinary.config();

/**
 * ⚠️ Require paresseux de pdf-parse (évite le crash au chargement du module)
 */
const parsePDF = async (buffer: Buffer) => {
  const pdfParse = require('pdf-parse');
  return await pdfParse(buffer);
};

/**
 * Génère une URL signée Cloudinary
 */
const getDownloadUrl = (url: string): string => {
  if (!url.includes('res.cloudinary.com')) return url;

  const match = url.match(/res\.cloudinary\.com\/[^/]+\/(image|raw|video)\/upload\/v\d+\/(.+)$/);
  if (!match) return url;

  const resourceType = match[1];
  const publicId = match[2];

  try {
    const signedUrl = cloudinary.utils.private_download_url(
      publicId,
      resourceType,
      {
        resource_type: resourceType,
        type: 'upload',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }
    );
    console.log(`🔐 URL signée générée pour [${resourceType}] ${publicId}`);
    return signedUrl;
  } catch (error) {
    console.error('❌ Erreur génération URL signée:', error);
    return url;
  }
};

// Extraction depuis un fichier local
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

// Extraction depuis un buffer
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
      console.error('❌ Erreur extraction PDF:', error);
      return 'Impossible d\'extraire le texte du PDF.';
    }
  }

  // DOCX
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      mimeType.includes('word') || mimeType.includes('docx')) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      console.error('❌ Erreur extraction DOCX:', error);
      return 'Impossible d\'extraire le texte du DOCX.';
    }
  }

  // DOC non supporté
  if (mimeType === 'application/msword' || mimeType.includes('doc')) {
    console.warn('⚠️ Format .doc non supporté. Veuillez utiliser .docx.');
    throw new Error('Format .doc non supporté. Veuillez utiliser .docx, .pdf ou .txt.');
  }

  throw new Error(`Type MIME non supporté pour l'extraction de texte: ${mimeType}`);
};
