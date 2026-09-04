import fs from 'fs';
import path from 'path';
import PDFParser from 'pdf2json';
import mammoth from 'mammoth';

// Fonction de décodage sécurisée
const safeDecode = (str: string): string => {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
};

export const extractText = async (filePath: string, mimeType?: string): Promise<string> => {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.txt' || ext === '.md' || ext === '.csv' || ext === '.json' || ext === '.xml' || ext === '.html' || ext === '.css' || ext === '.js' || ext === '.ts') {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch {
      return '';
    }
  }

  if (ext === '.pdf') {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfParser = new PDFParser();
      return new Promise((resolve, reject) => {
        pdfParser.on('pdfParser_dataError', (err: any) => reject(err));
        pdfParser.on('pdfParser_dataReady', (data: any) => {
          let text = '';
          if (data && data.Pages) {
            text = data.Pages.map((page: any) =>
              page.Texts.map((t: any) => safeDecode(t.R[0].T)).join(' ')
            ).join('\n');
          }
          resolve(text);
        });
        pdfParser.parseBuffer(dataBuffer);
      });
    } catch (err) {
      console.warn(`⚠️ Erreur lecture PDF ${filePath}:`, err);
      return '';
    }
  }

  if (ext === '.docx') {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value || '';
    } catch (err) {
      console.warn(`⚠️ Erreur lecture DOCX ${filePath}:`, err);
      return '';
    }
  }

  console.warn(`⚠️ Format non supporté : ${ext}, ignoré`);
  return '';
};
