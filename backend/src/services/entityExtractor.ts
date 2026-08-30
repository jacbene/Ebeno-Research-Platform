import nlp from 'compromise';
import { db } from '../db/knex';
import { extractText } from './textExtractor';
import path from 'path';
import fs from 'fs';

type EntityType = 'Person' | 'Place' | 'Organization' | 'Date' | 'Email' | 'Phone' | 'Url';

export const extractEntitiesFromText = (text: string): Record<EntityType, string[]> => {
  const doc = nlp(text);
  const entities: Record<EntityType, string[]> = {
    Person: [],
    Place: [],
    Organization: [],
    Date: [],
    Email: [],
    Phone: [],
    Url: [],
  };

  // Personnes
  try {
    const people = doc.people().out('array');
    entities.Person = people.filter((p: string) => p.length > 1);
  } catch (e) {
    console.warn('Erreur extraction personnes:', e);
  }

  // Lieux
  try {
    const places = doc.places().out('array');
    entities.Place = places.filter((p: string) => p.length > 1);
  } catch (e) {
    console.warn('Erreur extraction lieux:', e);
  }

  // Organisations (heuristique)
  try {
    const nouns = doc.match('#Noun+').out('array');
    const orgKeywords = ['corp', 'inc', 'llc', 'ltd', 'sarl', 'sa', 'association', 'foundation', 'university', 'school', 'college', 'universite', 'institut', 'laboratoire', 'centre', 'laboratory', 'institute', 'univ'];
    entities.Organization = nouns.filter((n: string) => {
      const lower = n.toLowerCase();
      return orgKeywords.some(kw => lower.includes(kw)) && n.length > 2;
    });
  } catch (e) {
    console.warn('Erreur extraction organisations:', e);
  }

  // Dates (regex)
  const dateRegex = /\b\d{1,2}\s*(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|jan|fév|mar|avr|mai|jun|jui|aoû|sep|oct|nov|déc)\s*\d{2,4}\b|\b\d{2,4}[-/]\d{1,2}[-/]\d{1,2}\b|\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/gi;
  const dates = text.match(dateRegex) || [];
  entities.Date = dates.filter((d: string) => d.length > 1);

  // Emails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = text.match(emailRegex) || [];
  entities.Email = emails;

  // Téléphones (simplifié)
  const phoneRegex = /(?:\+?\d{1,3}[-.]?)?\(?\d{2,4}\)?[-.]?\d{3,4}[-.]?\d{3,4}/g;
  const phones = text.match(phoneRegex) || [];
  entities.Phone = phones;

  // URLs
  const urlRegex = /https?:\/\/[^\s]+/g;
  const urls = text.match(urlRegex) || [];
  entities.Url = urls;

  return entities;
};

export const extractAndStoreEntities = async (
  documentId: string,
  documentType: 'transcription' | 'memo' | 'file',
  text: string
): Promise<void> => {
  if (!text || text.trim().length < 10) {
    console.log(`📝 Texte trop court pour ${documentId}, passage`);
    return;
  }

  console.log(`📝 Extraction pour ${documentId} (${documentType}) – ${text.length} caractères`);

  const entities = extractEntitiesFromText(text);

  // Supprimer les anciennes entités
  await db('document_entities')
    .where({ documentId, documentType })
    .delete();

  const now = Date.now();
  const rows = [];
  for (const [entityType, values] of Object.entries(entities)) {
    for (const value of values) {
      if (value.trim().length > 1) {
        rows.push({
          id: `${documentId}-${entityType}-${value.substring(0, 20)}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          documentId,
          documentType,
          entityType,
          entityValue: value.trim(),
          occurrenceCount: 1,
          created_at: now,
          updated_at: now,
        });
      }
    }
  }

  if (rows.length > 0) {
    await db('document_entities').insert(rows);
    console.log(`✅ ${rows.length} entités extraites pour ${documentId}`);
  } else {
    console.log(`⚠️ Aucune entité trouvée pour ${documentId}`);
  }
};

export const getDocumentEntities = async (
  documentId: string,
  documentType: string
): Promise<Record<EntityType, string[]>> => {
  const rows = await db('document_entities')
    .where({ documentId, documentType })
    .select('entityType', 'entityValue');

  const result: Record<EntityType, string[]> = {
    Person: [],
    Place: [],
    Organization: [],
    Date: [],
    Email: [],
    Phone: [],
    Url: [],
  };

  rows.forEach(row => {
    const type = row.entityType as EntityType;
    if (!result[type]) result[type] = [];
    if (!result[type].includes(row.entityValue)) {
      result[type].push(row.entityValue);
    }
  });

  return result;
};

export const getProjectEntities = async (
  projectId: string,
  userId: string
): Promise<Record<EntityType, string[]>> => {
  console.log(`🔍 getProjectEntities appelée pour projet ${projectId}`);

  const allEntities: Record<EntityType, string[]> = {
    Person: [], Place: [], Organization: [], Date: [], Email: [], Phone: [], Url: [],
  };

  try {
    // 1. Récupérer les IDs des mémos du projet
    const memos = await db('memos').where({ projectId }).select('id');
    const memoIds = memos.map(m => m.id);

    // 2. Récupérer les IDs des transcriptions du projet
    const transcriptions = await db('transcriptions').where({ projectId }).select('id');
    const transcriptionIds = transcriptions.map(t => t.id);

    // 3. Récupérer les IDs des fichiers du projet
    const files = await db('project_files').where({ projectId }).select('id');
    const fileIds = files.map(f => f.id);

    // 4. Tous les IDs de documents
    const allDocIds = [...memoIds, ...transcriptionIds, ...fileIds];

    console.log(`📄 ${allDocIds.length} documents trouvés pour le projet`);

    if (allDocIds.length === 0) {
      return allEntities;
    }

    // 5. Récupérer toutes les entités pour ces documents
    const entities = await db('document_entities')
      .whereIn('documentId', allDocIds)
      .select('entityType', 'entityValue');

    console.log(`🏷️ ${entities.length} entités trouvées en base`);

    // 6. Grouper par type
    entities.forEach(row => {
      const type = row.entityType as EntityType;
      if (!allEntities[type]) allEntities[type] = [];
      if (!allEntities[type].includes(row.entityValue)) {
        allEntities[type].push(row.entityValue);
      }
    });

  } catch (error) {
    console.error('❌ Erreur getProjectEntities:', error);
  }

  return allEntities;
};
