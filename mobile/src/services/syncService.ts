// mobile/src/services/syncService.ts
// Service de synchronisation pour l'application mobile
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { api } from './api';
import { database } from './database';
import { notificationService } from './notificationService';

const SYNC_KEYS = {
  LAST_SYNC: 'lastSync',
  PENDING_CHANGES: 'pendingChanges',
  SYNC_QUEUE: 'syncQueue',
  CONFLICTS: 'syncConflicts'
};

class SyncService {
  private isSyncing = false;
  private syncQueue: Array<{type: string; data: any; id: string}> = [];
  private conflictResolver: any = null;

  constructor() {
    this.loadSyncQueue();
    this.setupAutoSync();
  }

  // Configuration
  private async loadSyncQueue() {
    try {
      const queue = await AsyncStorage.getItem(SYNC_KEYS.SYNC_QUEUE);
      if (queue) {
        this.syncQueue = JSON.parse(queue);
      }
    } catch (error) {
      console.error('Erreur de chargement de la file de synchronisation:', error);
    }
  }

  private async saveSyncQueue() {
    try {
      await AsyncStorage.setItem(SYNC_KEYS.SYNC_QUEUE, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Erreur de sauvegarde de la file de synchronisation:', error);
    }
  }

  private setupAutoSync() {
    // Synchronisation automatique toutes les 5 minutes
    setInterval(() => {
      this.syncIfOnline();
    }, 5 * 60 * 1000);

    // Synchronisation lors du retour en ligne
    NetInfo.addEventListener(state => {
      if (state.isConnected) {
        this.syncIfOnline();
      }
    });
  }

  // Méthodes publiques
  async syncIfOnline() {
    const state = await NetInfo.fetch();
    if (state.isConnected && !this.isSyncing) {
      this.syncChanges();
    }
  }

  async syncChanges() {
    if (this.isSyncing) {
      console.log('Synchronisation déjà en cours');
      return;
    }

    this.isSyncing = true;
    
    try {
      // Récupérer les changements locaux
      const pendingChanges = await this.getPendingChanges();
      
      if (pendingChanges.length === 0 && this.syncQueue.length === 0) {
        console.log('Aucun changement à synchroniser');
        return;
      }

      // Ajouter les changements à la file
      this.syncQueue.push(...pendingChanges);
      await this.saveSyncQueue();

      // Synchroniser avec le serveur
      await this.processSyncQueue();

      // Mettre à jour la date de dernière synchronisation
      await AsyncStorage.setItem(SYNC_KEYS.LAST_SYNC, new Date().toISOString());

      // Notifier l'utilisateur
      notificationService.showSyncSuccess(pendingChanges.length);

    } catch (error) {
      console.error('Erreur de synchronisation:', error);
      notificationService.showSyncError(error.message);
    } finally {
      this.isSyncing = false;
    }
  }

  async syncAll() {
    // Synchronisation complète (utilisée au démarrage ou après une longue déconnexion)
    await this.syncChanges();
    
    // Télécharger les mises à jour du serveur
    await this.pullServerUpdates();
  }

  async addToSyncQueue(type: string, data: any) {
    const id = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const item = { type, data, id };
    
    this.syncQueue.push(item);
    await this.saveSyncQueue();
    
    // Tenter une synchronisation immédiate
    this.syncIfOnline();
    
    return id;
  }

  // Méthodes privées
  private async getPendingChanges() {
    try {
      const changes = await database.getPendingChanges();
      return changes.map(change => ({
        type: change.entityType,
        data: change.data,
        id: change.id,
        localId: change.localId
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des changements:', error);
      return [];
    }
  }

  private async processSyncQueue() {
    const batchSize = 10; // Traiter par lots pour éviter les timeouts
    
    while (this.syncQueue.length > 0) {
      const batch = this.syncQueue.splice(0, batchSize);
      
      try {
        await this.processBatch(batch);
        await this.saveSyncQueue();
      } catch (error) {
        console.error('Erreur lors du traitement du lot:', error);
        // Re-ajouter le lot à la file
        this.syncQueue.unshift(...batch);
        await this.saveSyncQueue();
        throw error;
      }
    }
  }

  private async processBatch(batch: Array<{type: string; data: any; id: string}>) {
    const results = [];
    
    for (const item of batch) {
      try {
        const result = await this.syncItem(item);
        results.push({ ...item, success: true, result });
        
        // Marquer comme synchronisé dans la base locale
        await database.markAsSynced(item.id, result.serverId);
        
      } catch (error) {
        console.error(`Erreur de synchronisation pour ${item.type}:`, error);
        results.push({ ...item, success: false, error });
        
        // Gérer les conflits
        if (error.status === 409) {
          await this.handleConflict(item, error);
        }
      }
    }
    
    return results;
  }

  private async syncItem(item: {type: string; data: any; id: string}) {
    switch (item.type) {
      case 'FIELD_NOTE':
        return await this.syncFieldNote(item.data);
      case 'SURVEY_RESPONSE':
        return await this.syncSurveyResponse(item.data);
      case 'DOCUMENT':
        return await this.syncDocument(item.data);
      case 'REFERENCE':
        return await this.syncReference(item.data);
      default:
        throw new Error(`Type de synchronisation non supporté: ${item.type}`);
    }
  }

  private async syncFieldNote(data: any) {
    if (data.id && data.id.startsWith('local_')) {
      // Créer une nouvelle note
      const response = await api.post('/field-data', data);
      return { serverId: response.data.id };
    } else {
      // Mettre à jour une note existante
      const response = await api.put(`/field-data/${data.id}`, data);
      return { serverId: data.id };
    }
  }

  private async syncSurveyResponse(data: any) {
    const response = await api.post(`/surveys/${data.surveyId}/responses`, data);
    return { serverId: response.data.id };
  }

  private async syncDocument(data: any) {
    // Pour les documents, nous pouvons avoir besoin d'uploader des fichiers
    if (data.file) {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('metadata', JSON.stringify(data.metadata));
      
      const response = await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return { serverId: response.data.id };
    } else {
      const response = await api.put(`/documents/${data.id}`, data);
      return { serverId: data.id };
    }
  }

  private async syncReference(data: any) {
    if (data.id && data.id.startsWith('local_')) {
      const response = await api.post('/references', data);
      return { serverId: response.data.id };
    } else {
      const response = await api.put(`/references/${data.id}`, data);
      return { serverId: data.id };
    }
  }

  private async pullServerUpdates() {
    try {
      const lastSync = await AsyncStorage.getItem(SYNC_KEYS.LAST_SYNC);
      
      // Récupérer les mises à jour depuis le serveur
      const updates = await api.get('/sync/updates', {
        params: { since: lastSync }
      });
      
      // Appliquer les mises à jour localement
      await this.applyServerUpdates(updates.data);
      
    } catch (error) {
      console.error('Erreur lors de la récupération des mises à jour:', error);
    }
  }

  private async applyServerUpdates(updates: any) {
    for (const update of updates) {
      try {
        switch (update.type) {
          case 'FIELD_NOTE':
            await database.upsertFieldNote(update.data);
            break;
          case 'PROJECT':
            await database.upsertProject(update.data);
            break;
          case 'DOCUMENT':
            await database.upsertDocument(update.data);
            break;
          case 'REFERENCE':
            await database.upsertReference(update.data);
            break;
        }
      } catch (error) {
        console.error(`Erreur lors de l'application de la mise à jour ${update.type}:`, error);
      }
    }
  }

  private async handleConflict(item: any, error: any) {
    // Enregistrer le conflit pour résolution manuelle
    const conflicts = await AsyncStorage.getItem(SYNC_KEYS.CONFLICTS);
    const conflictList = conflicts ? JSON.parse(conflicts) : [];
    
    conflictList.push({
      item,
      error: error.data,
      timestamp: new Date().toISOString()
    });
    
    await AsyncStorage.setItem(SYNC_KEYS.CONFLICTS, JSON.stringify(conflictList));
    
    // Notifier l'utilisateur
    notificationService.showSyncConflict(item.type);
  }

  async getSyncStatus() {
    const lastSync = await AsyncStorage.getItem(SYNC_KEYS.LAST_SYNC);
    const pendingChanges = await this.getPendingChanges();
    const queueLength = this.syncQueue.length;
    const conflicts = await AsyncStorage.getItem(SYNC_KEYS.CONFLICTS);
    const conflictList = conflicts ? JSON.parse(conflicts) : [];
    
    return {
      lastSync: lastSync ? new Date(lastSync) : null,
      pendingChanges: pendingChanges.length,
      queueLength,
      conflicts: conflictList.length,
      isSyncing: this.isSyncing
    };
  }

  async clearSyncQueue() {
    this.syncQueue = [];
    await this.saveSyncQueue();
    await AsyncStorage.removeItem(SYNC_KEYS.PENDING_CHANGES);
  }

  async resolveConflict(conflictId: string, resolution: 'keep_local' | 'use_server' | 'merge') {
    const conflicts = await AsyncStorage.getItem(SYNC_KEYS.CONFLICTS);
    let conflictList = conflicts ? JSON.parse(conflicts) : [];
    
    const conflict = conflictList.find((c: any) => c.item.id === conflictId);
    if (!conflict) {
      throw new Error('Conflit non trouvé');
    }
    
    // Appliquer la résolution
    switch (resolution) {
      case 'keep_local':
        // Rejouer la synchronisation
        await this.addToSyncQueue(conflict.item.type, conflict.item.data);
        break;
      case 'use_server':
        // Accepter la version du serveur
        await database.updateFromServer(conflict.item.type, conflict.error.serverData);
        break;
      case 'merge':
        // Fusionner les données
        const merged = this.mergeData(conflict.item.data, conflict.error.serverData);
        await database.updateFromServer(conflict.item.type, merged);
        break;
    }
    
    // Supprimer le conflit
    conflictList = conflictList.filter((c: any) => c.item.id !== conflictId);
    await AsyncStorage.setItem(SYNC_KEYS.CONFLICTS, JSON.stringify(conflictList));
  }

  private mergeData(localData: any, serverData: any) {
    // Logique de fusion simple - à améliorer selon les besoins
    return {
      ...serverData,
      ...localData,
      mergedAt: new Date().toISOString(),
      version: Math.max(localData.version || 0, serverData.version || 0) + 1
    };
  }
}

export const syncService = new SyncService();
