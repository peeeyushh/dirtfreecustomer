import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { 
  ArrowLeft, 
  MapPin, 
  Home, 
  Briefcase, 
  Map as MapIcon, 
  Plus, 
  Trash2,
  ChevronRight,
  LocateFixed
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocation } from '../context/LocationContext';
import { useAlert } from '../context/AlertContext';

const LUMEN_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 10 },
  elevation: 5,
};

export default function AddressesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { savedAddresses, deleteSavedAddress, address: currentAddress, setManualAddress } = useLocation();
  const { showAlert } = useAlert();

  const handleSelectAddress = (addr: string) => {
    setManualAddress(addr, true);
    router.back();
  };

  const confirmDelete = (id: string) => {
    showAlert({
      title: 'Delete Address?',
      message: 'Are you sure you want to remove this address?',
      type: 'confirm',
      onConfirm: () => deleteSavedAddress(id),
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center gap-4 px-8 py-4">
          <Pressable 
            onPress={() => router.back()}
            className="h-12 w-12 rounded-2xl bg-white items-center justify-center border border-gray-100"
            style={LUMEN_SHADOW}
          >
            <ArrowLeft size={20} color="#000" />
          </Pressable>
          <Text className="text-[24px] font-bold text-black tracking-tight">Saved Addresses</Text>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
        >
          {/* Current Location Card */}
          <Pressable 
            onPress={() => router.push('/location')}
            className="mt-6 mb-10 overflow-hidden rounded-[40px] shadow-lg"
          >
            <LinearGradient colors={['#3B6BFF', '#6366f1']} className="p-8">
               <View className="bg-white/10 rounded-[28px] p-5 flex-row items-center border border-white/20">
                  <View className="flex-1">
                    <Text className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Current Location</Text>
                    <Text className="text-white text-[15px] font-bold mt-1" numberOfLines={1}>
                       {currentAddress || 'Locating...'}
                    </Text>
                  </View>
                  <View className="h-10 w-10 rounded-full bg-white items-center justify-center ml-4">
                     <LocateFixed size={20} color="#3B6BFF" />
                  </View>
               </View>
            </LinearGradient>
          </Pressable>

          <Text className="text-[11px] font-bold text-muted uppercase tracking-[3px] mb-6 ml-2">Your Saved Places</Text>
          
          {savedAddresses.length > 0 ? (
            savedAddresses.map((item, idx) => (
              <AddressCard 
                key={item.id}
                icon={item.label === 'Home' ? <Home size={18} color="#3B6BFF" /> : item.label === 'Work' ? <Briefcase size={18} color="#3B6BFF" /> : <MapIcon size={18} color="#3B6BFF" />} 
                title={item.label} 
                address={item.address} 
                onSelect={() => handleSelectAddress(item.address)}
                onDelete={() => confirmDelete(item.id)}
                delay={idx * 100}
              />
            ))
          ) : (
            <View className="bg-gray-50 rounded-[32px] p-10 items-center border border-gray-100">
               <MapPin size={40} color="#cbd5e1" />
               <Text className="text-[14px] font-bold text-muted mt-4">No saved addresses yet</Text>
            </View>
          )}

          {/* Add New Address Button */}
          <Pressable 
            onPress={() => router.push('/location')}
            className="mt-8 h-16 rounded-[24px] border-2 border-dashed border-gray-200 items-center justify-center flex-row gap-3"
          >
            <Plus size={20} color="#64748b" />
            <Text className="text-[14px] font-bold text-muted">Add New Address</Text>
          </Pressable>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function AddressCard({ icon, title, address, onSelect, onDelete, delay }: any) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(600)}>
      <Pressable 
        onPress={onSelect}
        className="flex-row items-center bg-white rounded-[32px] p-5 mb-4 border border-gray-50"
        style={LUMEN_SHADOW}
      >
        <View className="h-12 w-12 rounded-2xl bg-blue-50 items-center justify-center">
          {icon}
        </View>
        <View className="flex-1 ml-4 mr-2">
          <Text className="text-[16px] font-bold text-black">{title}</Text>
          <Text className="text-[12px] text-muted font-medium mt-1" numberOfLines={1}>{address}</Text>
        </View>
        <Pressable 
          onPress={onDelete}
          className="h-10 w-10 rounded-full bg-red-50 items-center justify-center"
        >
          <Trash2 size={16} color="#ef4444" />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

function SafeAreaView({ children, edges, className }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View 
      className={className} 
      style={{ 
        paddingTop: edges?.includes('top') ? insets.top : 0,
        paddingBottom: edges?.includes('bottom') ? insets.bottom : 0 
      }}
    >
      {children}
    </View>
  );
}
