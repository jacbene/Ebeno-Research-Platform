// frontend/src/utils/hash.ts

export const computeFileHash = async (file: File): Promise<string> => {
  try {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('❌ Erreur lors du calcul du hash:', error);
    throw new Error('Impossible de calculer le hash du fichier');
  }
};
