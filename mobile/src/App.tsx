// mobile/src/App.tsx
// Application principale React Native
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { 
  SafeAreaView, 
  StatusBar, 
  StyleSheet,
  Platform,
  View,
  Text
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Contextes
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SyncProvider } from './contexts/SyncContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

// Écrans
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import ProjectsScreen from './screens/projects/ProjectsScreen';
import ProjectDetailScreen from './screens/projects/ProjectDetailScreen';
import FieldNotesScreen from './screens/field/FieldNotesScreen';
import NewFieldNoteScreen from './screens/field/NewFieldNoteScreen';
import ReferencesScreen from './screens/references/ReferencesScreen';
import SurveysScreen from './screens/surveys/SurveysScreen';
import ProfileScreen from './screens/profile/ProfileScreen';
import OfflineScreen from './screens/OfflineScreen';

// Services
import { syncService } from './services/syncService';
import { notificationService } from './services/notificationService';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Navigateur à onglets principal
function MainTabs() {
  const { colors } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Accueil':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Projets':
              iconName = focused ? 'folder' : 'folder-outline';
              break;
            case 'Terrain':
              iconName = focused ? 'location' : 'location-outline';
              break;
            case 'Références':
              iconName = focused ? 'library' : 'library-outline';
              break;
            case 'Enquêtes':
              iconName = focused ? 'clipboard' : 'clipboard-outline';
              break;
            case 'Profil':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 85 : 60,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen 
        name="Accueil" 
        component={HomeScreen}
        options={{ title: 'Tableau de bord' }}
      />
      <Tab.Screen 
        name="Projets" 
        component={ProjectsScreen}
        options={{ title: 'Mes projets' }}
      />
      <Tab.Screen 
        name="Terrain" 
        component={FieldNotesScreen}
        options={{ title: 'Données terrain' }}
      />
      <Tab.Screen 
        name="Références" 
        component={ReferencesScreen}
        options={{ title: 'Bibliographie' }}
      />
      <Tab.Screen 
        name="Enquêtes" 
        component={SurveysScreen}
        options={{ title: 'Enquêtes' }}
      />
      <Tab.Screen 
        name="Profil" 
        component={ProfileScreen}
        options={{ title: 'Mon profil' }}
      />
    </Tab.Navigator>
  );
}

// Composant principal de l'application
function AppContent() {
  const { user, loading } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const { colors } = useTheme();

  useEffect(() => {
    // Surveiller la connexion réseau
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected || false);
      
      if (state.isConnected) {
        // Tenter une synchronisation automatique
        syncService.syncAll().catch(console.error);
      }
    });

    // Charger la dernière synchronisation
    AsyncStorage.getItem('lastSync').then(value => {
      if (value) {
        setLastSync(new Date(value));
      }
    });

    // Configurer les notifications
    notificationService.configure();

    // Synchronisation périodique (toutes les 5 minutes si en ligne)
    const syncInterval = setInterval(() => {
      if (isOnline) {
        syncService.syncChanges().catch(console.error);
      }
    }, 5 * 60 * 1000);

    return () => {
      unsubscribeNetInfo();
      clearInterval(syncInterval);
    };
  }, [isOnline]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Icon name="analytics" size={60} color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Chargement d'Ebeno...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle={colors.mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      
      {/* Bannière de statut hors ligne */}
      {!isOnline && (
        <View style={[styles.offlineBanner, { backgroundColor: colors.warning }]}>
          <Icon name="cloud-offline" size={20} color={colors.white} />
          <Text style={[styles.offlineText, { color: colors.white }]}>
            Mode hors ligne - Synchronisation suspendue
          </Text>
        </View>
      )}
      
      {/* Bannière de synchronisation */}
      {isOnline && lastSync && (Date.now() - lastSync.getTime()) > 30 * 60 * 1000 && (
        <View style={[styles.syncBanner, { backgroundColor: colors.info }]}>
          <Icon name="sync" size={20} color={colors.white} />
          <Text style={[styles.syncText, { color: colors.white }]}>
            Synchronisation en cours...
          </Text>
        </View>
      )}

      <NavigationContainer
        theme={{
          dark: colors.mode === 'dark',
          colors: {
            primary: colors.primary,
            background: colors.background,
            card: colors.card,
            text: colors.text,
            border: colors.border,
            notification: colors.notification,
          }
        }}
      >
        <Stack.Navigator>
          {!user ? (
            // Écrans d'authentification
            <>
              <Stack.Screen 
                name="Login" 
                component={LoginScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="Register" 
                component={RegisterScreen}
                options={{ title: 'Créer un compte' }}
              />
            </>
          ) : (
            // Écrans principaux
            <>
              <Stack.Screen 
                name="Main" 
                component={MainTabs}
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="ProjectDetail" 
                component={ProjectDetailScreen}
                options={({ route }) => ({ 
                  title: (route.params as any)?.projectName || 'Projet'
                })}
              />
              <Stack.Screen 
                name="NewFieldNote" 
                component={NewFieldNoteScreen}
                options={{ title: 'Nouvelle note' }}
              />
              <Stack.Screen 
                name="Offline" 
                component={OfflineScreen}
                options={{ title: 'Mode hors ligne' }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
}

// Composant racine de l'application
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SyncProvider>
          <AppContent />
        </SyncProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '500',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  offlineText: {
    fontSize: 14,
    fontWeight: '500',
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  syncText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
