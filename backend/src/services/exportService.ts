import { existsSync, mkdirSync, readFileSync } from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { db } from '../db/knex';

export const exportProject = async (projectId: string, userId: string): Promise<Buffer> => {
  // 1. Vérifier l'autorisation
  const member = await db('project_members')
    .where({ projectId, userId })
    .first();
  if (!member) {
    throw new Error('Non autorisé');
  }

  // 2. Récupérer les données
  const project = await db('projects').where({ id: projectId }).first();
  if (!project) {
    throw new Error('Projet non trouvé');
  }

  const transcriptions = await db('transcriptions')
    .where({ projectId })
    .select('*')
    .orderBy('createdAt', 'desc');

  const memos = await db('memos')
    .where({ projectId })
    .select('*')
    .orderBy('createdAt', 'desc');

  const files = await db('project_files')
    .where({ projectId })
    .select('*')
    .orderBy('uploaded_at', 'desc');

  // 3. Créer l'archive ZIP
  const zip = new AdmZip();
  const projectFolder = `projet_${project.title.replace(/\s+/g, '_')}`;

  // 3.1 Métadonnées
  const metadata = {
    project: {
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      visibility: project.visibility,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
    exported_at: new Date().toISOString(),
    stats: {
      transcriptions: transcriptions.length,
      memos: memos.length,
      files: files.length,
    },
  };
  zip.addFile(`${projectFolder}/metadata.json`, Buffer.from(JSON.stringify(metadata, null, 2), 'utf-8'));

  // 3.2 README
  const readme = `# Export du projet : ${project.title}\n\n`;
  const readmeContent = `${readme}
## 📋 Description
${project.description || 'Aucune description'}

## 📊 Statistiques
- Transcriptions : ${transcriptions.length}
- Mémos : ${memos.length}
- Fichiers uploadés : ${files.length}

## 📅 Export effectué le
${new Date().toLocaleDateString()}
`;
  zip.addFile(`${projectFolder}/README.md`, Buffer.from(readmeContent, 'utf-8'));

  // 3.3 Transcriptions
  if (transcriptions.length > 0) {
    transcriptions.forEach((t) => {
      const safeTitle = t.title.replace(/[^a-zA-Z0-9_-]/g, '_');
      const content = `Titre : ${t.title}\nStatut : ${t.status}\nDate : ${new Date(t.createdAt).toLocaleDateString()}\n\n---\n\n${t.transcriptText || 'Aucun texte'}`;
      zip.addFile(`${projectFolder}/transcriptions/${safeTitle}.txt`, Buffer.from(content, 'utf-8'));
    });
  }

  // 3.4 Mémos
  if (memos.length > 0) {
    memos.forEach((m) => {
      const safeTitle = m.title.replace(/[^a-zA-Z0-9_-]/g, '_');
      const content = `Titre : ${m.title}\nDate : ${new Date(m.createdAt).toLocaleDateString()}\n\n---\n\n${m.content}`;
      zip.addFile(`${projectFolder}/memos/${safeTitle}.txt`, Buffer.from(content, 'utf-8'));
    });
  }

  // 3.5 Fichiers uploadés
  if (files.length > 0) {
    files.forEach((f) => {
      const filePath = path.join(__dirname, '../../', f.filePath);
      if (existsSync(filePath)) {
        const fileContent = readFileSync(filePath);
        zip.addFile(`${projectFolder}/fichiers/${f.fileName}`, fileContent);
      } else {
        const meta = `Fichier introuvable : ${f.fileName}\nTaille : ${f.fileSize} octets\nType : ${f.mimeType}\nDate : ${new Date(f.uploaded_at).toLocaleDateString()}`;
        zip.addFile(`${projectFolder}/fichiers/${f.fileName}.meta.txt`, Buffer.from(meta, 'utf-8'));
      }
    });
  }

  // Retourner le buffer ZIP
  return zip.toBuffer();
};
