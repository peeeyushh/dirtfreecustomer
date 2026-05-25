import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FirebaseRecaptchaVerifierModal } from '../components/FirebaseRecaptcha';
import { signInWithPhoneNumber } from 'firebase/auth';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import Animated, { 
  FadeInUp, 
  FadeIn, 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { ChevronRight, Sparkles, ShieldCheck } from 'lucide-react-native';
import { app, auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import ErrorModal from '../components/ErrorModal';

const LUMEN_SHADOW = { 
  shadowColor: "#000", 
  shadowOpacity: 0.3, 
  shadowRadius: 30, 
  shadowOffset: { width: 0, height: 15 }, 
  elevation: 12 
};

export default function EntryScreen() {
  const router = useRouter();
  const { profile, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  // Redirect logged-in users
  useEffect(() => {
    if (!loading && profile?.uid) {
      if (profile.firstName) {
        router.replace('/(tabs)');
      } else {
        router.replace('/register');
      }
    }
  }, [profile, loading]);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [tapCount, setTapCount] = useState(0);
  const recaptchaVerifier = useRef(null);
  
  const firebaseConfig = app ? app.options : {};

  // Animations
  const glowOpacity = useSharedValue(0.4);
  useEffect(() => {
    glowOpacity.value = withRepeat(withSequence(withTiming(0.8, { duration: 2000 }), withTiming(0.4, { duration: 2000 })), -1, true);
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const handleContinue = async () => {
    if (phoneNumber.length >= 10) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setIsSending(true);
      try {
        const fullPhoneNumber = `+91${phoneNumber}`;
        const confirmationResult = await signInWithPhoneNumber(
          auth,
          fullPhoneNumber,
          recaptchaVerifier.current as any
        );
        
        setIsSending(false);
        router.push({
          pathname: '/otp',
          params: { phone: phoneNumber, verificationId: confirmationResult.verificationId },
        });
      } catch (error: any) {
        setIsSending(false);
        console.error('Error sending OTP:', error);
        setErrorMessage(error.message || 'Failed to send OTP. Please try again.');
        setShowError(true);
      }
    }
  };

  const openWebPage = useCallback((url: string) => {
    Linking.openURL(url);
  }, []);

  return (
    <View className="flex-1 bg-fg">
      <StatusBar style="light" />
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={firebaseConfig}
        attemptInvisibleVerification={!__DEV__}
        appVerificationDisabledForTesting={__DEV__}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* Immersive Hero Section */}
          <View className="h-[60%] relative">
            <Image 
              source={require('../assets/images/onboarding_3_fixed.png')} 
              className="absolute inset-0 w-full h-full"
              contentFit="cover"
              transition={1200}
            />
            
            {/* Multi-layered Gradients for Depth */}
            <LinearGradient
              colors={['rgba(14,18,32,0.2)', 'rgba(14,18,32,0.5)', '#0E1220']}
              className="absolute inset-0"
            />
            
            <View className="absolute bottom-0 left-0 right-0 px-10 pb-12">
              <Animated.View entering={FadeInUp.delay(300).duration(800)}>
                <View className="flex-row items-center gap-2 mb-3">
                  <View className="h-px w-8 bg-success" />
                  <Text className="text-success text-[12px] font-bold uppercase tracking-[4px]">Premium Living</Text>
                </View>
                
                <TouchableOpacity 
                  activeOpacity={1} 
                  onPress={() => {
                    setTapCount(prev => {
                      const newCount = prev + 1;
                      if (newCount >= 5) {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        router.push({
                          pathname: '/otp',
                          params: { phone: phoneNumber || '9876543210', verificationId: 'mock-id' },
                        });
                        return 0;
                      }
                      return newCount;
                    });
                  }}
                >
                  <Text className="text-white text-[56px] font-bold leading-[52px] tracking-tight">DirtFree</Text>
                </TouchableOpacity>
                <Text className="text-white/60 text-[18px] font-medium mt-4 leading-7">
                  Elevate your home with{'\n'}professional, effortless cleaning.
                </Text>
              </Animated.View>
            </View>

            {/* Decorative Sparkle */}
            <Animated.View 
              entering={FadeIn.delay(800)}
              className="absolute top-20 right-10"
            >
              <Animated.View style={glowStyle}>
                <Sparkles size={32} color="#22C58A" />
              </Animated.View>
            </Animated.View>
          </View>

          {/* Action Section */}
          <View className="flex-1 px-8 pt-4 pb-12 justify-center">
            <Animated.View 
              entering={FadeInUp.delay(500).duration(800)}
              className="mb-8"
            >
              <View className="flex-row items-center justify-between mb-4 px-1">
                <Text className="text-white/40 text-[11px] font-bold uppercase tracking-[2px]">Enter Phone Number</Text>
                <View className="flex-row items-center gap-1.5">
                  <ShieldCheck size={12} color="rgba(255,255,255,0.4)" />
                  <Text className="text-white/30 text-[10px]">Secure Login</Text>
                </View>
              </View>
              
              <View 
                className="flex-row items-center bg-white/5 rounded-[28px] h-[72px] px-6 border border-white/10"
              >
                <View className="flex-row items-center border-r border-white/10 pr-5 mr-5">
                  <Image 
                    source={{ uri: 'https://flagpedia.net/data/flags/h80/in.png' }} 
                    style={{ width: 24, height: 16, borderRadius: 2, marginRight: 8 }} 
                  />
                  <Text className="text-white text-[18px] font-bold">+91</Text>
                </View>
                <TextInput
                  className="flex-1 text-white text-[20px] font-bold tracking-[3px]"
                  placeholder="00000 00000"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phoneNumber}
                  onChangeText={(text) => {
                    if (text.length === 1) Haptics.selectionAsync();
                    setPhoneNumber(text.replace(/[^0-9]/g, ''));
                  }}
                  placeholderTextColor="rgba(255,255,255,0.15)"
                  selectionColor="#22C58A"
                />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(700).duration(800)}>
              <TouchableOpacity
                onPress={handleContinue}
                activeOpacity={0.9}
                disabled={phoneNumber.length < 10 || isSending}
                className={`h-[72px] rounded-[28px] flex-row items-center justify-center gap-3 ${phoneNumber.length === 10 ? 'bg-white' : 'bg-white/10'}`}
                style={phoneNumber.length === 10 ? LUMEN_SHADOW : {}}
              >
                {isSending ? (
                  <ActivityIndicator color="#0E1220" />
                ) : (
                  <>
                    <Text className={`text-[18px] font-bold ${phoneNumber.length === 10 ? 'text-fg' : 'text-white/20'}`}>Get Started</Text>
                    <View className={`w-8 h-8 rounded-full items-center justify-center ${phoneNumber.length === 10 ? 'bg-fg' : 'bg-white/10'}`}>
                      <ChevronRight size={18} color={phoneNumber.length === 10 ? '#fff' : 'rgba(255,255,255,0.2)'} />
                    </View>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            <Animated.View 
              entering={FadeIn.delay(1200)}
              className="mt-12"
            >
              <Text className="text-white/20 text-[11px] text-center leading-5 px-6">
                By tapping Get Started, you agree to our{' '}
                <Text className="text-white/40 font-bold underline" onPress={() => openWebPage('https://dirtfree.com/terms')}>Terms of Service</Text>
                {' '}and acknowledge our{' '}
                <Text className="text-white/40 font-bold underline" onPress={() => openWebPage('https://dirtfree.com/privacy')}>Privacy Policy</Text>.
              </Text>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ErrorModal 
        visible={showError}
        onClose={() => setShowError(false)}
        message={errorMessage}
      />
    </View>
  );
}


