// frontend/src/services/mobileSyncService.ts
// Service de synchronisation pour l'application mobile
import { api } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

class MobileSyncService {
  private SYNC_KEY = 'ebenor_offline_data';
  private SYNC_TIMESTAMP_KEY = 'ebenor_last_sync';
  
  // Synchroniser les données
  async syncData(deviceId: string) {
    try {
      // Récupérer les données hors ligne
      const offlineData = await this.getOfflineData();
      const lastSync = await this.getLastSyncTimestamp();
      
      // Envoyer au serveur
      const response = await api.post('/field-data/sync', {
        deviceId,
        fieldNotes: offlineData.fieldNotes || [],
        lastSync: lastSync || new Date(0).toISOString()
      });
      
      const { serverChanges, processedNotes, syncTimestamp } = response.data.data;
      
      // Mettre à jour le stockage local
      await this.updateLocalData(processedNotes, serverChanges);
      await this.setLastSyncTimestamp(syncTimestamp);
      
      return {
        success: true,
        synced: processedNotes.length,
        received: serverChanges.length
      };
    } catch (error) {
      console.error('Erreur de synchronisation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Sauvegarder une note hors ligne
  async saveOfflineFieldNote(note: any) {
    try {
      const data = await this.getOfflineData();
      
      // Générer un ID temporaire si nécessaire
      if (!note.id) {
        note.id = `local-${Date.now()}`;
      }
      
      note.syncVersion = (note.syncVersion || 0) + 1;
      note.createdAt = note.createdAt || new Date().toISOString();
      note.updatedAt = new Date().toISOString();
      
      // Ajouter ou mettre à jour
      const index = data.fieldNotes.findIndex((n: any) => n.id === note.id);
      if (index >= 0) {
        data.fieldNotes[index] = note;
      } else {
        data.fieldNotes.push(note);
      }
      
      await AsyncStorage.setItem(this.SYNC_KEY, JSON.stringify(data));
      return { success: true, note };
    } catch (error) {
      console.error('Erreur de sauvegarde:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Méthodes privées
  private async getOfflineData() {
    try {
      const data = await AsyncStorage.getItem(this.SYNC_KEY);
      return data ? JSON.parse(data) : { fieldNotes: [] };
    } catch (error) {
      return { fieldNotes: [] };
    }
  }
  
  private async getLastSyncTimestamp() {
    try {
      return await AsyncStorage.getItem(this.SYNC_TIMESTAMP_KEY);
    } catch (error) {
      return null;
    }
  }
  
  private async setLastSyncTimestamp(timestamp: string) {
    await AsyncStorage.setItem(this.SYNC_TIMESTAMP_KEY, timestamp);
  }
  
  private async updateLocalData(processedNotes: any[], serverChanges: any[]) {
    const data = await this.getOfflineData();
    
    // Mettre à jour les notes synchronisées
    processedNotes.forEach(serverNote => {
      const index = data.fieldNotes.findIndex((n: any) => 
        n.id === serverNote.id || 
        (n.id && n.id.startsWith('local-') && n.title === serverNote.title)
      );
      
      if (index >= 0) {
        data.fieldNotes[index] = serverNote;
      }
    });
    
    // Ajouter les nouvelles notes du serveur
    serverChanges.forEach(serverNote => {
      if (!data.fieldNotes.some((n: any) => n.id === serverNote.id)) {
        data.fieldNotes.push(serverNote);
      }
    });
    
    // Supprimer les doublons
    const uniqueNotes = data.fieldNotes.filter(
      (note: any, index: number, self: any[]) =>
        index === self.findIndex((n) => n.id === note.id)
    );
    
    data.fieldNotes = uniqueNotes;
    await AsyncStorage.setItem(this.SYNC_KEY, JSON.stringify(data));
  }
}

export const mobileSyncService = new MobileSyncService();
