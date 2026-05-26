import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { 
  ArrowLeft, 
  Trash2, 
  ChevronRight, 
  Bell, 
  MapPin, 
  ShieldAlert, 
  HelpCircle,
  FileText,
  LogOut
} from 'lucide-react-native';

const LUMEN_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 10 },
  elevation: 5,
};

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, signOut, updateProfile } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const notificationsEnabled = profile?.notificationsEnabled !== false;

  const toggleNotifications = async () => {
    try {
      const nextVal = !notificationsEnabled;
      await updateProfile({ notificationsEnabled: nextVal });
      Alert.alert("Preferences Updated", `Notifications are now ${nextVal ? 'enabled' : 'disabled'}.`);
    } catch (error) {
      console.error("Failed to update notification preference:", error);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account?",
      "Are you sure you want to delete your account? This action is permanent and cannot be undone. All your profile data, addresses, and transaction history will be deleted.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete Account", 
          style: "destructive", 
          onPress: performDeleteAccount 
        }
      ]
    );
  };

  const performDeleteAccount = async () => {
    if (!profile?.uid) return;
    setDeleting(true);

    try {
      // 1. Delete user profile from Firestore
      const userDocRef = doc(db, 'users', profile.uid);
      await deleteDoc(userDocRef);

      // 2. Delete user from Firebase Auth
      const currentUser = auth.currentUser;
      if (currentUser) {
        await currentUser.delete();
      }

      // 3. Clear local session
      await signOut();
      setDeleting(false);
      Alert.alert("Account Deleted", "Your account has been successfully deleted.");
      router.replace('/');
    } catch (error: any) {
      console.error("Delete account error:", error);
      setDeleting(false);
      
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert(
          "Re-authentication Required",
          "For security reasons, you must log in again to delete your account. We will sign you out now.",
          [
            { 
              text: "Sign Out", 
              style: "destructive",
              onPress: async () => {
                await signOut();
                router.replace('/');
              } 
            }
          ]
        );
      } else {
        Alert.alert(
          "Error",
          error.message || "Failed to delete account. Please try again."
        );
      }
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="px-6 pt-4 pb-6 flex-row items-center gap-4">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="h-12 w-12 rounded-2xl bg-white items-center justify-center border border-gray-100"
            style={LUMEN_SHADOW}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#000" />
          </TouchableOpacity>
          <Text className="text-[28px] font-bold text-black tracking-tight">App Settings</Text>
        </View>

        {deleting ? (
          <View className="flex-1 items-center justify-center p-8">
            <ActivityIndicator size="large" color="#ef4444" />
            <Text className="text-[16px] font-bold text-gray-500 mt-4 text-center">
              Deleting your account and data...
            </Text>
          </View>
        ) : (
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            <Animated.View entering={FadeInDown.duration(600)}>
              {/* Preferences Section */}
              <SettingsSection title="Preferences">
                <SettingsRow 
                  icon={<Bell size={20} color="#000" />} 
                  label="Push Notifications" 
                  value={notificationsEnabled ? "Enabled" : "Disabled"} 
                  onPress={toggleNotifications}
                />
              </SettingsSection>

              {/* Account Security Section */}
              <SettingsSection title="Account & Security">
                <SettingsRow 
                  icon={<Trash2 size={20} color="#ef4444" />} 
                  label="Delete Account" 
                  color="#ef4444"
                  onPress={handleDeleteAccount}
                  isLast
                />
              </SettingsSection>

              {/* Information Section */}
              <SettingsSection title="Information">
                <SettingsRow 
                  icon={<FileText size={20} color="#000" />} 
                  label="Terms of Service" 
                  onPress={() => router.push('/support/terms')} 
                />
                <SettingsRow 
                  icon={<ShieldAlert size={20} color="#000" />} 
                  label="Privacy Policy" 
                  onPress={() => router.push('/support/privacy')} 
                  isLast
                />
              </SettingsSection>

              <Text className="text-center text-gray-300 text-[11px] font-bold uppercase tracking-[2px] mt-12 mb-8">
                Version 2.4.0 (Build 88)
              </Text>
            </Animated.View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-8">
       <Text className="px-10 text-[11px] font-bold text-muted uppercase tracking-[3px] mb-4">{title}</Text>
       <View className="mx-6 bg-white rounded-[32px] border border-gray-50 overflow-hidden" style={LUMEN_SHADOW}>
          {children}
       </View>
    </View>
  );
}

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  isLast?: boolean;
  color?: string;
}

function SettingsRow({ icon, label, value, onPress, isLast, color }: SettingsRowProps) {
  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.7}
      className={`flex-row items-center justify-between p-6 ${!isLast ? 'border-b border-gray-50' : ''}`}
    >
      <View className="flex-row items-center gap-4">
        <View className="h-10 w-10 rounded-2xl bg-gray-50 items-center justify-center">
          {icon}
        </View>
        <Text className={`text-[15px] font-bold ${color ? '' : 'text-black'}`} style={color ? { color } : {}}>{label}</Text>
      </View>
      <View className="flex-row items-center gap-3">
        {value && <Text className="text-[13px] font-bold text-gray-400">{value}</Text>}
        <ChevronRight size={16} color="#cbd5e1" />
      </View>
    </TouchableOpacity>
  );
}
