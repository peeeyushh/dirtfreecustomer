import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, Image, Pressable, FlatList, ActivityIndicator, Dimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Bell, MapPin, Search, Star, ChevronRight, ShieldCheck, Sparkles, Plus, ArrowUpRight, Heart } from "lucide-react-native";
import { Link, useRouter } from "expo-router";
import { CATEGORIES as LOCAL_CATEGORIES, SERVICES as LOCAL_SERVICES, IMG } from "../../lib/data";
import { StatusBar } from "expo-status-bar";
import { useLocation } from "../../context/LocationContext";
import { collection, getDocs, limit, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";
import Animated, { FadeIn, FadeInDown, FadeInRight, useAnimatedScrollHandler, useSharedValue, useAnimatedStyle, interpolate } from "react-native-reanimated";

const { width } = Dimensions.get('window');

const SOFT_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 10 },
  elevation: 5,
};

export default function HomeScreen() {
  const router = useRouter();
  const { address, currentCityData } = useLocation();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<any[]>(LOCAL_CATEGORIES);
  const [services, setServices] = useState<any[]>(LOCAL_SERVICES);
  const [banners, setBanners] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([
    { id: '1', name: 'Rahul Sharma', rating: '4.9', exp: '8 yrs', image: 'https://i.pravatar.cc/150?u=rahul' },
    { id: '2', name: 'Priya Singh', rating: '4.8', exp: '5 yrs', image: 'https://i.pravatar.cc/150?u=priya' },
    { id: '3', name: 'Amit Verma', rating: '4.9', exp: '10 yrs', image: 'https://i.pravatar.cc/150?u=amit' },
  ]);
  const [loading, setLoading] = useState(true);
  const [activeBanner, setActiveBanner] = useState(0);

  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const headerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, 50], [1, 0.9]);
    return { opacity };
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Categories
        const catSnap = await getDocs(collection(db, "categories"));
        const cats = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (cats.length > 0) setCategories(cats);

        // Fetch Popular Services (Dynamic from Nested Subcollection)
        const svcSnap = await getDocs(query(collection(db, "services", "Cleaning", "services"), limit(8)));
        let svcs = svcSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (svcs.length === 0) {
           const altSvcSnap = await getDocs(query(collection(db, "services", "AC Repair", "services"), limit(8)));
           svcs = altSvcSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        if (svcs.length > 0) {
          // Apply pricing overrides
          const pricing = currentCityData?.settings?.pricing || {};
          const updatedSvcs = svcs.map(s => ({
            ...s,
            price: pricing[s.id] || s.price
          }));
          setServices(updatedSvcs);
        }

        // Filter professionals by city from address
        const city = address?.split(',').slice(-2, -1)[0]?.trim();
        let proQuery = query(collection(db, "professionals"));
        if (city) {
          proQuery = query(collection(db, "professionals"), where("city", "==", city));
        }
        
        const proSnap = await getDocs(proQuery);
        let pros = proSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (pros.length === 0) {
          const fallbackSnap = await getDocs(query(collection(db, "professionals"), limit(5)));
          pros = fallbackSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        
        setProfessionals(pros);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Real-time Banners Sync
    const bannersQuery = query(collection(db, "banners"), orderBy("order", "asc"));
    const unsubscribeBanners = onSnapshot(bannersQuery, (snapshot) => {
      const bans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("Fetched banners:", bans.length);
      if (bans.length > 0) setBanners(bans);
    }, (error) => {
      console.error("Banner sync error:", error);
      getDocs(collection(db, "banners")).then(snap => {
        const bans = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (bans.length > 0) setBanners(bans);
      });
    });

    return () => unsubscribeBanners();
  }, [address]);

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      {/* Background Gradients */}
      <View className="absolute top-0 left-0 right-0 h-[600px]">
        <LinearGradient
          colors={["#E0F2FE", "#F8FAFC", "#F5F3FF"]}
          className="flex-1"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </View>

      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Modern Header */}
        <Animated.View style={headerStyle} className="flex-row items-center justify-between px-6 pt-2 pb-4">
          <View>
            <Text className="text-[10px] text-muted font-bold uppercase tracking-[3px] mb-1">Current Location</Text>
            <Pressable onPress={() => router.push("/location")} className="flex-row items-center gap-1">
              <MapPin size={14} color="#000" />
              <Text className="text-[15px] font-bold text-black">{address?.split(',')[0] || "Select Location"}</Text>
            </Pressable>
          </View>
          <View className="flex-row gap-3">
             <Pressable 
               onPress={() => router.push("/search")}
               className="h-10 w-10 rounded-full bg-white/60 items-center justify-center border border-white" 
               style={SOFT_SHADOW}
             >
               <Search size={18} color="#000" />
             </Pressable>
             <Pressable 
               onPress={() => router.push("/notifications")}
               className="h-10 w-10 rounded-full bg-white/60 items-center justify-center border border-white" 
               style={SOFT_SHADOW}
             >
               <Bell size={18} color="#000" />
             </Pressable>
          </View>
        </Animated.View>

        <Animated.ScrollView 
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Featured Hero Carousel */}
          {banners.length > 0 && (
            <Animated.View entering={FadeInDown.delay(200)} className="px-6 mt-4">
              <View className="h-[240px] rounded-[40px] overflow-hidden relative" style={SOFT_SHADOW}>
                <FlatList 
                  data={banners}
                  horizontal
                  snapToInterval={width - 48}
                  decelerationRate="fast"
                  snapToAlignment="start"
                  showsHorizontalScrollIndicator={false}
                  onScroll={(e) => {
                    const x = e.nativeEvent.contentOffset.x;
                    setActiveBanner(Math.round(x / (width - 48)));
                  }}
                  extraData={banners}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View style={{ width: width - 48, height: 240 }}>
                      <Image 
                        source={{ uri: item.imageUrl }} 
                        className="w-full h-full"
                        contentFit="cover"
                      />
                      <LinearGradient 
                        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.8)']} 
                        className="absolute inset-0 p-8 justify-end"
                      >
                        <Text className="text-white text-[28px] font-bold leading-tight tracking-tight">
                          {item.title || "Luxe Home Care."}{"\n"}
                          {item.subtitle || "Simplified."}
                        </Text>
                        <View className="flex-row items-center justify-between mt-4">
                          <Pressable 
                            onPress={() => {
                              if (item.target) {
                                router.push({ pathname: '/category/[slug]', params: { slug: item.target, name: item.title } });
                              }
                            }}
                            className="bg-white rounded-full px-5 py-2.5 flex-row items-center gap-2"
                          >
                            <Text className="text-black font-bold text-[13px]">{item.buttonText || "Get Started"}</Text>
                            <Plus size={14} color="#000" />
                          </Pressable>
                          
                          {/* Dots Overlay */}
                          <View className="flex-row gap-1.5">
                            {banners.map((_, i) => (
                              <View 
                                key={i} 
                                className={`h-1.5 rounded-full ${activeBanner === i ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`} 
                              />
                            ))}
                          </View>
                        </View>
                      </LinearGradient>
                    </View>
                  )}
                />
              </View>
            </Animated.View>
          )}

          {/* Categories Horizontal - Glass Circles */}
          <View className="mt-10">
            <Text className="px-8 text-[12px] font-bold text-muted uppercase tracking-[3px] mb-6">Experience</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 20 }}>
              {categories.map((c, i) => (
                <Animated.View key={c.id || c.slug} entering={FadeInRight.delay(i * 100)}>
                  <Link href={{ pathname: '/category/[slug]', params: { slug: c.slug || c.label, name: c.label } }} asChild>
                    <Pressable className="items-center">
                      <View 
                        className="h-20 w-20 rounded-full bg-white/40 items-center justify-center border border-white/60" 
                        style={SOFT_SHADOW}
                      >
                        <Text style={{ fontSize: 32 }}>{c.emoji}</Text>
                      </View>
                      <Text className="text-[12px] font-bold text-black mt-3">{c.label}</Text>
                    </Pressable>
                  </Link>
                </Animated.View>
              ))}
            </ScrollView>
          </View>

          {/* Curated Services - Bento Grid */}
          <View className="mt-12 px-6">
            <View className="mb-6">
              <Text className="text-[22px] font-bold text-black tracking-tight">Our Services</Text>
              <Text className="text-[13px] text-muted font-medium mt-1">Curated for your home</Text>
            </View>

            <View className="flex-row flex-wrap gap-3">
              <Pressable 
                onPress={() => router.push({ pathname: '/category/[slug]', params: { slug: 'Cleaning', name: 'Home Cleaning' } })}
                className="rounded-3xl overflow-hidden relative" 
                style={[SOFT_SHADOW, { width: (width - 48) * (4/6) - 6, height: 210 }]}
              >
                <Image source={IMG.heroCleaning} className="absolute inset-0 w-full h-full" contentFit="cover" />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} className="absolute inset-0 p-5 justify-end" />
                <View className="absolute top-4 left-4 bg-black/40 px-3 py-1.5 rounded-full border border-white/20">
                  <Text className="text-white text-[9px] font-bold uppercase tracking-widest">POPULAR</Text>
                </View>
                <View className="absolute bottom-5 left-5">
                  <Text className="text-white text-[18px] font-bold">Home Cleaning</Text>
                  <Text className="text-white/70 text-[11px] font-medium mt-1">From ₹499 • 60 mins</Text>
                </View>
                <View className="absolute bottom-5 right-5 bg-white px-4 py-2 rounded-full shadow-sm">
                  <Text className="text-black text-[12px] font-bold">Book</Text>
                </View>
              </Pressable>

              <View className="gap-3" style={{ width: (width - 48) * (2/6) - 6 }}>
                <Pressable 
                  onPress={() => router.push({ pathname: '/category/[slug]', params: { slug: 'AC Repair', name: 'AC Repair' } })}
                  className="rounded-3xl overflow-hidden relative bg-blue-50" 
                  style={[SOFT_SHADOW, { height: 98 }]}
                >
                  <Image source={IMG.serviceAc} className="absolute inset-0 w-full h-full" contentFit="cover" />
                  <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} className="absolute inset-0 p-3" />
                  <View className="absolute top-3 left-3">
                    <Text className="text-white text-[13px] font-bold shadow-black/50 shadow-sm">AC Repair</Text>
                  </View>
                </Pressable>

                <Pressable 
                  onPress={() => router.push({ pathname: '/category/[slug]', params: { slug: 'Salon', name: 'Salon' } })}
                  className="rounded-3xl overflow-hidden relative bg-purple-50" 
                  style={[SOFT_SHADOW, { height: 98 }]}
                >
                  <Image source={IMG.serviceSalon} className="absolute inset-0 w-full h-full" contentFit="cover" />
                  <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} className="absolute inset-0 p-3" />
                  <View className="absolute top-3 left-3">
                    <Text className="text-white text-[13px] font-bold shadow-black/50 shadow-sm">Salon</Text>
                  </View>
                </Pressable>
              </View>

              <View className="flex-row gap-3 w-full">
                <Pressable 
                  onPress={() => router.push({ pathname: '/category/[slug]', params: { slug: 'Plumbing', name: 'Plumbing' } })}
                  className="rounded-3xl overflow-hidden relative" 
                  style={[SOFT_SHADOW, { flex: 1, height: 110 }]}
                >
                  <Image source={IMG.servicePlumbing} className="absolute inset-0 w-full h-full" contentFit="cover" />
                  <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} className="absolute inset-0 p-4" />
                  <View className="absolute top-4 left-4">
                    <Text className="text-white text-[14px] font-bold shadow-black/50 shadow-sm">Plumbing</Text>
                  </View>
                </Pressable>

                <Pressable 
                  onPress={() => router.push({ pathname: '/category/[slug]', params: { slug: 'Cleaning', name: 'Deep Clean' } })}
                  className="rounded-3xl overflow-hidden relative" 
                  style={[SOFT_SHADOW, { flex: 1, height: 110 }]}
                >
                  <Image source={IMG.serviceDeep} className="absolute inset-0 w-full h-full" contentFit="cover" />
                  <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} className="absolute inset-0 p-4" />
                  <View className="absolute top-4 left-4">
                    <Text className="text-white text-[14px] font-bold shadow-black/50 shadow-sm">Deep Clean</Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Popular Services */}
          <View className="mt-12">
            <View className="flex-row items-center justify-between px-8 mb-6">
              <Text className="text-[12px] font-bold text-muted uppercase tracking-[3px]">Popular Services</Text>
              <Pressable onPress={() => router.push({ pathname: '/category/[slug]', params: { slug: 'Cleaning', name: 'Cleaning' } })}>
                <Text className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">View All</Text>
              </Pressable>
            </View>
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}>
                {services.map((s, i) => (
                  <Animated.View key={s.id} entering={FadeInDown.delay(i * 100)}>
                    <Link href={{ pathname: '/book/[id]', params: { id: s.slug || s.id || s.title } }} asChild>
                      <Pressable 
                        className="bg-white rounded-[32px] p-2 border border-gray-100" 
                        style={[SOFT_SHADOW, { width: 160 }]}
                      >
                        <Image source={s.img || { uri: s.imageUrl }} className="w-full h-32 rounded-[28px]" />
                        <View className="p-3">
                          <Text className="text-[13px] font-bold text-black" numberOfLines={1}>{s.title || s.name}</Text>
                          <Text className="text-[14px] font-bold text-black mt-2">₹{s.price}</Text>
                        </View>
                      </Pressable>
                    </Link>
                  </Animated.View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Nearby Professionals */}
          <View className="mt-12">
            <View className="px-8 mb-6">
              <Text className="text-[20px] font-bold text-black tracking-tight">Nearby Professionals</Text>
              <Text className="text-[12px] text-muted font-medium mt-1">Available in {address?.split(',').slice(-2, -1)[0]?.trim() || 'your area'}</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}>
              {professionals.length === 0 ? (
                <View className="px-4 py-8 items-center justify-center">
                   <Text className="text-muted font-medium text-[13px]">No professionals nearby right now.</Text>
                </View>
              ) : (
                professionals.map((pro, i) => (
                  <Animated.View key={pro.id} entering={FadeInRight.delay(i * 100)}>
                    <Pressable 
                      className="bg-white rounded-[24px] p-4 border border-gray-50" 
                      style={[SOFT_SHADOW, { width: 220 }]}
                    >
                      <View className="flex-row items-center gap-3">
                        <Image source={{ uri: pro.image || pro.imageUrl }} className="h-12 w-12 rounded-full bg-gray-100" />
                        <View className="flex-1">
                          <Text className="text-[14px] font-bold text-black" numberOfLines={1}>{pro.name}</Text>
                          <Text className="text-[11px] text-muted font-medium">{pro.specialty || pro.category || 'Expert Pro'}</Text>
                        </View>
                      </View>
                      <View className="flex-row items-center gap-1.5 mt-4">
                        <Star size={10} color="#D6A75A" fill="#D6A75A" />
                        <Text className="text-[11px] font-bold text-black">{pro.rating}</Text>
                        <Text className="text-[11px] text-muted font-medium ml-2">{pro.exp || '5 yrs'} Exp</Text>
                      </View>
                    </Pressable>
                  </Animated.View>
                ))
              )}
            </ScrollView>
          </View>

          {/* Brand Trust */}
          <View className="mt-20 items-center px-6">
            <View className="items-center mb-10">
               <Text className="text-[24px] font-bold text-[#3B6BFF]">DirtFree</Text>
               <Text className="text-[12px] text-muted font-bold mt-1 uppercase tracking-widest text-center">Trusted by 450k+ families</Text>
            </View>
            <View className="flex-row bg-gray-50 rounded-[32px] p-6 w-full justify-between border border-gray-100">
               <TrustBadge icon={<ShieldCheck size={20} color="#3B6BFF" />} label="Verified" />
               <View className="w-px h-10 bg-gray-200" />
               <TrustBadge icon={<Star size={20} color="#3B6BFF" />} label="Trained" />
               <View className="w-px h-10 bg-gray-200" />
               <TrustBadge icon={<Sparkles size={20} color="#3B6BFF" />} label="Reliable" />
            </View>
          </View>

          {/* Footer */}
          <View className="mt-16 pb-10 items-center">
            <View className="flex-row items-center gap-1.5 opacity-50">
              <Text className="text-[12px] font-bold text-muted uppercase tracking-[2px]">Made with</Text>
              <Heart size={14} color="#ef4444" fill="#ef4444" />
              <Text className="text-[12px] font-bold text-muted uppercase tracking-[2px]">in India</Text>
            </View>
          </View>

        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

function TrustBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View className="items-center flex-1">
      {icon}
      <Text className="text-[11px] font-bold text-muted mt-2 uppercase tracking-wider">{label}</Text>
    </View>
  );
}
