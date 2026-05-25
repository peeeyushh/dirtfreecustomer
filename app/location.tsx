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
import { WebView } from 'react-native-webview';
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

// Haversine formula — distance between two GPS points in km
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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

const getMapHtml = (lat: number, lng: number) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map {
      height: 100%;
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
    }
    .leaflet-control-zoom {
      display: none !important;
    }
    .leaflet-control-attribution {
      display: none !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([${lat}, ${lng}], 15);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);

    map.on('moveend', function() {
      var center = map.getCenter();
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'onRegionChange',
        latitude: center.lat,
        longitude: center.lng
      }));
    });

    map.on('click', function(e) {
      map.panTo(e.latlng);
    });

    function handleMessage(event) {
      try {
        var data = event.data;
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }
        if (data.type === 'animateToRegion') {
          map.setView([data.latitude, data.longitude], 15, {
            animate: true,
            duration: 1.0
          });
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'debug',
            message: 'Successfully animated to ' + data.latitude + ', ' + data.longitude
          }));
        }
      } catch(e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'debug',
          message: 'Error handling message in webview: ' + e.message
        }));
      }
    }

    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage);
  </script>
</body>
</html>
`;

export default function LocationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setManualAddress, addSavedAddress, address: currentAddress, location: contextLocation, savedAddresses } = useLocation();
  const { showAlert } = useAlert();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const webviewRef = useRef<WebView>(null);
  const [displayAddress, setDisplayAddress] = useState(currentAddress || 'Locating...');
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Fetch search suggestions as user types
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'DirtFreeApp/1.0.0'
            }
          }
        );
        const data = await response.json();
        if (data) {
          setSuggestions(data);
        }
      } catch (error) {
        console.log('Error fetching suggestions:', error);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const selectSuggestion = (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    const newRegion = {
      latitude: lat,
      longitude: lon,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    
    setSearchQuery('');
    setDisplayAddress(item.display_name);
    setRegion(newRegion);
    
    lastGeocodedCoords.current = {
      latitude: lat,
      longitude: lon
    };
    
    animateToRegion(newRegion);
    setSuggestions([]);
  };

  const initialLat = contextLocation?.coords.latitude || 19.0760;
  const initialLng = contextLocation?.coords.longitude || 72.8777;

  const webviewSource = React.useMemo(() => {
    return {
      html: getMapHtml(initialLat, initialLng)
    };
  }, []);

  const animateToRegion = (target: { latitude: number; longitude: number }) => {
    webviewRef.current?.postMessage(JSON.stringify({
      type: 'animateToRegion',
      latitude: target.latitude,
      longitude: target.longitude
    }));
  };

  const handleMapMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'debug') {
        console.log('WebView Debug:', data.message);
        return;
      }
      if (data.type === 'onRegionChange') {
        setRegion({
          latitude: data.latitude,
          longitude: data.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        });
      }
    } catch (e) {
      console.warn(e);
    }
  };
  const lastGeocodedCoords = useRef<{ latitude: number; longitude: number } | null>(null);
  const hasLocationPermission = useRef<boolean | null>(null);

  // Cache/check permissions once on mount to avoid native bridge overhead
  useEffect(() => {
    const checkInitialPermission = async () => {
      try {
        const { granted } = await Location.getForegroundPermissionsAsync();
        hasLocationPermission.current = granted;
      } catch (err) {
        console.log('Permission check failed:', err);
      }
    };
    checkInitialPermission();
  }, []);

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
      const newRegion = {
        latitude: contextLocation.coords.latitude,
        longitude: contextLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(newRegion);
      animateToRegion(newRegion);
    }
  }, [contextLocation]);
  const getCurrentLocation = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        hasLocationPermission.current = false;
        showAlert({ title: 'Permission Denied', message: 'Allow location access to use this feature.', type: 'error' });
        return;
      }

      // Update permission cache
      hasLocationPermission.current = true;

      // Try to get last known position first (instant and reliable)
      let location = await Location.getLastKnownPositionAsync({});
      
      // Fallback to balanced current position if last known is null
      if (!location) {
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      }

      if (location) {
        const newRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setRegion(newRegion);
        animateToRegion(newRegion);
      } else {
        throw new Error('Location returned null');
      }
    } catch (error) {
      console.log('Error getting current location:', error);
      showAlert({ title: 'Location Error', message: 'Could not fetch current location. Please search manually.', type: 'error' });
    } finally {
      setGpsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      let result = [];
      try {
        result = await Location.geocodeAsync(searchQuery);
      } catch (e) {
        console.log('Native geocode failed:', e);
      }

      if (!result || result.length === 0) {
        console.log('Native geocode returned no results, falling back to OSM Nominatim');
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`,
            {
              headers: {
                'User-Agent': 'DirtFreeApp/1.0.0'
              }
            }
          );
          const data = await response.json();
          if (data && data.length > 0) {
            result = [{
              latitude: parseFloat(data[0].lat),
              longitude: parseFloat(data[0].lon)
            }];
          }
        } catch (fetchError) {
          console.log('OSM Nominatim geocode fallback failed:', fetchError);
        }
      }

      if (result && result.length > 0) {
        const newRegion = {
          latitude: result[0].latitude,
          longitude: result[0].longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setRegion(newRegion);
        animateToRegion(newRegion);
      } else {
        showAlert({ title: 'Search Error', message: 'Could not find the location. Try a different query.', type: 'error' });
      }
    } catch (error) {
      console.log('Geocode error:', error);
      showAlert({ title: 'Search Error', message: 'Could not find the location. Try a different query.', type: 'error' });
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
    // Avoid running if coordinates are zero or default
    if (region.latitude === 0 || region.longitude === 0) return;

    // Check cached permission status to avoid querying the native bridge repeatedly
    if (hasLocationPermission.current === false) {
      setDisplayAddress('Vijay Nagar, Indore, Madhya Pradesh');
      return;
    }

    // Optimization: Calculate distance from the last geocoded position
    if (lastGeocodedCoords.current) {
      const distance = getDistanceKm(
        region.latitude,
        region.longitude,
        lastGeocodedCoords.current.latitude,
        lastGeocodedCoords.current.longitude
      );

      // If the map pin moved less than 30 meters, do NOT call the geocoding API.
      // This saves API usage costs and optimizes rendering performance.
      if (distance < 0.03) {
        return;
      }
    }

    try {
      let reverse = [];
      try {
        reverse = await Location.reverseGeocodeAsync({
          latitude: region.latitude,
          longitude: region.longitude,
        });
      } catch (e) {
        console.log('Native reverse geocode failed:', e);
      }

      if (!reverse || reverse.length === 0) {
        console.log('Native reverse geocode returned no results, falling back to OSM Nominatim');
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${region.latitude}&lon=${region.longitude}&accept-language=en`,
            {
              headers: {
                'User-Agent': 'DirtFreeApp/1.0.0'
              }
            }
          );
          const data = await response.json();
          if (data && data.display_name) {
            setDisplayAddress(data.display_name);
            lastGeocodedCoords.current = {
              latitude: region.latitude,
              longitude: region.longitude
            };
            return;
          }
        } catch (fetchError) {
          console.log('OSM Nominatim reverse geocode fallback failed:', fetchError);
        }
      }
      
      if (reverse && reverse.length > 0) {
        const addr = reverse[0];
        const formatted = [addr.name, addr.street, addr.city, addr.region].filter(Boolean).join(', ');
        setDisplayAddress(formatted);
        
        // Cache the current coordinates as the last geocoded position
        lastGeocodedCoords.current = {
          latitude: region.latitude,
          longitude: region.longitude
        };
      }
    } catch (error) {
      console.log('Reverse geocode failed:', error);
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
          <WebView
            ref={webviewRef}
            style={StyleSheet.absoluteFill}
            source={webviewSource}
            onMessage={handleMapMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
          
          <View style={styles.centerMarker} pointerEvents="none">
            <View className="items-center">
              <MapPin size={40} color="#3B6BFF" fill="#3B6BFF22" />
              <View className="w-2 h-2 rounded-full bg-blue-600/20 mt-1" />
            </View>
          </View>
        </View>

        {/* Top Search Bar & Suggestions Container */}
        <Animated.View 
          entering={FadeInUp.delay(300)} 
          className="absolute left-5 right-5 z-20"
          style={{ top: insets.top + 10, zIndex: 20 }}
        >
          <View className="flex-row items-center gap-3">
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
          </View>

          {/* Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <View className="bg-white rounded-2xl mt-2 p-2 shadow-lg border border-gray-100 max-h-60" style={{ zIndex: 30 }}>
              <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                {suggestions.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => selectSuggestion(item)}
                    className="p-3 border-b border-gray-50 flex-row items-center gap-3"
                  >
                    <MapPin size={16} color="#6B7280" />
                    <Text className="flex-1 text-[13px] text-gray-700 font-medium" numberOfLines={2}>
                      {item.display_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
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
