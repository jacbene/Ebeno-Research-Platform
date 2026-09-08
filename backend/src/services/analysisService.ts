// backend/src/services/analysisService.ts
import { db } from '../db/knex';
import { extractText, extractTextFromUrl } from './textExtractor';
import fs from 'fs';
import path from 'path';

export const getDocumentAnalysis = async (documentId: string, type: string, userId: string) => {
  let text = '';

  if (type === 'transcription') {
    const doc = await db('transcriptions').where({ id: documentId, userId }).first();
    if (!doc) throw new Error('Document non trouvé');
    text = doc.transcriptText || '';
  } else if (type === 'memo') {
    const doc = await db('memos').where({ id: documentId, userId }).first();
    if (!doc) throw new Error('Memo non trouvé');
    text = doc.content || '';
  } else if (type === 'file') {
    const doc = await db('project_files').where({ id: documentId, userId }).first();
    if (!doc) throw new Error('Fichier non trouvé');
    
    // ✅ Vérifier si c'est une URL Cloudinary
    if (doc.filePath && doc.filePath.startsWith('http')) {
      text = await extractTextFromUrl(doc.filePath, doc.mimeType);
    } else {
      // Fallback vers le fichier local
      const filePath = path.join(__dirname, '../../', doc.filePath);
      if (!fs.existsSync(filePath)) throw new Error('Fichier physique introuvable');
      text = await extractText(filePath, doc.mimeType);
    }
  } else {
    throw new Error('Type de document inconnu');
  }

  if (!text || text.trim().length < 50) {
    return { message: 'Texte trop court pour une analyse.' };
  }

  // ... Le reste de votre logique d'analyse (word count, sentiment, etc.)
  const wordCount = text.split(/\s+/).length;
  return { wordCount, text: text.substring(0, 500) };
};
