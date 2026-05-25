import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { auth, db } from '../lib/firebase';

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
        uid: uidToUse, 
        phoneNumber: phoneToUse, 
        createdAt: Date.now(), 
        ...data as UserProfile 
      });
      
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
