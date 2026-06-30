import React, { useMemo, useState, useEffect } from "react";
import { ScrollView, View, Text, Image, Pressable, Modal, ActivityIndicator, Dimensions, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Check, CheckCircle2, ChevronRight, Clock, ShieldCheck, Sparkles, AlertCircle, Tag, MapPin } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SERVICES } from "../../lib/data";
import { useLocation } from "../../context/LocationContext";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, onSnapshot, writeBatch } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import * as Haptics from 'expo-haptics';
import { Alert } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { socketService } from "../../lib/socket";

const CATEGORY_ADDONS: Record<string, { id: string; label: string; price: number }[]> = {
  "Cleaning": [
    { id: "fridge", label: "Fridge interior", price: 199 },
    { id: "balcony", label: "Balcony deep-clean", price: 149 },
    { id: "windows", label: "Window cleaning", price: 99 },
  ],
  "AC Repair": [
    { id: "piping", label: "Extra copper piping (per m)", price: 299 },
    { id: "stand", label: "Outdoor unit stand installation", price: 399 },
    { id: "foam", label: "Foam cleaning booster", price: 199 },
  ],
  "Plumbing": [
    { id: "tape", label: "Teflon tape & washers pack", price: 49 },
    { id: "drain", label: "Drain cleaner chemical", price: 99 },
    { id: "coupling", label: "Sink coupling replacement", price: 149 },
  ],
  "Electrician": [
    { id: "switch", label: "Modular switch replacement", price: 99 },
    { id: "wire", label: "Anchor wire pack (10m)", price: 199 },
    { id: "plug", label: "Heavy duty plug top (16A)", price: 149 },
  ],
  "Salon": [
    { id: "facial", label: "Facial massage booster", price: 299 },
    { id: "spa", label: "Hair spa treatment", price: 399 },
    { id: "mask", label: "Charcoal peel-off mask", price: 149 },
  ],
};

const getCategoryKey = (category?: string) => {
  if (!category) return "Cleaning";
  const normalized = category.toLowerCase().trim();
  if (normalized.includes("clean")) return "Cleaning";
  if (normalized.includes("ac")) return "AC Repair";
  if (normalized.includes("plumb")) return "Plumbing";
  if (normalized.includes("elect")) return "Electrician";
  if (normalized.includes("salon") || normalized.includes("groom") || normalized.includes("spa")) return "Salon";
  return "Cleaning";
};

const SLOTS = ["10:00 AM", "01:00 PM", "04:00 PM", "07:00 PM"];

const S = {
  shadowColor: "#000",
  shadowOpacity: 0.04,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};

const { width } = Dimensions.get('window');

const AVAILABLE_OFFERS = [
  { code: 'DIRTFREE50', description: 'Flat ₹50 off on your first booking', discount: 50 },
  { code: 'FESTIVE100', description: 'Special ₹100 off on deep cleaning', discount: 100 },
  { code: 'CLEAN20', description: '₹20 off on regular cleaning', discount: 20 },
];

export default function BookFlow() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { address, currentCityData, location } = useLocation();
  const { user, profile } = useAuth();
  
  const URGENT_FEE = currentCityData?.settings?.urgentFee !== undefined ? Number(currentCityData.settings.urgentFee) : 49;
  const FIXED_SERVICE_FEE = currentCityData?.settings?.serviceFee !== undefined ? Number(currentCityData.settings.serviceFee) : 49;

  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'instant' | 'scheduled' | 'recurring'>('scheduled');
  const [mainMinutes, setMainMinutes] = useState(30);
  const [addonMinutes, setAddonMinutes] = useState<Record<string, number>>({});
  const [addons, setAddons] = useState<string[]>([]);
  const [date, setDate] = useState(new Date());
  const [slot, setSlot] = useState("10:00 AM");
  const [isUrgent, setIsUrgent] = useState(false);
  const [pay, setPay] = useState("UPI");
  const [done, setDone] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [isCouponModalVisible, setIsCouponModalVisible] = useState(false);
  const [isPartnerAvailable, setIsPartnerAvailable] = useState<boolean | null>(null);
  const [recurringFrequency, setRecurringFrequency] = useState('weekly');
  const [isRecurringModalVisible, setIsRecurringModalVisible] = useState(false);

  useEffect(() => {
    socketService.connect();
    return () => {
      socketService.disconnect();
    };
  }, []);

  const currentAddonsList = useMemo(() => {
    const catKey = getCategoryKey(service?.category);
    return CATEGORY_ADDONS[catKey] || CATEGORY_ADDONS["Cleaning"];
  }, [service]);

  useEffect(() => {
    const fetchService = async () => {
      try {
        const searchId = (id as string)?.toLowerCase();
        let finalSvc = SERVICES.find(s =>
          s.slug?.toLowerCase() === searchId ||
          s.title?.toLowerCase() === searchId ||
          s.slug?.replace(/-/g, ' ').toLowerCase() === searchId ||
          searchId?.includes(s.slug?.toLowerCase())
        ) as any;

        if (!finalSvc) {
          const docRef = doc(db, 'services', id as string);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            finalSvc = { id: docSnap.id, ...docSnap.data() };
          } else {
            const cats = ['Cleaning', 'AC Repair', 'Plumbing', 'Electrician', 'Salon'];
            for (const cat of cats) {
              const subDocRef = doc(db, 'services', cat, 'services', id as string);
              const subSnap = await getDoc(subDocRef);
              if (subSnap.exists()) {
                finalSvc = { id: subSnap.id, category: cat, ...subSnap.data() };
                break;
              }
            }
          }
        }

        if (finalSvc) {
          const pricing = currentCityData?.settings?.pricing || {};
          const finalPrice = pricing[finalSvc.id] || finalSvc.price;
          setService({ ...finalSvc, price: finalPrice });
        }
      } catch (error) {
        console.error('Error fetching service:', error);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchService();
  }, [id, currentCityData]);

  useEffect(() => {
    if (!address) { setIsPartnerAvailable(false); return; }
    const addressLower = address.toLowerCase();
    const unsubPartners = onSnapshot(collection(db, "partners"), async (partnersSnap) => {
      try {
        const prosSnap = await getDocs(collection(db, "professionals"));
        const allDocs = [...partnersSnap.docs, ...prosSnap.docs];
        const available = allDocs.some(doc => {
          const d = doc.data();
          if (d.status && d.status !== 'approved' && d.status !== 'pending') return false;
          if (d.isOnline !== undefined && d.isOnline !== true) return false;
          const proCity = (d.city || '').toLowerCase().trim();
          return proCity && addressLower.includes(proCity);
        });
        setIsPartnerAvailable(available);
      } catch (e) { setIsPartnerAvailable(false); }
    });
    return () => unsubPartners();
  }, [address]);

  const dates = useMemo(() => {
    const d = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      d.push(date);
    }
    return d;
  }, []);

  const getServicePrice = (basePrice: number) => {
    if (activeTab === 'recurring') return Math.round(basePrice * 0.8);
    return basePrice;
  };

  const getAddonPrice = (basePrice: number) => {
    if (activeTab === 'recurring') return Math.round(basePrice * 0.8);
    return basePrice;
  };

  const baseServicePrice = getServicePrice(service?.price || 0);
  const serviceSubtotal = Math.round(baseServicePrice * (mainMinutes / 30));
  const addonsSubtotal = addons.reduce((sum, addonId) => {
    const item = currentAddonsList.find(a => a.id === addonId);
    if (!item) return sum;
    const itemMinutes = addonMinutes[addonId] || 30;
    return sum + Math.round(getAddonPrice(item.price) * (itemMinutes / 30));
  }, 0);
  
  const subtotalSingleVisit = serviceSubtotal + addonsSubtotal;
  
  // Calculate frequency multiplier: weekly = 4 visits/mo, monthly = 30 visits/mo
  const frequencyMultiplier = activeTab === 'recurring' 
    ? (recurringFrequency === 'weekly' ? 4 : 30) 
    : 1;

  const subtotal = subtotalSingleVisit * frequencyMultiplier;
  const urgentAmount = (activeTab === 'instant' || isUrgent) ? URGENT_FEE : 0;
  // Apply service fee per visit for recurring bookings
  const serviceFeeTotal = FIXED_SERVICE_FEE * frequencyMultiplier;
  const billSubtotal = subtotal + urgentAmount + serviceFeeTotal;
  const gstAmount = billSubtotal * 0.18;
  const finalTotal = billSubtotal + gstAmount - discount;

  const handleConfirm = async () => {
    if (!user && !profile) {
      Alert.alert('Login Required', 'Please login to confirm your booking.');
      return;
    }
    setIsBooking(true);
    try {
      const dateStr = date.toDateString();
      const bookingData = {
        userId: (user?.uid || profile?.uid) ?? null,
        userName: (profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}` : 'Customer') || 'Customer',
        userPhone: (profile?.phoneNumber || user?.phoneNumber || 'N/A') || 'N/A',
        userAddress: (address || profile?.selectedAddress || 'No Address') || 'No Address',
        service: (service?.title || service?.name) ?? 'Service',
        date: dateStr,
        slot: activeTab === 'instant' ? '30-45 mins' : slot,
        price: finalTotal.toFixed(2),
        bookingType: activeTab,
        items: [{
          serviceId: (service?.id || id) ?? '',
          serviceName: (service?.title || service?.name) ?? 'Service',
          price: subtotal.toString(),
          isUrgent: activeTab === 'instant',
          date: dateStr,
          startTime: slot || 'ASAP',
          frequency: activeTab === 'recurring' ? recurringFrequency : 'one-time',
          qty: 1,
          durationMinutes: mainMinutes,
          addons: addons.map(aId => ({ id: aId, minutes: addonMinutes[aId] || 60 })),
        }],
        totalPrice: Number(finalTotal.toFixed(2)) || 0,
        discount: discount || 0,
        couponCode: couponCode || null,
        urgentFee: urgentAmount || 0,
        serviceFee: FIXED_SERVICE_FEE || 0,
        status: 'searching',
        statusStep: 0,
        paymentStatus: 'pending',
        paymentMethod: pay || 'UPI',
        createdAt: serverTimestamp(),
        serviceCity: currentCityData?.name || 'Unknown',
        location: location ? { lat: location.coords.latitude ?? 0, lng: location.coords.longitude ?? 0 } : null,
      };
      const docRef = await addDoc(collection(db, 'bookings'), bookingData);

      // If recurring, generate Subscription and ServiceTasks
      if (activeTab === 'recurring') {
        const batch = writeBatch(db);
        const subRef = doc(collection(db, 'subscriptions'));
        
        batch.set(subRef, {
          bookingId: docRef.id,
          customerId: user?.uid || profile?.uid || 'guest',
          customerName: bookingData.userName,
          frequency: recurringFrequency,
          status: 'active',
          createdAt: serverTimestamp()
        });

        // Generate dates
        let numTasks = 0;
        let step = 1; // days
        if (recurringFrequency === 'weekly') { numTasks = 4; step = 7; } // 4 visits, 1 per week
        else if (recurringFrequency === 'monthly') { numTasks = 30; step = 1; } // 30 visits, 1 per day
        else { numTasks = 1; step = 1; }

        let currentDate = new Date(date);
        for (let i = 0; i < numTasks; i++) {
          const taskRef = doc(collection(db, 'serviceTasks'));
          batch.set(taskRef, {
            subscriptionId: subRef.id,
            bookingId: docRef.id,
            customerId: user?.uid || profile?.uid || 'guest',
            assignedPartnerId: null,
            status: 'pending_reassignment',
            date: currentDate.toISOString(),
            createdAt: serverTimestamp()
          });
          currentDate.setDate(currentDate.getDate() + step);
        }

        await batch.commit();
      }
      
      if (location?.coords) {
        socketService.emit('requestBooking', {
          bookingId: docRef.id,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          radiusInKm: 5,
          serviceName: bookingData.service
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
    } catch (error) {
      console.error('Booking error:', error);
      Alert.alert('Error', 'Failed to confirm booking. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  const applyCoupon = (code: string, amount: number) => {
    setCouponCode(code);
    setDiscount(amount);
    setIsCouponModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8F9FB', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#0E1220" />
      </View>
    );
  }

  const TABS = [
    { key: 'instant', label: 'Instant', icon: '⚡' },
    { key: 'scheduled', label: 'Scheduled', icon: '📅' },
    { key: 'recurring', label: 'Recurring', icon: '🔁' },
  ];

  return (
    <View className="flex-1 bg-bg">
      <StatusBar style="dark" />

      {/* Header */}
      <SafeAreaView edges={['top']} className="bg-white border-b border-border">
        <View className="flex-row items-center px-4 py-3 gap-3">
          <Pressable
            onPress={() => router.back()}
            className="w-9 h-9 rounded-xl bg-bg items-center justify-center"
          >
            <ArrowLeft size={16} color="#0E1220" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-[16px] font-bold text-fg" numberOfLines={1}>
              {service?.title || service?.name || 'Book Service'}
            </Text>
            <Text className="text-[11px] text-muted mt-0.5">
              {activeTab === 'instant' ? 'Arrives in 30–45 min' : activeTab === 'recurring' ? 'Auto-scheduled visits' : 'Pick a date & slot'}
            </Text>
          </View>
          <View className="bg-success/10 px-2.5 py-1 rounded-full">
            <Text className="text-[12px] font-bold text-success">₹{finalTotal.toFixed(0)}</Text>
          </View>
        </View>

        {/* Tab Switcher */}
        <View className="flex-row px-4 pb-3 gap-2">
          {TABS.map(tab => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(tab.key as any); }}
                className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-1 ${active ? 'bg-fg' : 'bg-bg'}`}
              >
                <Text className="text-[12px]">{tab.icon}</Text>
                <Text className={`text-[12px] font-bold ${active ? 'text-white' : 'text-muted'}`}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingTop: 12 }} showsVerticalScrollIndicator={false}>

        {/* Service Card */}
        <View className="mx-4 mb-2.5 bg-white rounded-2xl p-3.5 border border-border/60" style={S}>
          <View className="flex-row items-center gap-3">
            <Image
              source={service?.img || { uri: service?.imageUrl || 'https://via.placeholder.com/80' }}
              className="w-14 h-14 rounded-xl bg-bg"
            />
            <View className="flex-1">
              <Text className="text-[14px] font-bold text-fg mb-0.5" numberOfLines={2}>
                {service?.title || service?.name}
              </Text>
              <View className="flex-row items-center gap-1.5">
                {(activeTab === 'instant' || activeTab === 'recurring') && (
                  <Text className="text-[11px] text-muted line-through">₹{service?.price}</Text>
                )}
                <Text className="text-[15px] font-extrabold text-fg">₹{baseServicePrice}</Text>
                {activeTab === 'recurring' && (
                  <View className="bg-success/15 px-1.5 py-0.5 rounded">
                    <Text className="text-[10px] font-bold text-success">20% OFF</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Duration stepper */}
            <View className="items-center border border-border bg-bg rounded-xl px-2 py-1.5 min-w-[76px]">
              <View className="flex-row items-center gap-2">
                <Pressable onPress={() => { if (mainMinutes > 30) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMainMinutes(mainMinutes - 30); } }} className="px-1">
                  <Text className="text-[16px] font-bold text-fg">−</Text>
                </Pressable>
                <Text className="text-[13px] font-bold text-fg">{mainMinutes}m</Text>
                <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMainMinutes(mainMinutes + 30); }} className="px-1">
                  <Text className="text-[16px] font-bold text-fg">+</Text>
                </Pressable>
              </View>
              <Text className="text-[9px] text-muted mt-0.5 uppercase tracking-widest">Duration</Text>
            </View>
          </View>
        </View>

        {/* Instant mode banner */}
        {activeTab === 'instant' && (
          <Animated.View entering={FadeIn} className="mx-4 mb-2.5 bg-amber-50/50 rounded-xl p-3 flex-row gap-3 items-center border border-amber-200">
            <Text className="text-[20px]">⚡</Text>
            <View className="flex-1">
              <Text className="text-[13px] font-bold text-amber-800">Instant Booking — ₹{baseServicePrice} + ₹{URGENT_FEE} priority fee</Text>
              <Text className="text-[11px] text-amber-700/80 mt-0.5">A professional will arrive within 30–45 minutes</Text>
            </View>
            {isPartnerAvailable === false && (
              <View className="bg-danger/10 px-2 py-1 rounded-lg">
                <Text className="text-[10px] font-bold text-danger">FULL</Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Recurring banner */}
        {activeTab === 'recurring' && (
          <Animated.View entering={FadeIn} className="mx-4 mb-2.5 bg-success/10 rounded-xl p-3 flex-row gap-3 items-center border border-success/20">
            <Text className="text-[20px]">🔁</Text>
            <View className="flex-1">
              <Text className="text-[13px] font-bold text-success">Recurring — Save 20% every visit</Text>
              <Text className="text-[11px] text-success/80 mt-0.5">Auto-scheduled, same slot every time</Text>
            </View>
          </Animated.View>
        )}

        {/* Addons */}
        {activeTab !== 'instant' && currentAddonsList.length > 0 && (
          <View className="mx-4 mb-2.5 bg-white rounded-2xl border border-border/60 overflow-hidden" style={S}>
            <View className="p-3.5 pb-2 border-b border-bg">
              <Text className="text-[13px] font-bold text-fg">Add-ons</Text>
            </View>
            {currentAddonsList.map((a, idx) => {
              const on = addons.includes(a.id);
              return (
                <Pressable
                  key={a.id}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAddons(on ? addons.filter(x => x !== a.id) : [...addons, a.id]); }}
                  className="flex-row items-center px-3.5 py-3 border-b border-bg last:border-b-0 gap-3"
                >
                  <View className={`w-5 h-5 rounded-md items-center justify-center border ${on ? 'bg-fg border-fg' : 'bg-bg border-border'}`}>
                    {on && <Check size={11} color="#fff" />}
                  </View>
                  <Text className="flex-1 text-[13px] text-fg font-medium">{a.label}</Text>
                  <Text className="text-[13px] font-bold text-fg">+₹{getAddonPrice(a.price)}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Date & Slot — Scheduled only */}
        {activeTab === 'scheduled' && (
          <View className="mx-4 mb-2.5 bg-white rounded-2xl p-3.5 border border-border/60" style={S}>
            <Text className="text-[13px] font-bold text-fg mb-2.5">Date & Time</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
              {dates.map((d, i) => {
                const on = d.toDateString() === date.toDateString();
                const isToday = d.toDateString() === new Date().toDateString();
                const day = d.toLocaleDateString('en-US', { weekday: 'short' });
                const num = d.getDate();
                const allSlotsPassed = isToday && new Date().getHours() >= 19;
                return (
                  <Pressable
                    key={i}
                    onPress={() => setDate(d)}
                    disabled={allSlotsPassed && !isUrgent}
                    className={`w-12 py-2.5 rounded-xl items-center justify-center ${on ? 'bg-fg' : 'bg-bg'} ${allSlotsPassed ? 'opacity-40' : ''}`}
                  >
                    <Text className={`text-[10px] font-bold uppercase ${on ? 'text-white/60' : 'text-muted'}`}>{day}</Text>
                    <Text className={`text-[15px] font-bold mt-0.5 ${on ? 'text-white' : 'text-fg'}`}>{num}</Text>
                    {isToday && <Text className="text-[7px] text-success font-extrabold mt-0.5">TODAY</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>

            <View className="flex-row flex-wrap justify-between gap-y-2 mt-4">
              {SLOTS.map((s) => {
                const on = s === slot;
                const isToday = date.toDateString() === new Date().toDateString();
                const [time, period] = s.split(' ');
                let hour = parseInt(time.split(':')[0]);
                if (period === 'PM' && hour !== 12) hour += 12;
                if (period === 'AM' && hour === 12) hour = 0;
                const isPassed = isToday && new Date().getHours() >= hour - 1;
                return (
                  <Pressable
                    key={s}
                    onPress={() => !isPassed && setSlot(s)}
                    disabled={isPassed}
                    className={`py-2.5 rounded-xl flex-row justify-center items-center ${on ? 'bg-fg' : 'bg-bg'} ${isPassed ? 'opacity-35' : ''}`}
                    style={{ width: '48.5%' }}
                  >
                    <Text className={`text-[12px] font-bold ${on ? 'text-white' : 'text-fg'}`}>{s}</Text>
                    {isPassed && <Text className="text-[9px] text-danger font-bold ml-1">PASSED</Text>}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}



        {/* Coupon — not recurring */}
        {activeTab !== 'recurring' && (
          <Pressable
            onPress={() => setIsCouponModalVisible(true)}
            className="mx-4 mb-2.5 bg-white rounded-2xl p-3.5 flex-row items-center gap-3 border border-border/60"
            style={S}
          >
            <View className={`w-8 h-8 rounded-lg items-center justify-center ${couponCode ? 'bg-success/10' : 'bg-bg'}`}>
              <Tag size={14} color={couponCode ? '#22C58A' : '#6B7280'} />
            </View>
            <View className="flex-1">
              <Text className="text-[13px] font-bold text-fg">
                {couponCode ? `${couponCode} applied` : 'Apply coupon'}
              </Text>
              {couponCode && <Text className="text-[11px] text-success mt-0.5">You saved ₹{discount}</Text>}
            </View>
            {couponCode ? (
              <Pressable onPress={() => { setCouponCode(''); setDiscount(0); }} className="px-2 py-1 rounded bg-danger/10">
                <Text className="text-[11px] font-bold text-danger">Remove</Text>
              </Pressable>
            ) : (
              <ChevronRight size={14} color="#9CA3AF" />
            )}
          </Pressable>
        )}

        {/* Bill Summary */}
        <View className="mx-4 mb-2.5 bg-white rounded-2xl p-4 border border-border/60" style={S}>
          <Text className="text-[13px] font-bold text-fg mb-3">Bill Summary</Text>
          
          {activeTab === 'recurring' ? (
            <>
              {/* Premium Breakdown row */}
              <View className="bg-bg rounded-xl p-3 mb-3 border border-border/40">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-[11px] font-bold text-muted uppercase tracking-wider">Per Visit Breakdown</Text>
                  <View className="bg-success/10 px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-bold text-success">20% Off Applied</Text>
                  </View>
                </View>
                <BillRow label={`${service?.title || 'Service'} (${mainMinutes}m)`} value={`₹${serviceSubtotal}`} />
                {addons.map(addonId => {
                  const item = currentAddonsList.find(a => a.id === addonId);
                  if (!item) return null;
                  const itemMinutes = addonMinutes[addonId] || 30;
                  const adj = Math.round(getAddonPrice(item.price) * (itemMinutes / 30));
                  return <BillRow key={addonId} label={item.label} value={`₹${adj}`} />;
                })}
                <BillRow label="Service fee" value={`₹${FIXED_SERVICE_FEE}`} />
                <View className="h-[1px] bg-border/40 my-2" />
                <View className="flex-row justify-between items-center">
                  <Text className="text-[12px] font-bold text-fg">Price per visit</Text>
                  <Text className="text-[12px] font-extrabold text-fg">₹{subtotalSingleVisit + FIXED_SERVICE_FEE}</Text>
                </View>
              </View>

              {/* Package Summary */}
              <View className="flex-row justify-between py-1.5 items-center">
                <Text className="text-[12px] text-muted font-medium">Subscription Cycle</Text>
                <View className="bg-fg px-2.5 py-0.5 rounded-full">
                  <Text className="text-[11px] font-bold text-white uppercase tracking-wide">
                    {recurringFrequency === 'weekly' ? 'Weekly (4 visits)' : 'Daily (30 visits)'}
                  </Text>
                </View>
              </View>
              <BillRow label="Visits Subtotal" value={`₹${(subtotalSingleVisit + FIXED_SERVICE_FEE) * frequencyMultiplier}`} />
            </>
          ) : (
            <>
              <BillRow label={`${service?.title || 'Service'} (${mainMinutes}m)`} value={`₹${serviceSubtotal}`} />
              {addons.map(addonId => {
                const item = currentAddonsList.find(a => a.id === addonId);
                if (!item) return null;
                const itemMinutes = addonMinutes[addonId] || 30;
                const adj = Math.round(getAddonPrice(item.price) * (itemMinutes / 30));
                return <BillRow key={addonId} label={`${item.label} (${itemMinutes}m)`} value={`₹${adj}`} />;
              })}
              <BillRow label="Service fee" value={`₹${FIXED_SERVICE_FEE}`} />
            </>
          )}

          {urgentAmount > 0 && <BillRow label="Priority Booking Fee" value={`₹${urgentAmount}`} />}
          <BillRow label="GST (18%)" value={`₹${gstAmount.toFixed(0)}`} />
          {discount > 0 && <BillRow label="Discount" value={`−₹${discount}`} color="#22C58A" />}
          <View className="h-[1px] bg-bg my-2.5" />
          <View className="flex-row justify-between items-center">
            <Text className="text-[14px] font-extrabold text-fg">Total amount to pay</Text>
            <Text className="text-[16px] font-black text-fg">₹{finalTotal.toFixed(0)}</Text>
          </View>
        </View>

        {/* Recurring Settings Inline */}
        {activeTab === 'recurring' && (
          <View className="mx-4 mb-2.5 bg-white rounded-2xl p-3.5 border border-border/60" style={S}>
            <Text className="text-[13px] font-bold text-fg mb-3">Subscription Setup</Text>

            <Text className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">Frequency</Text>
            <View className="flex-row gap-2 mb-4">
              {[['weekly', 'Weekly (4 visits)'], ['monthly', 'Monthly (30 visits)']].map(([freq, label]) => {
                const sel = recurringFrequency === freq;
                return (
                  <Pressable key={freq} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRecurringFrequency(freq); }}
                    className={`flex-1 py-2.5 rounded-xl items-center justify-center ${sel ? 'bg-fg' : 'bg-bg'}`}>
                    <Text className={`text-[12px] font-bold ${sel ? 'text-white' : 'text-muted'}`}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">Start Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
              {dates.map((d, i) => {
                const on = d.toDateString() === date.toDateString();
                const isToday = d.toDateString() === new Date().toDateString();
                const allSlotsPassed = isToday && new Date().getHours() >= 19;
                return (
                  <Pressable key={i} onPress={() => !allSlotsPassed && setDate(d)}
                    disabled={allSlotsPassed}
                    className={`w-12 py-2 rounded-xl items-center justify-center ${on ? 'bg-fg' : 'bg-bg'} ${allSlotsPassed ? 'opacity-40' : ''}`}>
                    <Text className={`text-[9px] font-bold uppercase ${on ? 'text-white/60' : 'text-muted'}`}>
                      {d.toLocaleDateString('en-US', { weekday: 'short' })}
                    </Text>
                    <Text className={`text-[14px] font-bold mt-0.5 ${on ? 'text-white' : 'text-fg'}`}>{d.getDate()}</Text>
                    {isToday && <Text className="text-[7px] text-success font-extrabold mt-0.5">TODAY</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text className="text-[11px] font-bold text-muted uppercase tracking-wider mt-3 mb-2">Preferred Slot</Text>
            <View className="flex-row flex-wrap justify-between gap-y-2">
              {SLOTS.map(s => {
                const on = s === slot;
                const isToday = date.toDateString() === new Date().toDateString();
                const [time, period] = s.split(' ');
                let hour = parseInt(time.split(':')[0]);
                if (period === 'PM' && hour !== 12) hour += 12;
                if (period === 'AM' && hour === 12) hour = 0;
                const isPassed = isToday && new Date().getHours() >= hour - 1;
                return (
                  <Pressable key={s} onPress={() => !isPassed && setSlot(s)}
                    disabled={isPassed}
                    className={`py-2.5 rounded-lg flex-row justify-center items-center ${on ? 'bg-fg' : 'bg-bg'} ${isPassed ? 'opacity-35' : ''}`}
                    style={{ width: '48.5%' }}
                  >
                    <Text className={`text-[12px] font-bold ${on ? 'text-white' : 'text-fg'}`}>{s}</Text>
                    {isPassed && <Text className="text-[9px] text-danger font-bold ml-1">PASSED</Text>}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Address */}
        <View className="mx-4 mb-2.5 bg-white rounded-2xl p-3.5 flex-row gap-3 items-center border border-border/60" style={S}>
          <MapPin size={14} color="#6B7280" />
          <Text className="flex-1 text-[12px] text-muted leading-relaxed" numberOfLines={2}>
            {address || profile?.selectedAddress || 'Add your address in profile'}
          </Text>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View className="absolute bottom-0 left-0 right-0 bg-white p-4 pb-7 border-t border-border">
        {activeTab === 'instant' && isPartnerAvailable === false ? (
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setActiveTab('scheduled'); }}
            className="bg-fg h-14 rounded-2xl flex-row items-center justify-center gap-2"
          >
            <Text className="text-white font-bold text-[15px]">Switch to Scheduled</Text>
            <ChevronRight size={18} color="#fff" />
          </Pressable>
        ) : (
          <Pressable
            onPress={handleConfirm}
            disabled={isBooking}
            className="bg-fg h-14 rounded-2xl flex-row items-center justify-between px-5"
            style={{ opacity: isBooking ? 0.7 : 1 }}
          >
            {isBooking ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color="#fff" />
              </View>
            ) : (
              <>
                <Text className="text-white font-extrabold text-[15px] tracking-wide">
                  {activeTab === 'instant' 
                    ? `Confirm Instant` 
                    : activeTab === 'recurring'
                    ? `Subscribe & Pay`
                    : `Confirm & Pay`}
                </Text>
                <View className="flex-row items-center gap-2">
                  <Text className="text-white font-bold text-[15px]">₹{finalTotal.toFixed(0)}</Text>
                  <View className="bg-white/20 rounded-full p-1">
                    <ChevronRight size={14} color="#fff" />
                  </View>
                </View>
              </>
            )}
          </Pressable>
        )}
      </View>

      {/* Success Modal */}
      <Modal visible={done} transparent animationType="fade">
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 24 }}>
          <Animated.View entering={ZoomIn} style={{ backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center', width: '100%' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F0FFF8', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <CheckCircle2 size={32} color="#22C58A" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#0E1220', textAlign: 'center' }}>Booking Confirmed!</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 8, marginBottom: 24, lineHeight: 20 }}>
              {activeTab === 'instant'
                ? "Your professional is on the way. ETA 30–45 mins."
                : activeTab === 'recurring'
                ? `Repeating ${recurringFrequency} from ${date.toDateString().split(' ').slice(1, 3).join(' ')} at ${slot}.`
                : `Scheduled for ${date.toDateString().split(' ').slice(1, 3).join(' ')} at ${slot}.`}
            </Text>
            <Pressable
              onPress={() => { setDone(false); router.replace("/(tabs)/bookings"); }}
              style={{ backgroundColor: '#0E1220', borderRadius: 14, height: 48, width: '100%', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>View My Bookings</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

      {/* Coupon Modal */}
      <Modal visible={isCouponModalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setIsCouponModalVisible(false)} />
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 }}>
            <View style={{ width: 36, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0E1220', marginBottom: 14 }}>Available Offers</Text>
            {AVAILABLE_OFFERS.map((offer) => (
              <Pressable
                key={offer.code}
                onPress={() => applyCoupon(offer.code, offer.discount)}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FB', borderRadius: 14, padding: 14, marginBottom: 10, gap: 12 }}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ backgroundColor: '#E7E8EC', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#0E1220' }}>{offer.code}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: '#374151', fontWeight: '500' }}>{offer.description}</Text>
                </View>
                <View style={{ backgroundColor: '#F0FFF8', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#22C58A' }}>₹{offer.discount} OFF</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function BillRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
      <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>{label}</Text>
      <Text style={{ fontSize: 12, fontWeight: '700', color: color || '#0E1220' }}>{value}</Text>
    </View>
  );
}
