import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Pressable,
  StyleSheet
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  MapPin, 
  Search, 
  Locate, 
  ArrowLeft, 
  Home, 
  Briefcase, 
  Map as MapIcon,
  ChevronRight
} from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import MapView from 'react-native-maps';
import { useLocation } from '../context/LocationContext';
import * as Location from 'expo-location';
import { useAlert } from '../context/AlertContext';
import Animated, { 
  FadeInUp, 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  interpolate,
  Extrapolation,
  runOnJS
} from 'react-native-reanimated';
import { 
  Gesture, 
  GestureDetector, 
  GestureHandlerRootView 
} from 'react-native-gesture-handler';

const LUMEN_SHADOW = { 
  shadowColor: "#0E1220", 
  shadowOpacity: 0.08, 
  shadowRadius: 16, 
  shadowOffset: { width: 0, height: 6 }, 
  elevation: 5 
};

const styles = StyleSheet.create({
  centerMarker: {
    position: 'absolute',
    top: '35%',
    left: '50%',
    marginLeft: -20,
    marginTop: -20,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  }
});

export default function LocationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setManualAddress, addSavedAddress, address: currentAddress, location: contextLocation, savedAddresses } = useLocation();
  const { showAlert } = useAlert();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const mapRef = useRef<MapView>(null);
  const [displayAddress, setDisplayAddress] = useState(currentAddress || 'Locating...');

  const [region, setRegion] = useState({
    latitude: contextLocation?.coords.latitude || 19.0760,
    longitude: contextLocation?.coords.longitude || 72.8777,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const [houseDetails, setHouseDetails] = useState('');
  const [landmark, setLandmark] = useState('');
  const [label, setLabel] = useState('Home');

  // Bottom Sheet Animation
  const SCREEN_HEIGHT = Dimensions.get('window').height;
  const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.75;
  const SHEET_MIN_HEIGHT = SCREEN_HEIGHT * 0.45;
  const translateY = useSharedValue(0);
  const context = useSharedValue({ y: 0 });

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      translateY.value = event.translationY + context.value.y;
      // Limit movement
      translateY.value = Math.max(translateY.value, -(SHEET_MAX_HEIGHT - SHEET_MIN_HEIGHT));
      translateY.value = Math.min(translateY.value, 0);
    })
    .onEnd(() => {
      if (translateY.value < -(SHEET_MAX_HEIGHT - SHEET_MIN_HEIGHT) / 2) {
        translateY.value = withSpring(-(SHEET_MAX_HEIGHT - SHEET_MIN_HEIGHT), { damping: 20 });
      } else {
        translateY.value = withSpring(0, { damping: 20 });
      }
    });

  const animatedSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const animatedHandleStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(translateY.value, [-(SHEET_MAX_HEIGHT - SHEET_MIN_HEIGHT), 0], [1, 0.5]),
    };
  });

  useEffect(() => {
    if (contextLocation) {
      setRegion({
        latitude: contextLocation.coords.latitude,
        longitude: contextLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [contextLocation]);

  const getCurrentLocation = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert({ title: 'Permission Denied', message: 'Allow location access to use this feature.', type: 'error' });
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
    } catch (error) {
      console.error(error);
    } finally {
      setGpsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const result = await Location.geocodeAsync(searchQuery);
      if (result.length > 0) {
        const newRegion = {
          latitude: result[0].latitude,
          longitude: result[0].longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 1000);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      updateAddressFromRegion();
    }, 500);
    return () => clearTimeout(timer);
  }, [region]);

  const updateAddressFromRegion = async () => {
    try {
      const reverse = await Location.reverseGeocodeAsync({
        latitude: region.latitude,
        longitude: region.longitude,
      });
      if (reverse.length > 0) {
        const addr = reverse[0];
        const formatted = [addr.name, addr.street, addr.city, addr.region].filter(Boolean).join(', ');
        setDisplayAddress(formatted);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSave = async () => {
    if (!houseDetails) {
       showAlert({ title: 'Required', message: 'Please enter house/flat details.', type: 'error' });
       return;
    }
    setLoading(true);
    try {
      const finalFullAddr = `${houseDetails}${landmark ? `, ${landmark}` : ''}, ${displayAddress}`;
      await setManualAddress(finalFullAddr, region.latitude, region.longitude);
      await addSavedAddress(finalFullAddr, label, region.latitude, region.longitude);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      showAlert({ title: 'Error', message: error.message || 'Unknown error', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const useLocationOnly = async () => {
    setLoading(true);
    try {
      await setManualAddress(displayAddress, region.latitude, region.longitude);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      showAlert({ title: 'Error', message: error.message || 'Unknown error', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const selectSavedAddress = async (addr: any) => {
    setLoading(true);
    try {
      await setManualAddress(addr.address, addr.lat, addr.lng);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      showAlert({ title: 'Error', message: error.message || 'Unknown error', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: 'white' }}
      >
        <StatusBar style="dark" />
        
        {/* Map Area - Fills entire background now */}
        <View style={StyleSheet.absoluteFill}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={region}
            onRegionChangeComplete={setRegion}
          />
          
          <View style={styles.centerMarker} pointerEvents="none">
            <View className="items-center">
              <MapPin size={40} color="#3B6BFF" fill="#3B6BFF22" />
              <View className="w-2 h-2 rounded-full bg-blue-600/20 mt-1" />
            </View>
          </View>
        </View>

        {/* Top Search Bar */}
        <Animated.View 
          entering={FadeInUp.delay(300)} 
          className="absolute left-5 right-5 flex-row items-center gap-3"
          style={{ top: insets.top + 10 }}
        >
          <TouchableOpacity 
            onPress={() => router.back()}
            className="h-12 w-12 rounded-2xl bg-white items-center justify-center border border-gray-50 shadow-sm"
          >
            <ArrowLeft size={20} color="#0E1220" />
          </TouchableOpacity>
          
          <View className="flex-1 h-12 bg-white rounded-2xl flex-row items-center px-4 gap-3 border border-gray-50 shadow-sm">
            <Search size={18} color="#6B7280" />
            <TextInput
              placeholder="Search area..."
              className="flex-1 text-[14px] font-semibold text-black"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </Animated.View>

        {/* Locate Button - Positioned relative to bottom sheet min height */}
        {!loading && (
          <TouchableOpacity 
            onPress={getCurrentLocation}
            className="absolute right-6 h-14 w-14 rounded-2xl bg-white items-center justify-center border border-gray-50 shadow-md"
            style={{ bottom: SHEET_MIN_HEIGHT + 20 }}
          >
            {gpsLoading ? (
              <ActivityIndicator size="small" color="#3B6BFF" />
            ) : (
              <Locate size={24} color="#0E1220" />
            )}
          </TouchableOpacity>
        )}

        {/* Bottom Sheet Details Area */}
        <Animated.View 
          style={[
            LUMEN_SHADOW, 
            animatedSheetStyle,
            { 
              height: SHEET_MAX_HEIGHT,
              position: 'absolute',
              bottom: -(SHEET_MAX_HEIGHT - SHEET_MIN_HEIGHT),
              left: 0,
              right: 0,
              backgroundColor: 'white',
              borderTopLeftRadius: 40,
              borderTopRightRadius: 40,
              paddingTop: 12,
              zIndex: 10
            }
          ]}
        >
          {/* Draggable Header Area */}
          <GestureDetector gesture={gesture}>
            <View className="px-8 pb-2">
              {/* Handle Bar */}
              <View className="items-center mb-4">
                 <Animated.View 
                   style={animatedHandleStyle}
                   className="w-12 h-1.5 bg-gray-200 rounded-full" 
                 />
              </View>

              <View className="flex-row items-start gap-4 bg-gray-50 p-5 rounded-[24px] mb-2">
                <View className="mt-1 h-10 w-10 rounded-2xl bg-white items-center justify-center border border-gray-100">
                  <MapPin size={18} color="#3B6BFF" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-bold text-muted uppercase tracking-[2px] mb-1">Current Location</Text>
                  <Text className="text-[14px] font-bold text-black leading-5" numberOfLines={2}>{displayAddress}</Text>
                </View>
              </View>
            </View>
          </GestureDetector>

          <ScrollView 
            showsVerticalScrollIndicator={false} 
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 32, paddingBottom: 150 }}
          >
            <TouchableOpacity 
              onPress={useLocationOnly}
              className="flex-row items-center justify-center gap-2 py-3 mb-6 bg-blue-50 rounded-2xl border border-blue-100"
            >
               <Text className="text-[13px] font-bold text-blue-600">Use this location without saving</Text>
               <ChevronRight size={14} color="#3B6BFF" />
            </TouchableOpacity>

            {savedAddresses && savedAddresses.length > 0 && (
              <View className="mb-8">
                 <Text className="text-[11px] font-bold text-muted uppercase tracking-[2px] mb-4 ml-2">Recent & Saved</Text>
                 <View className="gap-3">
                    {savedAddresses.slice(0, 3).map((addr) => (
                      <TouchableOpacity 
                        key={addr.id}
                        onPress={() => selectSavedAddress(addr)}
                        className="flex-row items-center gap-4 p-4 bg-white border border-gray-100 rounded-[24px]"
                        style={{ shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 }}
                      >
                         <View className="h-10 w-10 rounded-xl bg-gray-50 items-center justify-center">
                            {addr.label === 'Home' ? <Home size={16} color="#64748b" /> : addr.label === 'Work' ? <Briefcase size={16} color="#64748b" /> : <MapIcon size={16} color="#64748b" />}
                         </View>
                         <View className="flex-1">
                            <Text className="text-[14px] font-bold text-black">{addr.label}</Text>
                            <Text className="text-[12px] text-muted mt-0.5" numberOfLines={1}>{addr.address}</Text>
                         </View>
                      </TouchableOpacity>
                    ))}
                 </View>
              </View>
            )}

            <View className="h-px bg-gray-100 mb-8" />
            
            <View className="mb-4">
               <Text className="text-[16px] font-bold text-black mb-1 ml-2">Add Address Details</Text>
               <Text className="text-[12px] text-muted mb-4 ml-2">Save for faster checkout next time</Text>
            </View>

            <View className="mb-5">
              <View className="mb-4">
                <Text className="text-[11px] font-bold text-muted uppercase tracking-[2px] mb-2 ml-2">House / Flat No.</Text>
                <TextInput
                  placeholder="e.g. Flat 402, Building A"
                  className="h-14 bg-gray-50 rounded-[20px] px-5 text-[15px] font-bold text-black border border-gray-100"
                  value={houseDetails}
                  onChangeText={setHouseDetails}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View className="mb-4">
                <Text className="text-[11px] font-bold text-muted uppercase tracking-[2px] mb-2 ml-2">Landmark</Text>
                <TextInput
                  placeholder="Nearby famous place..."
                  className="h-14 bg-gray-50 rounded-[20px] px-5 text-[15px] font-bold text-black border border-gray-100"
                  value={landmark}
                  onChangeText={setLandmark}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View className="mb-4">
                 <Text className="text-[11px] font-bold text-muted uppercase tracking-[2px] mb-3 ml-2">Save as</Text>
                 <View className="flex-row gap-2">
                    {['Home', 'Work', 'Other'].map((l) => {
                      const isSelected = label === l;
                      return (
                        <Pressable 
                          key={l}
                          onPress={() => setLabel(l)}
                          className={`px-5 py-3 rounded-[16px] border-2 ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-100'}`}
                        >
                          <Text className={`text-[12px] font-bold ${isSelected ? 'text-white' : 'text-muted'}`}>{l}</Text>
                        </Pressable>
                      );
                    })}
                 </View>
              </View>
            </View>

            <TouchableOpacity 
              onPress={handleSave}
              disabled={loading || !houseDetails.trim()}
              style={[
                { height: 64, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
                (loading || !houseDetails.trim()) ? { backgroundColor: '#e2e8f0' } : { backgroundColor: '#3B6BFF' }
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Confirm & Save Address</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
}
