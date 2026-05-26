import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, Alert, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { 
  User, 
  MapPin, 
  Wallet, 
  CreditCard, 
  Bell, 
  ShieldCheck, 
  HelpCircle, 
  FileText, 
  LogOut,
  ChevronRight,
  Settings,
  Crown,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  Camera
} from 'lucide-react-native';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { uploadToCloudinary } from '../../lib/cloudinary';

const LUMEN_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 10 },
  elevation: 5,
};

export default function ProfileScreen() {
  const { profile, signOut, updateProfile } = useAuth();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => signOut() }
    ]);
  };

  const handleSelectImage = async () => {
    Alert.alert(
      "Profile Picture",
      "Choose an option to update your profile picture",
      [
        { text: "Take Photo", onPress: handleCamera },
        { text: "Choose from Gallery", onPress: handleGallery },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const handleCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Required", "We need camera permission to take a picture.");
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("Error", "Failed to access camera.");
    }
  };

  const handleGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Required", "We need gallery permission to choose a picture.");
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Gallery error:", error);
      Alert.alert("Error", "Failed to access photo gallery.");
    }
  };

  const uploadImage = async (uri: string) => {
    setUploading(true);
    try {
      const imageUrl = await uploadToCloudinary(uri, "user_profiles");
      await updateProfile({ profileImage: imageUrl });
      Alert.alert("Success", "Profile picture updated successfully.");
    } catch (error: any) {
      console.error("Upload error:", error);
      Alert.alert("Upload Failed", error.message || "Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleOpenURL = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error("Failed to open URL:", error);
      Alert.alert("Error", "Could not open the link. Please visit " + url);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="px-8 pt-4 pb-4">
          <Text className="text-[32px] font-bold text-black tracking-tight">Account</Text>
        </View>
 
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 140 }}
        >
          {/* Luxe Profile Card */}
          <Animated.View 
            entering={FadeInDown.duration(800)} 
            className="mx-6 mt-6 mb-10 bg-white rounded-[48px] p-8 flex-row items-center border border-gray-50"
            style={LUMEN_SHADOW}
          >
            <TouchableOpacity 
              onPress={handleSelectImage} 
              disabled={uploading} 
              activeOpacity={0.8}
              className="relative"
            >
              <Animated.View entering={ZoomIn.delay(300).duration(600)} className="h-20 w-20 rounded-[32px] bg-blue-600 items-center justify-center shadow-lg shadow-blue-300 overflow-hidden">
                {profile?.profileImage ? (
                  <Image source={{ uri: profile.profileImage }} className="h-full w-full" />
                ) : (
                  <Text className="text-[32px] font-bold text-white">
                    {profile?.firstName ? profile.firstName.charAt(0).toUpperCase() : (profile?.phoneNumber ? '#' : 'P')}
                  </Text>
                )}
                {uploading && (
                  <View className="absolute top-0 left-0 w-full h-full bg-black/40 items-center justify-center">
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
              </Animated.View>
              <View className="absolute -bottom-2 -right-2 h-8 w-8 bg-black rounded-full border-4 border-white items-center justify-center">
                 <Camera size={14} color="#fff" />
              </View>
            </TouchableOpacity>
            
            <View className="ml-6 flex-1">
              <Text className="text-[22px] font-bold text-black tracking-tight" numberOfLines={1}>
                {profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}` : 'User Account'}
              </Text>
              <Text className="text-[13px] text-muted font-bold mt-1" numberOfLines={1}>
                {profile?.phoneNumber || profile?.email || 'piyush.sharma@dirtfree.app'}
              </Text>
              
              <View className="flex-row mt-4 gap-2">
                {profile?.createdAt && (
                  <View className="bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                    <Text className="text-[9px] font-bold text-muted uppercase tracking-widest">
                      Member Since {new Date(profile.createdAt).getFullYear()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Animated.View>

          {/* Action Sections */}
          <MenuSection title="Personal">
            <MenuRow icon={<MapPin size={20} color="#000" />} label="My Addresses" onPress={() => router.push('/addresses')} />
            <MenuRow icon={<CreditCard size={20} color="#000" />} label="Payments" isLast onPress={() => router.push('/payments')} />
          </MenuSection>

          <MenuSection title="Preferences">
            <MenuRow 
              icon={<Settings size={20} color="#000" />} 
              label="App Settings" 
              isLast 
              onPress={() => router.push('/settings')} 
            />
          </MenuSection>

          <MenuSection title="Support">
            <MenuRow 
              icon={<HelpCircle size={20} color="#000" />} 
              label="Help Centre" 
              onPress={() => handleOpenURL('https://dirtfree.in/contact')} 
            />
            <MenuRow 
              icon={<FileText size={20} color="#000" />} 
              label="Privacy Policy" 
              onPress={() => handleOpenURL('https://dirtfree.in/privacy-policy')} 
            />
            <MenuRow icon={<LogOut size={20} color="#ef4444" />} label="Sign Out" color="#ef4444" isLast onPress={handleLogout} />
          </MenuSection>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-10">
       <Text className="px-10 text-[11px] font-bold text-muted uppercase tracking-[3px] mb-6">{title}</Text>
       <View className="mx-6 bg-white rounded-[40px] border border-gray-50 overflow-hidden" style={LUMEN_SHADOW}>
          {children}
       </View>
    </View>
  );
}

function MenuRow({ icon, label, value, onPress, isLast, color }: any) {
  return (
    <Pressable 
      onPress={onPress}
      className={`flex-row items-center justify-between p-6 ${!isLast ? 'border-b border-gray-50' : ''}`}
    >
      <View className="flex-row items-center gap-4">
        <View className="h-10 w-10 rounded-2xl bg-gray-50 items-center justify-center">
          {icon}
        </View>
        <Text className={`text-[15px] font-bold ${color ? `text-[${color}]` : 'text-black'}`} style={color ? { color } : {}}>{label}</Text>
      </View>
      <View className="flex-row items-center gap-3">
        {value && <Text className="text-[13px] font-bold text-blue-600">{value}</Text>}
        <ChevronRight size={16} color="#cbd5e1" />
      </View>
    </Pressable>
  );
}
