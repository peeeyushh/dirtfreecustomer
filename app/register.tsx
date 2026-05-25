import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  User, 
  Mail, 
  ChevronRight, 
  Sparkles,
  ArrowLeft
} from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const LUMEN_SHADOW = { 
  shadowColor: "#000", 
  shadowOpacity: 0.3, 
  shadowRadius: 25, 
  shadowOffset: { width: 0, height: 12 }, 
  elevation: 10 
};

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { updateProfile, profile } = useAuth();
  const { showAlert } = useAlert();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!firstName.trim()) {
      showAlert({ title: 'Name Required', message: 'Please enter your first name to continue.', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      });
      
      // After name is saved, go to location setup if not already set
      router.replace('/(tabs)');
    } catch (error: any) {
      showAlert({ title: 'Error', message: error.message || 'Failed to save profile.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#0E1220]">
      <StatusBar style="light" />
      
      {/* Abstract Background Decoration */}
      <View className="absolute top-[-100] right-[-100] w-[300] h-[300] rounded-full bg-blue-600/10 blur-3xl" />
      <View className="absolute bottom-[-50] left-[-50] w-[200] h-[200] rounded-full bg-purple-600/10 blur-3xl" />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View className="px-8 pt-12 pb-8" style={{ marginTop: insets.top }}>
            <Animated.View entering={FadeInUp.delay(200)}>
               <View className="flex-row items-center gap-2 mb-4">
                  <View className="h-px w-8 bg-blue-500" />
                  <Text className="text-blue-500 text-[10px] font-bold uppercase tracking-[4px]">Onboarding</Text>
               </View>
               <Text className="text-white text-[40px] font-bold leading-[44px] tracking-tight">
                  Help us know{'\n'}you better
               </Text>
               <Text className="text-white/40 text-[16px] font-medium mt-4 leading-6">
                  Just a few details to personalize{'\n'}your DirtFree experience.
               </Text>
            </Animated.View>
          </View>

          {/* Form Section */}
          <View className="px-8 space-y-6">
            <Animated.View entering={FadeInUp.delay(400)}>
               <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[2px] mb-3 ml-2">First Name</Text>
               <View className="flex-row items-center bg-white/5 rounded-[24px] h-[64px] px-6 border border-white/10">
                  <User size={18} color="rgba(255,255,255,0.4)" />
                  <TextInput
                    placeholder="e.g. Piyush"
                    className="flex-1 ml-4 text-white text-[16px] font-bold"
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholderTextColor="rgba(255,255,255,0.15)"
                    selectionColor="#3B6BFF"
                  />
               </View>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(500)} className="mt-6">
               <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[2px] mb-3 ml-2">Last Name (Optional)</Text>
               <View className="flex-row items-center bg-white/5 rounded-[24px] h-[64px] px-6 border border-white/10">
                  <User size={18} color="rgba(255,255,255,0.4)" />
                  <TextInput
                    placeholder="e.g. Sharma"
                    className="flex-1 ml-4 text-white text-[16px] font-bold"
                    value={lastName}
                    onChangeText={setLastName}
                    placeholderTextColor="rgba(255,255,255,0.15)"
                    selectionColor="#3B6BFF"
                  />
               </View>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(600)} className="mt-6">
               <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[2px] mb-3 ml-2">Email Address (Optional)</Text>
               <View className="flex-row items-center bg-white/5 rounded-[24px] h-[64px] px-6 border border-white/10">
                  <Mail size={18} color="rgba(255,255,255,0.4)" />
                  <TextInput
                    placeholder="piyush@example.com"
                    className="flex-1 ml-4 text-white text-[16px] font-bold"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor="rgba(255,255,255,0.15)"
                    selectionColor="#3B6BFF"
                  />
               </View>
            </Animated.View>
          </View>

          {/* Bottom Button */}
          <View className="px-8 mt-12">
            <Animated.View entering={FadeInUp.delay(800)}>
              <TouchableOpacity
                onPress={handleSave}
                activeOpacity={0.9}
                disabled={!firstName.trim() || loading}
                style={firstName.trim() ? LUMEN_SHADOW : {}}
                className={`h-[72px] rounded-[28px] flex-row items-center justify-center gap-3 ${firstName.trim() ? 'bg-white' : 'bg-white/10'}`}
              >
                {loading ? (
                  <ActivityIndicator color="#0E1220" />
                ) : (
                  <>
                    <Text className={`text-[18px] font-bold ${firstName.trim() ? 'text-[#0E1220]' : 'text-white/20'}`}>Complete Setup</Text>
                    <View className={`w-8 h-8 rounded-full items-center justify-center ${firstName.trim() ? 'bg-[#0E1220]' : 'bg-white/10'}`}>
                      <ChevronRight size={18} color={firstName.trim() ? '#fff' : 'rgba(255,255,255,0.2)'} />
                    </View>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            <Animated.View 
              entering={FadeIn.delay(1000)}
              className="mt-8 flex-row items-center justify-center gap-2"
            >
              <Sparkles size={14} color="rgba(255,255,255,0.3)" />
              <Text className="text-white/30 text-[12px] font-medium">Your data is safe and encrypted</Text>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
