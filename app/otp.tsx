import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  CheckCircle2, 
  ChevronRight, 
  ShieldCheck 
} from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { auth } from '../lib/firebase';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import ErrorModal from '../components/ErrorModal';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

const LUMEN_SHADOW = { 
  shadowColor: "#000", 
  shadowOpacity: 0.2, 
  shadowRadius: 20, 
  shadowOffset: { width: 0, height: 10 }, 
  elevation: 10 
};

export default function OtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const phone = params.phone as string;
  const verificationId = params.verificationId as string;
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();

  const [step, setStep] = useState<'otp' | 'verified'>('otp');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(25);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    let timer: any;
    if (step === 'otp' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  useEffect(() => {
    if (step === 'verified') {
      const timer = setTimeout(() => {
        handleContinueToLocation();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleOtpChange = (text: string, index: number) => {
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText === '' && text !== '') return;

    const newOtp = [...otp];
    newOtp[index] = numericText;
    setOtp(newOtp);

    if (text !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === 5 && text !== '' && newOtp.every((val) => val !== '')) {
      handleVerify();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length === 6) {
      setIsVerifying(true);
      try {
        if (verificationId === 'mock-id') {
          setTimeout(() => setStep('verified'), 1200);
          return;
        }

        const credential = PhoneAuthProvider.credential(verificationId, otpCode);
        await signInWithCredential(auth, credential);
        setStep('verified');
      } catch (err: any) {
        console.log('OTP Verification Failed:', err.message);
        setShowErrorModal(true);
      } finally {
        setIsVerifying(false);
      }
    }
  };

  const handleContinueToLocation = () => {
    const hasUid = !!user?.uid;
    const hasName = !!profile?.firstName;

    if (!hasUid) {
      router.replace('/');
    } else if (!hasName) {
      router.replace('/register');
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View className="flex-1 bg-fg" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {step === 'otp' ? (
          <Animated.View 
            entering={FadeInDown.duration(600)}
            className="flex-1 px-8"
          >
            <TouchableOpacity 
              onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
              className="h-12 w-12 rounded-2xl bg-white/10 items-center justify-center mt-4 mb-10"
            >
              <ArrowLeft size={20} color="#fff" />
            </TouchableOpacity>

            <Text className="text-white text-[32px] font-bold tracking-tight mb-2">Verify Phone</Text>
            <View className="flex-row items-center mb-10">
              <Text className="text-white/50 text-[15px]">Sent to +91 {phone}  </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text className="text-white font-bold underline">Edit</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row justify-between mb-10">
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  className={`w-[14%] h-16 rounded-2xl text-center text-white text-[24px] font-bold border-2 ${digit ? 'border-white bg-white/10' : 'border-white/10 bg-white/5'}`}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text, index)}
                  onKeyPress={(e) => handleOtpKeyPress(e, index)}
                  placeholderTextColor="rgba(255,255,255,0.1)"
                />
              ))}
            </View>

            <View className="items-center mb-10">
              <Text className="text-white/40 text-[14px]">
                Resend code in <Text className="text-white font-bold">00:{countdown.toString().padStart(2, '0')}</Text>
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleVerify}
              disabled={!otp.every(val => val !== '') || isVerifying}
              className={`h-16 rounded-3xl flex-row items-center justify-center gap-3 ${otp.every(val => val !== '') ? 'bg-white' : 'bg-white/20'}`}
              style={otp.every(val => val !== '') ? LUMEN_SHADOW : {}}
            >
              {isVerifying ? (
                <ActivityIndicator color="#0E1220" />
              ) : (
                <>
                  <Text className={`text-[16px] font-bold ${otp.every(val => val !== '') ? 'text-fg' : 'text-white/40'}`}>Verify & Continue</Text>
                  <ChevronRight size={20} color={otp.every(val => val !== '') ? '#0E1220' : 'rgba(255,255,255,0.4)'} />
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View 
            entering={FadeIn.duration(800)}
            className="flex-1 items-center justify-center px-8"
          >
            <Animated.View entering={ZoomIn.duration(800).springify()} className="items-center">
              <View className="h-24 w-24 rounded-full bg-success/20 items-center justify-center mb-8">
                <ShieldCheck size={48} color="#22C58A" />
              </View>
              <Text className="text-white text-[32px] font-bold tracking-tight mb-3">Verified!</Text>
              <Text className="text-white/60 text-[16px] text-center">Your account is secured. Redirecting you...</Text>
            </Animated.View>
            
            <View className="absolute bottom-10 left-8 right-8">
              <TouchableOpacity
                onPress={handleContinueToLocation}
                className="h-16 bg-white rounded-3xl flex-row items-center justify-center gap-2"
                style={LUMEN_SHADOW}
              >
                <Text className="text-fg text-[16px] font-bold">Get Started</Text>
                <ChevronRight size={18} color="#0E1220" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
      <ErrorModal 
        visible={showErrorModal} 
        onClose={() => {
          setShowErrorModal(false);
          setOtp(['', '', '', '', '', '']);
          inputRefs.current[0]?.focus();
        }} 
      />
    </View>
  );
}

