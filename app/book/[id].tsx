import React, { useMemo, useState, useEffect } from "react";
import { ScrollView, View, Text, Image, Pressable, Modal, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Minus, Plus, Check, CheckCircle2, ChevronRight, Calendar, Clock, CreditCard, ShieldCheck, Sparkles } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SERVICES } from "../../lib/data";
import { useLocation } from "../../context/LocationContext";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { doc, getDoc, collection, addDoc, serverTimestamp, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import * as Haptics from 'expo-haptics';
import { Alert } from "react-native";
import { Ionicons } from '@expo/vector-icons';

const ADDONS = [
  { id: "fridge", label: "Fridge interior", price: 199 },
  { id: "balcony", label: "Balcony deep-clean", price: 149 },
  { id: "windows", label: "Window cleaning", price: 99 },
];

const FREQUENCIES = [
  { id: 'one-time', label: 'One-time', visits: 1 },
  { id: 'weekly', label: 'Weekly', visits: 4 },
  { id: 'monthly', label: 'Monthly', visits: 30 },
];

const SLOTS = ["10:00 AM", "01:00 PM", "04:00 PM", "07:00 PM"];
const URGENT_FEE = 149;

const LUMEN_SHADOW = { 
  shadowColor: "#0E1220", 
  shadowOpacity: 0.06, 
  shadowRadius: 16, 
  shadowOffset: { width: 0, height: 6 }, 
  elevation: 3 
};

export default function BookFlow() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { address, currentCityData } = useLocation();

  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState(0);
  const [frequency, setFrequency] = useState('one-time');
  const [qty, setQty] = useState(1);
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
  const [gstPercent, setGstPercent] = useState(18);
  const [servicePercent, setServicePercent] = useState(5);
  const { user, profile } = useAuth();
  const { location } = useLocation();

  const FIXED_SERVICE_FEE = 49;

  useEffect(() => {
    const fetchService = async () => {
      try {
        const searchId = (id as string)?.toLowerCase();
        
        // 1. Aggressive local search
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
                finalSvc = { id: subSnap.id, ...subSnap.data() };
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

  const dates = useMemo(() => {
    const d = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      d.push(date);
    }
    return d;
  }, []);

  const subtotal = (service?.price || 0) * qty + addons.reduce((s, id) => s + (ADDONS.find(a => a.id === id)?.price ?? 0), 0);
  const urgentAmount = isUrgent ? URGENT_FEE : 0;
  const billSubtotal = subtotal + urgentAmount + FIXED_SERVICE_FEE;
  const gstAmount = billSubtotal * (gstPercent / 100);
  const finalTotal = billSubtotal + gstAmount - discount;

  const next = () => (step < 2 ? setStep(step + 1) : setDone(true));
  const back = () => (step > 0 ? setStep(step - 1) : router.back());

  const handleConfirm = async () => {
    if (!user && !profile) {
      Alert.alert('Login Required', 'Please login to confirm your booking.');
      return;
    }

    setIsBooking(true);
    try {
      const fullAddress = (address || profile?.selectedAddress || '').toLowerCase();
      const detectedCity = currentCityData?.name || 'Unknown';

      const dateStr = date.toDateString();
      const bookingData = {
        userId: (user?.uid || profile?.uid) ?? null,
        userName: (profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}` : 'Customer') || 'Customer',
        userPhone: (profile?.phoneNumber || user?.phoneNumber || 'N/A') || 'N/A',
        userAddress: (address || profile?.selectedAddress || 'No Address') || 'No Address',
        service: (service?.title || service?.name) ?? 'Service',
        date: dateStr,
        slot: isUrgent ? '30-45 mins' : slot,
        price: finalTotal.toFixed(2),
        items: [{
          serviceId: (service?.id || id) ?? '',
          serviceName: (service?.title || service?.name) ?? 'Service',
          price: subtotal.toString(),
          isUrgent: !!isUrgent,
          date: dateStr,
          startTime: slot || 'ASAP',
          frequency: frequency || 'one-time',
          qty: qty || 1,
          addons: addons || [],
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
        serviceCity: detectedCity || 'Unknown',
        location: location ? { 
          lat: location.coords.latitude ?? 0, 
          lng: location.coords.longitude ?? 0 
        } : null
      };

      await addDoc(collection(db, 'bookings'), bookingData);
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

  const removeCoupon = () => {
    setCouponCode('');
    setDiscount(0);
  };

  const AVAILABLE_OFFERS = [
    { code: 'DIRTFREE50', description: 'Flat ₹50 off on your first booking', discount: 50 },
    { code: 'FESTIVE100', description: 'Special ₹100 off on deep cleaning', discount: 100 },
    { code: 'CLEAN20', description: '₹20 off on regular cleaning', discount: 20 },
  ];

  if (loading) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#0E1220" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="flex-row items-center gap-4 px-6 pt-2 pb-4">
        <Pressable onPress={back} className="h-10 w-10 rounded-2xl bg-white items-center justify-center" style={LUMEN_SHADOW}>
          <ArrowLeft size={18} color="#0E1220" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-[10px] text-muted font-bold uppercase tracking-[2px]">Step {step + 1} of 3</Text>
          <Text className="text-[18px] font-bold text-fg">{["Customize", "Schedule", "Review & pay"][step]}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View className="flex-row gap-2 px-6 mb-4">
        {[0, 1, 2].map((i) => (
          <View key={i} className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: i <= step ? "#0E1220" : "#E7E8EC" }} />
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Service Summary Card */}
        <Animated.View entering={FadeIn.duration(400)} className="flex-row gap-4 bg-white rounded-[32px] p-4 mb-8" style={LUMEN_SHADOW}>
          <Image 
            source={service?.img || { uri: service?.imageUrl || 'https://via.placeholder.com/150' }} 
            className="w-20 h-20 rounded-2xl" 
          />
          <View className="flex-1 justify-center">
            <Text className="text-[16px] font-bold text-fg">{service?.title || service?.name}</Text>
            <Text className="text-[12px] text-muted mb-1">{service?.tagline || "Professional cleaning service"}</Text>
            <Text className="text-[16px] font-bold text-fg">₹{service?.price}</Text>
          </View>
        </Animated.View>

        {step === 0 && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text className="text-[14px] font-bold text-fg mb-3 ml-1">Frequency</Text>
            <View className="flex-row gap-3 mb-8">
              {FREQUENCIES.map((f) => (
                <Pressable 
                  key={f.id} 
                  onPress={() => setFrequency(f.id)}
                  className={`flex-1 h-12 rounded-2xl items-center justify-center border ${frequency === f.id ? 'bg-fg border-fg' : 'bg-white border-gray-100'}`}
                  style={frequency !== f.id ? LUMEN_SHADOW : {}}
                >
                  <Text className={`text-[13px] font-bold ${frequency === f.id ? 'text-white' : 'text-muted'}`}>{f.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text className="text-[14px] font-bold text-fg mb-3 ml-1">Number of Sessions</Text>
            <View className="flex-row items-center justify-between bg-white rounded-3xl px-6 py-4 mb-8" style={LUMEN_SHADOW}>
              <View>
                <Text className="text-[15px] font-bold text-fg">Total Sessions</Text>
                <Text className="text-[11px] text-blue-600 font-bold">1 Session = 30 Minutes</Text>
              </View>
              <View className="flex-row items-center gap-5">
                <Pressable onPress={() => setQty(Math.max(1, qty - 1))} className="h-10 w-10 rounded-full bg-gray-50 items-center justify-center">
                  <Minus size={16} color="#0E1220" />
                </Pressable>
                <Text className="text-[18px] font-bold text-fg w-6 text-center">{qty}</Text>
                <Pressable onPress={() => setQty(qty + 1)} className="h-10 w-10 rounded-full bg-fg items-center justify-center">
                  <Plus size={16} color="#fff" />
                </Pressable>
              </View>
            </View>

            <Text className="text-[14px] font-bold text-fg mb-3 ml-1">Add-ons</Text>
            {ADDONS.map((a) => {
              const on = addons.includes(a.id);
              return (
                <Pressable 
                  key={a.id} 
                  onPress={() => setAddons(on ? addons.filter(x => x !== a.id) : [...addons, a.id])} 
                  className="flex-row items-center bg-white rounded-3xl px-5 py-4 mb-3" 
                  style={LUMEN_SHADOW}
                >
                  <View className={`h-6 w-6 rounded-lg mr-4 items-center justify-center ${on ? 'bg-fg' : 'bg-gray-100'}`}>
                    {on && <Check size={14} color="#fff" />}
                  </View>
                  <Text className="flex-1 text-[14px] font-semibold text-fg">{a.label}</Text>
                  <Text className="text-[14px] font-bold text-success">+₹{a.price}</Text>
                </Pressable>
              );
            })}
          </Animated.View>
        )}

        {step === 1 && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text className="text-[14px] font-bold text-fg mb-4 ml-1">Pick a date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 10 }}>
              {dates.map((d, i) => {
                const on = d.toDateString() === date.toDateString();
                const isToday = d.toDateString() === new Date().toDateString();
                const day = d.toLocaleDateString('en-US', { weekday: 'short' });
                const num = d.getDate();

                // Check if all slots for today have passed
                const currentHour = new Date().getHours();
                const lastSlotHour = 19; // 7:00 PM is 19:00
                const allSlotsPassed = isToday && (currentHour >= lastSlotHour);

                return (
                  <Pressable 
                    key={i} 
                    onPress={() => setDate(d)} 
                    disabled={isUrgent || (allSlotsPassed && !isUrgent)}
                    className={`rounded-[24px] w-20 py-4 items-center border ${on ? 'bg-fg border-fg' : 'bg-white border-gray-50'} ${(isUrgent || (allSlotsPassed && !isUrgent)) ? 'opacity-30' : 'opacity-100'}`}
                    style={!on ? LUMEN_SHADOW : {}}
                  >
                    <Text className={`text-[11px] font-bold uppercase tracking-wider ${on ? 'text-white/60' : 'text-muted'}`}>{day}</Text>
                    <Text className={`text-[20px] font-bold mt-1 ${on ? 'text-white' : 'text-fg'}`}>{num}</Text>
                    {allSlotsPassed && !isUrgent && <Text className="text-[8px] text-red-500 font-bold">FULL</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text className="text-[14px] font-bold text-fg mt-8 mb-4 ml-1">Available time slots</Text>
            <View className="flex-row flex-wrap gap-3">
              {SLOTS.map((s) => {
                const on = s === slot;
                const isToday = date.toDateString() === new Date().toDateString();
                
                // Parse slot time (e.g., "10:00 AM") to 24h format
                const [time, period] = s.split(' ');
                let hour = parseInt(time.split(':')[0]);
                if (period === 'PM' && hour !== 12) hour += 12;
                if (period === 'AM' && hour === 12) hour = 0;
                
                const currentHour = new Date().getHours();
                // Disable slot if it's today and time has passed (give 1 hour buffer)
                const isPassed = isToday && (currentHour >= hour - 1);

                return (
                  <Pressable 
                    key={s} 
                    onPress={() => !isPassed && setSlot(s)} 
                    disabled={isUrgent || isPassed}
                    className={`rounded-2xl px-4 py-4 items-center border ${on ? 'bg-fg border-fg' : 'bg-white border-gray-50'} ${(isUrgent || isPassed) ? 'opacity-30' : 'opacity-100'}`}
                    style={[{ width: '31%' }, !on && LUMEN_SHADOW]}
                  >
                    <Text className={`text-[12px] font-bold ${on ? 'text-white' : 'text-fg'}`}>{s}</Text>
                    {isPassed && !isUrgent && <Text className="text-[8px] text-red-500 font-black mt-1">PASSED</Text>}
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-10 p-5 bg-blue-50 rounded-3xl flex-row gap-4 items-center">
              <Clock size={20} color="#3B6BFF" />
              <Text className="text-[13px] text-blue-700 font-medium flex-1">Our professionals will arrive within 30 mins of your selected slot.</Text>
            </View>

            {/* Quick/Urgent Booking Option */}
            <Pressable 
              onPress={() => {
                const newUrgent = !isUrgent;
                setIsUrgent(newUrgent);
                if (newUrgent) {
                  setDate(new Date()); // Set to today if urgent
                }
              }}
              className={`mt-6 p-6 rounded-[32px] border-2 flex-row items-center gap-4 ${isUrgent ? 'bg-fg border-fg' : 'bg-orange-50 border-orange-100'}`}
              style={!isUrgent ? LUMEN_SHADOW : {}}
            >
              <View className={`h-14 w-14 rounded-2xl items-center justify-center ${isUrgent ? 'bg-white/20' : 'bg-orange-100'}`}>
                <Sparkles size={24} color={isUrgent ? "#fff" : "#EA580C"} />
              </View>
              <View className="flex-1">
                <Text className={`text-[16px] font-bold ${isUrgent ? 'text-white' : 'text-fg'}`}>Quick Service (Urgent)</Text>
                <Text className={`text-[12px] font-medium mt-0.5 ${isUrgent ? 'text-white/70' : 'text-muted'}`}>Arrives within 30 mins • +₹{URGENT_FEE}</Text>
              </View>
              <View className={`h-6 w-6 rounded-full border-2 items-center justify-center ${isUrgent ? 'bg-white border-white' : 'border-orange-200'}`}>
                {isUrgent && <Check size={14} color="#000" strokeWidth={3} />}
              </View>
            </Pressable>
          </Animated.View>
        )}

        {step === 2 && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <View className="flex-row items-center gap-4 bg-white rounded-3xl p-4 mb-8" style={LUMEN_SHADOW}>
              <View className="h-12 w-12 rounded-full bg-success/10 items-center justify-center">
                <ShieldCheck size={24} color="#22C58A" />
              </View>
              <View className="flex-1">
                <Text className="text-[14px] font-bold text-fg">Service Guarantee</Text>
                <Text className="text-[11px] text-muted">Free re-cleaning if not satisfied</Text>
              </View>
            </View>

            <Text className="text-[14px] font-bold text-fg mb-4 ml-1">Payment Method</Text>
            <View className="flex-row flex-wrap gap-3 mb-8">
              {["UPI", "Card", "Cash", "Wallet"].map((p) => {
                const on = p === pay;
                return (
                  <Pressable 
                    key={p} 
                    onPress={() => setPay(p)} 
                    className={`rounded-2xl py-4 items-center border ${on ? 'bg-fg border-fg' : 'bg-white border-gray-50'}`}
                    style={[{ width: '48%' }, !on && LUMEN_SHADOW]}
                  >
                    <Text className={`text-[14px] font-bold ${on ? 'text-white' : 'text-fg'}`}>{p}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className="text-[14px] font-bold text-fg mb-4 ml-1">Review & Discounts</Text>
            <Pressable 
              onPress={() => setIsCouponModalVisible(true)}
              className={`flex-row items-center bg-white rounded-3xl p-5 mb-6 border ${couponCode ? 'border-success' : 'border-transparent'}`}
              style={LUMEN_SHADOW}
            >
              <View className={`h-12 w-12 rounded-2xl items-center justify-center ${couponCode ? 'bg-success/10' : 'bg-gray-100'}`}>
                <Ionicons name="pricetag" size={24} color={couponCode ? "#22C58A" : "#64748b"} />
              </View>
              <View className="flex-1 ml-4">
                <Text className="text-[15px] font-bold text-fg">{couponCode ? `Applied: ${couponCode}` : 'Apply Coupon'}</Text>
                <Text className="text-[12px] text-muted">{couponCode ? `You saved ₹${discount}!` : 'Check available offers'}</Text>
              </View>
              {couponCode ? (
                <Pressable onPress={removeCoupon}>
                  <Text className="text-red-500 font-bold text-[13px]">Remove</Text>
                </Pressable>
              ) : (
                <ChevronRight size={20} color="#9ca3af" />
              )}
            </Pressable>

            <Text className="text-[14px] font-bold text-fg mb-4 ml-1">Payment Summary</Text>
            <View className="bg-white rounded-[32px] p-6 mb-8" style={LUMEN_SHADOW}>
              <Row label="Item Total" value={`₹${subtotal}`} />
              <Row label="Service Fee" value={`₹${FIXED_SERVICE_FEE}`} />
              {isUrgent && <Row label="Urgent Handling" value={`₹${URGENT_FEE}`} color="#EA580C" />}
              <Row label="GST (18%)" value={`₹${gstAmount.toFixed(2)}`} />
              {discount > 0 && <Row label="Discount" value={`-₹${discount}`} color="#22C58A" />}
              <View className="h-px bg-gray-100 my-4" />
              <View className="flex-row justify-between items-center">
                <Text className="text-[18px] font-bold text-fg">Grand Total</Text>
                <Text className="text-[20px] font-black text-fg">₹{finalTotal.toFixed(2)}</Text>
              </View>
              <View className="flex-row items-center bg-blue-50/50 p-3 rounded-2xl mt-4 border border-blue-100">
                <Sparkles size={16} color="#3B6BFF" />
                <Text className="text-[11px] text-blue-700 font-bold ml-2">Secure payment with DirtFree Protection</Text>
              </View>
            </View>

            <Text className="text-[14px] font-bold text-fg mb-4 ml-1">Selected Address</Text>
            <View className="bg-white rounded-3xl p-5 mb-8 flex-row items-center gap-4" style={LUMEN_SHADOW}>
              <View className="h-10 w-10 rounded-full bg-fg/5 items-center justify-center">
                <Ionicons name="location" size={20} color="#0E1220" />
              </View>
              <Text className="flex-1 text-[13px] text-muted font-medium" numberOfLines={2}>
                {address || profile?.selectedAddress || 'Add your address in profile'}
              </Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Sticky Footer Button */}
      <View className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-50">
        <Pressable 
          onPress={step === 2 ? handleConfirm : next} 
          disabled={isBooking}
          className={`bg-fg h-16 rounded-[24px] flex-row items-center justify-center gap-3 ${isBooking ? 'opacity-70' : 'opacity-100'}`}
          style={LUMEN_SHADOW}
        >
          {isBooking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text className="text-white font-bold text-[16px]">
                {step === 2 ? `Pay ₹${finalTotal.toFixed(2)}` : "Continue"}
              </Text>
              <ChevronRight size={20} color="#fff" />
            </>
          )}
        </Pressable>
      </View>

      {/* Success Modal */}
      <Modal visible={done} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/60 px-8">
          <Animated.View entering={ZoomIn.duration(400)} className="bg-white rounded-[40px] p-8 items-center w-full">
            <View className="h-20 w-20 rounded-full bg-success/20 items-center justify-center mb-6">
              <CheckCircle2 size={40} color="#22C58A" />
            </View>
            <Text className="text-[24px] font-bold text-fg text-center">Booking Confirmed!</Text>
            <Text className="text-[14px] text-muted text-center mt-2 mb-8">
              We've assigned a top-rated pro for your {service?.title || service?.name || 'service'}. 
              {isUrgent 
                ? "\nThey will arrive within 30-45 minutes." 
                : `\nScheduled for ${date.toDateString().split(' ').slice(1, 3).join(' ')} at ${slot}.`
              }
            </Text>
            <Pressable 
              onPress={() => { setDone(false); router.replace("/(tabs)/bookings"); }} 
              className="bg-fg rounded-3xl h-14 w-full items-center justify-center"
            >
              <Text className="text-white font-bold text-[15px]">View My Bookings</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

      {/* Coupons Modal */}
      <Modal visible={isCouponModalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <Pressable className="flex-1" onPress={() => setIsCouponModalVisible(false)} />
          <Animated.View entering={FadeInDown} className="bg-white rounded-t-[40px] p-8 min-h-[400px]">
            <View className="w-12 h-1.5 bg-gray-100 rounded-full self-center mb-6" />
            <Text className="text-[22px] font-black text-fg mb-6">Available Offers</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {AVAILABLE_OFFERS.map((offer) => (
                <Pressable 
                  key={offer.code}
                  onPress={() => applyCoupon(offer.code, offer.discount)}
                  className="flex-row items-center bg-gray-50 rounded-3xl p-5 mb-4 border border-gray-100"
                >
                  <View className="flex-1">
                    <View className="bg-success/10 self-start px-3 py-1 rounded-lg mb-2">
                      <Text className="text-success font-black text-[12px]">{offer.code}</Text>
                    </View>
                    <Text className="text-[14px] font-bold text-fg">{offer.description}</Text>
                  </View>
                  <View className="h-10 w-10 rounded-full bg-white items-center justify-center" style={LUMEN_SHADOW}>
                    <ChevronRight size={20} color="#0E1220" />
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View className="flex-row justify-between py-2">
      <Text className="text-[14px] text-muted font-bold">{label}</Text>
      <Text className="text-[14px] font-black" style={{ color: color || "#0E1220" }}>{value}</Text>
    </View>
  );
}
