import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { 
  ArrowLeft, 
  Search as SearchIcon, 
  X, 
  Clock, 
  ChevronRight, 
  Star,
  Sparkles,
  TrendingUp
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, FadeInRight } from 'react-native-reanimated';
import { collection, query, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SERVICES as LOCAL_SERVICES } from '../lib/data';

const LUMEN_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 10 },
  elevation: 5,
};

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState(['Deep Cleaning', 'AC Repair', 'Kitchen Clean']);
  const [popularServices, setPopularServices] = useState<any[]>([]);

  useEffect(() => {
    // Fetch popular services for initial view
    const fetchPopular = async () => {
      try {
        const q = query(collection(db, 'services'), limit(5));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPopularServices(data.length > 0 ? data : LOCAL_SERVICES.slice(0, 5));
      } catch (e) {
        setPopularServices(LOCAL_SERVICES.slice(0, 5));
      }
    };
    fetchPopular();
  }, []);

  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      // Simulating search - filter local/fetched services
      const filtered = LOCAL_SERVICES.filter(s => 
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      // Delay for "Premium" feel
      setTimeout(() => {
        setResults(filtered);
        setLoading(false);
      }, 300);
    };
    performSearch();
  }, [searchQuery]);

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />
      
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Search Header */}
        <View className="px-6 pt-4 pb-6 border-b border-gray-50">
           <View className="flex-row items-center gap-4">
              <Pressable 
                onPress={() => router.back()}
                className="h-12 w-12 rounded-2xl bg-white items-center justify-center border border-gray-100"
                style={LUMEN_SHADOW}
              >
                <ArrowLeft size={20} color="#000" />
              </Pressable>
              
              <View className="flex-1 h-14 bg-gray-50 rounded-[20px] flex-row items-center px-5 gap-3 border border-gray-100">
                 <SearchIcon size={20} color="#64748b" />
                 <TextInput 
                   placeholder="Search for services..."
                   className="flex-1 text-[16px] font-bold text-black"
                   value={searchQuery}
                   onChangeText={setSearchQuery}
                   autoFocus
                   placeholderTextColor="#94a3b8"
                 />
                 {searchQuery.length > 0 && (
                   <Pressable onPress={() => setSearchQuery('')}>
                      <X size={18} color="#000" />
                   </Pressable>
                 )}
              </View>
           </View>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
             <ActivityIndicator color="#3B6BFF" className="mt-20" />
          ) : searchQuery.length > 0 ? (
             /* Results List */
             <View className="px-6 pt-8">
                <Text className="text-[11px] font-bold text-muted uppercase tracking-[3px] mb-8 ml-2">Search Results</Text>
                {results.length > 0 ? (
                  results.map((item, idx) => (
                    <SearchResultCard key={item.id || idx} item={item} />
                  ))
                ) : (
                  <View className="items-center mt-20 opacity-30">
                     <SearchIcon size={40} color="#64748b" />
                     <Text className="text-[14px] font-bold text-muted mt-4">No services found</Text>
                  </View>
                )}
             </View>
          ) : (
             /* Default View: Recent & Popular */
             <View className="pt-8">
                {/* Recent Searches */}
                <View className="px-6 mb-12">
                   <View className="flex-row items-center justify-between mb-6 px-2">
                      <Text className="text-[11px] font-bold text-muted uppercase tracking-[3px]">Recent Searches</Text>
                      <Pressable onPress={() => setRecentSearches([])}>
                         <Text className="text-[11px] font-bold text-blue-600">CLEAR</Text>
                      </Pressable>
                   </View>
                   <View className="flex-row flex-wrap gap-3">
                      {recentSearches.map((s, i) => (
                        <Pressable 
                          key={i} 
                          onPress={() => setSearchQuery(s)}
                          className="bg-gray-50 px-5 py-3 rounded-full border border-gray-100 flex-row items-center gap-2"
                        >
                           <Clock size={14} color="#64748b" />
                           <Text className="text-[13px] font-bold text-black">{s}</Text>
                        </Pressable>
                      ))}
                   </View>
                </View>

                {/* Popular Services Section */}
                <View className="px-6">
                   <View className="flex-row items-center gap-2 mb-8 px-2">
                      <TrendingUp size={16} color="#3B6BFF" />
                      <Text className="text-[11px] font-bold text-muted uppercase tracking-[3px]">Popular Right Now</Text>
                   </View>
                   
                   {popularServices.map((s, i) => (
                     <Animated.View key={s.id || i} entering={FadeInDown.delay(i * 100)}>
                       <Pressable 
                         onPress={() => router.push({ pathname: '/book/[id]', params: { id: s.id || s.slug } })}
                         className="flex-row items-center mb-4 bg-white p-4 rounded-[32px] border border-gray-50"
                         style={LUMEN_SHADOW}
                       >
                          <View className="h-16 w-16 rounded-2xl bg-blue-50 overflow-hidden">
                             <Image source={s.img || { uri: s.imageUrl }} className="w-full h-full" />
                          </View>
                          <View className="flex-1 ml-4 mr-2">
                             <Text className="text-[15px] font-bold text-black">{s.name || s.title}</Text>
                             <View className="flex-row items-center gap-1.5 mt-1">
                                <Star size={10} color="#D6A75A" fill="#D6A75A" />
                                <Text className="text-[11px] font-bold text-black">{s.rating || '4.8'}</Text>
                                <Text className="text-[10px] text-gray-300 ml-1">•</Text>
                                <Text className="text-[11px] text-muted font-bold ml-1 uppercase">{s.category || 'Cleaning'}</Text>
                             </View>
                          </View>
                          <ChevronRight size={18} color="#cbd5e1" />
                       </Pressable>
                     </Animated.View>
                   ))}
                </View>
             </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SearchResultCard({ item }: any) {
  const router = useRouter();
  return (
    <Animated.View entering={FadeInUp}>
      <Pressable 
        onPress={() => router.push({ pathname: '/book/[id]', params: { id: item.id || item.slug } })}
        className="flex-row items-center mb-6 bg-white p-5 rounded-[40px] border border-gray-50 shadow-sm"
        style={LUMEN_SHADOW}
      >
        <View className="h-20 w-20 rounded-[28px] bg-gray-50 overflow-hidden">
           <Image source={item.img || { uri: item.imageUrl }} className="w-full h-full" />
        </View>
        <View className="flex-1 ml-5">
           <Text className="text-[17px] font-bold text-black tracking-tight">{item.name || item.title}</Text>
           <Text className="text-[12px] text-muted font-medium mt-1" numberOfLines={1}>{item.tagline || 'Expert home service'}</Text>
           <View className="flex-row items-center justify-between mt-3">
              <View className="flex-row items-center gap-1.5">
                 <Star size={12} color="#D6A75A" fill="#D6A75A" />
                 <Text className="text-[13px] font-bold text-black">{item.rating || '4.9'}</Text>
              </View>
              <Text className="text-[16px] font-bold text-blue-600">₹{item.price}</Text>
           </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
