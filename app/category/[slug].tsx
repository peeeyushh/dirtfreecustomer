import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Star, 
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SERVICES } from '../../lib/data';
import { useLocation } from '../../context/LocationContext';

const LUMEN_SHADOW = { 
  shadowColor: "#0E1220", 
  shadowOpacity: 0.08, 
  shadowRadius: 20, 
  shadowOffset: { width: 0, height: 8 }, 
  elevation: 4 
};

export default function CategoryScreen() {
  const { slug, name } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentCityData } = useLocation();
  
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        let actualSlug = slug as string;

        // Try direct fetch first
        const directSnap = await getDocs(collection(db, 'services', actualSlug, 'services'));
        
        if (directSnap.empty) {
          // If empty, maybe case-mismatch. Fetch all categories to find match.
          const catSnap = await getDocs(collection(db, 'services'));
          const matchingCat = catSnap.docs.find(d => d.id.toLowerCase() === actualSlug.toLowerCase());
          if (matchingCat) {
            actualSlug = matchingCat.id;
          }
        }

        const q = query(collection(db, 'services', actualSlug, 'services'));
        const querySnapshot = await getDocs(q);
        const fetched = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (fetched.length > 0) {
          // Apply pricing overrides
          const pricing = currentCityData?.settings?.pricing || {};
          const updatedSvcs = fetched.map(s => ({
            ...s,
            price: pricing[s.id] || s.price
          }));
          setServices(updatedSvcs);
        } else {
          // Fallback to local data if firestore is empty
          const fallback = SERVICES.filter(s => s.slug?.toLowerCase() === actualSlug.toLowerCase() || actualSlug === 'Cleaning');
          // Apply overrides to fallback too if applicable
          const pricing = currentCityData?.settings?.pricing || {};
          const updatedFallback = fallback.map(s => ({
            ...s,
            price: pricing[s.id] || s.price
          }));
          setServices(updatedFallback);
        }
      } catch (error) {
        console.error('Error fetching category services:', error);
        setServices(SERVICES.filter(s => s.slug?.toLowerCase() === (slug as string).toLowerCase()));
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchServices();
  }, [slug]);

  const categoryName = name || (slug as string).charAt(0).toUpperCase() + (slug as string).slice(1);

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View className="bg-white px-6 pb-6" style={{ paddingTop: insets.top + 10 }}>
        <View className="flex-row items-center justify-between mb-8">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="h-10 w-10 rounded-2xl bg-white items-center justify-center border border-gray-100"
            style={LUMEN_SHADOW}
          >
            <ArrowLeft size={20} color="#0E1220" />
          </TouchableOpacity>
        </View>
        
        <Text className="text-[10px] font-bold text-muted uppercase tracking-[3px] mb-2">Collection</Text>
        <Text className="text-[32px] font-bold text-fg tracking-tight">{categoryName}</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0E1220" />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {services.length === 0 ? (
            <View className="items-center justify-center py-20">
              <Text className="text-muted text-[16px]">No services found in this category.</Text>
            </View>
          ) : (
            services.map((svc, idx) => (
              <Animated.View 
                key={svc.id || svc.slug} 
                entering={FadeInDown.delay(idx * 100).duration(500)}
              >
                <TouchableOpacity 
                  onPress={() => router.push({
                    pathname: '/book/[id]',
                    params: { id: svc.slug || svc.id || svc.name }
                  })}
                  className="bg-white rounded-[32px] p-4 mb-6 flex-row gap-5 border border-gray-50"
                  style={LUMEN_SHADOW}
                >
                  <Image 
                    source={svc.img || { uri: svc.imageUrl }} 
                    className="w-24 h-24 rounded-2xl bg-gray-50"
                    contentFit="cover"
                  />
                  <View className="flex-1 justify-center">
                    <View className="flex-row items-center gap-1.5 mb-1">
                       <Star size={12} color="#D6A75A" fill="#D6A75A" />
                       <Text className="text-[12px] font-bold text-fg">{svc.rating || '4.8'}</Text>
                    </View>
                    <Text className="text-[17px] font-bold text-fg mb-1">{svc.name || svc.title}</Text>
                    <Text className="text-[12px] text-muted mb-3" numberOfLines={1}>
                      {svc.tagline || "Professional quality service"}
                    </Text>
                    <View className="flex-row items-center justify-between">
                       <Text className="text-[18px] font-bold text-fg">₹{svc.price}</Text>
                       <View className="bg-gray-100 rounded-xl px-3 py-1.5 flex-row items-center gap-1">
                          <Text className="text-[10px] font-bold text-fg">DETAILS</Text>
                          <ChevronRight size={12} color="#0E1220" />
                       </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))
          )}

          {/* Bottom Trust Section */}
          <View className="mt-10 p-8 bg-blue-50/50 rounded-[40px] items-center border border-blue-100">
             <ShieldCheck size={40} color="#3B6BFF" className="mb-4" />
             <Text className="text-[18px] font-bold text-fg mb-2">DirtFree Protection</Text>
             <Text className="text-[13px] text-muted text-center leading-5">
               All services are covered by our quality guarantee. If you're not satisfied, we'll re-clean for free.
             </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
