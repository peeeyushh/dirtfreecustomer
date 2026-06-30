import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { ActivityIndicator, View, Platform } from 'react-native';
import { auth, db } from '../lib/firebase';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface UserProfile {
  uid: string;
  phoneNumber: string | null;
  firstName?: string;
  lastName?: string;
  email?: string;
  profileImage?: string;
  selectedAddress?: string;
  walletBalance?: number;
  createdAt: number;
  notificationsEnabled?: boolean;
  pushToken?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  signOut: () => Promise<void>;
  setProfileState: (profile: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function registerForPushNotificationsAsync() {
  let token;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? '9ab07561-5a86-4ad4-b943-401990208e47';
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (e) {
      console.log('Error getting push token', e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        console.log('No profile found in Firestore for UID:', uid);
        setProfile({
          uid,
          phoneNumber: auth.currentUser?.phoneNumber || null,
          createdAt: Date.now()
        });
      }
    } catch (error: any) {
      console.log('Profile fetch error/refused - using default:', error.message);
      setProfile({
        uid,
        phoneNumber: auth.currentUser?.phoneNumber || null,
        createdAt: Date.now()
      });
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        await fetchProfile(firebaseUser.uid);
        
        // Register for push notifications
        try {
          const token = await registerForPushNotificationsAsync();
          if (token) {
            // We use setDoc with merge to ensure it saves even if updateProfile isn't ready
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              pushToken: token,
              updatedAt: Date.now()
            }, { merge: true });
          }
        } catch (err) {
          console.log('Push notification setup failed:', err);
        }
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, [fetchProfile]);

  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    const uidToUse = user?.uid || profile?.uid;
    const phoneToUse = user?.phoneNumber || profile?.phoneNumber;
    if (!uidToUse) return;

    try {
      const docRef = doc(db, 'users', uidToUse);
      await setDoc(docRef, { 
        ...data, 
        uid: uidToUse,
        phoneNumber: phoneToUse,
        updatedAt: Date.now() 
      }, { merge: true });

      setProfile(prev => prev ? { ...prev, ...data } : { 
        ...data,
        uid: uidToUse, 
        phoneNumber: phoneToUse, 
        createdAt: Date.now()
      } as UserProfile);
      
      if (data.selectedAddress) {
        await AsyncStorage.setItem('user_location', data.selectedAddress);
      }
    } catch (error: any) {
      if (error.code !== 'permission-denied') {
        console.error('Error updating profile:', error);
        throw error;
      }
    }
  }, [user?.uid, user?.phoneNumber, profile?.uid, profile?.phoneNumber]);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      setProfile(null);
      setUser(null);
      await AsyncStorage.removeItem('user_location');
      await auth.signOut();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    updateProfile,
    signOut,
    setProfileState: setProfile
  }), [user, profile, loading, updateProfile, signOut]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#006D44" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
