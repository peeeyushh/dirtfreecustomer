import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Image, ActivityIndicator, RefreshControl, Linking, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  ChevronRight, 
  Star, 
  ShieldCheck, 
  Phone, 
  Search, 
  MessageSquare,
  Sparkles,
  CheckCircle2,
  X,
  Send
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

const LUMEN_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 10 },
  elevation: 5,
};

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

// Decode Google Maps encoded polyline string into array of lat/lng coordinates
function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0, lat = 0, lng = 0;

  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

export default function BookingsScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Upcoming');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'bookings'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedBookings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBookings(fetchedBookings);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error("Fetch bookings error:", error);
      setLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  }, [user]);

  const filteredBookings = bookings.filter(b => {
    const status = b.status?.toLowerCase();
    if (activeTab === 'All') return true;
    if (activeTab === 'Upcoming') {
      return status !== 'completed' && status !== 'cancelled' && status !== 'done';
    }
    if (activeTab === 'Completed') {
      return status === 'completed' || status === 'done';
    }
    if (activeTab === 'Cancelled') {
      return status === 'cancelled';
    }
    return true;
  });

  const fetchBookings = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Data is already handled by onSnapshot, so we just toggle refreshing for UX
      // but we can also manually re-trigger if needed. 
      // For now, let's just make sure it stops.
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    // Safety timeout: stop spinning after 5 seconds regardless
    setTimeout(() => {
      setRefreshing(false);
    }, 5000);
    
    // In onSnapshot based apps, the data updates automatically, 
    // so pull-to-refresh is mostly visual or for forcing a sync.
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="px-8 pt-4 pb-4">
          <Text className="text-[32px] font-bold text-black tracking-tight">Bookings</Text>
          <Text className="text-[13px] text-muted font-medium mt-1">Your service history</Text>
        </View>

        <View className="mb-6">
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={{ paddingHorizontal: 28, gap: 10 }}
          >
            {['All', 'Upcoming', 'Completed', 'Cancelled'].map((tab) => (
              <Pressable 
                key={tab} 
                onPress={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-full border ${activeTab === tab ? 'bg-black border-black' : 'bg-white border-gray-100'}`}
                style={activeTab === tab ? LUMEN_SHADOW : {}}
              >
                <Text className={`text-[12px] font-bold ${activeTab === tab ? 'text-white' : 'text-black'}`}>{tab}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <ScrollView 
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B6BFF" />
          }
        >
          {loading ? (
            <View className="mt-20">
              <ActivityIndicator color="#3B6BFF" />
            </View>
          ) : filteredBookings.length > 0 ? (
            filteredBookings.map((booking, idx) => (
              <BookingCard 
                key={booking.id} 
                booking={booking} 
                index={idx} 
                onOpenChat={(b: any) => {
                  setSelectedBooking(b);
                  setIsChatOpen(true);
                }}
              />
            ))
          ) : (
            <View className="items-center mt-20 opacity-40">
              <View className="h-20 w-20 rounded-full bg-gray-50 items-center justify-center border border-gray-100">
                <Calendar size={32} color="#64748b" />
              </View>
              <Text className="text-[15px] font-bold text-muted mt-6 uppercase tracking-widest text-center">No {activeTab} Bookings Found</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <ChatModal 
        visible={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        booking={selectedBooking} 
      />
    </View>
  );
}

function ChatModal({ visible, onClose, booking }: any) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (!visible || !booking?.id) return;

    const q = query(
      collection(db, 'bookings', booking.id, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Mark messages from other user as read
      snapshot.docs.forEach(async (d) => {
        const data = d.data();
        if (data.senderId !== user?.uid && data.read === false) {
          try {
            await updateDoc(doc(db, 'bookings', booking.id, 'messages', d.id), {
              read: true
            });
          } catch (err) {
            console.error("Error marking message read by user:", err);
          }
        }
      });
    });

    return unsubscribe;
  }, [visible, booking?.id, user?.uid]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    try {
      await addDoc(collection(db, 'bookings', booking.id, 'messages'), {
        text: input.trim(),
        senderId: user?.uid,
        senderName: user?.displayName || 'Customer',
        read: false,
        createdAt: serverTimestamp()
      });
      setInput('');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
          <Pressable onPress={onClose} className="p-2">
            <X size={24} color="#000" />
          </Pressable>
          <Text className="text-[16px] font-bold text-black">Chat with {booking?.workerName || 'Specialist'}</Text>
          <View className="w-10" />
        </View>

        <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
          {messages.map((m, i) => (
            <View key={i} className={`mb-4 max-w-[80%] ${m.senderId === user?.uid ? 'self-end' : 'self-start'}`}>
              <View className={`p-4 rounded-[24px] ${m.senderId === user?.uid ? 'bg-blue-600 rounded-tr-none' : 'bg-gray-100 rounded-tl-none'}`}>
                <Text className={`text-[14px] ${m.senderId === user?.uid ? 'text-white' : 'text-black'}`}>{m.text}</Text>
              </View>
              <Text className="text-[10px] text-muted mt-1 uppercase tracking-widest">{m.senderName}</Text>
            </View>
          ))}
        </ScrollView>

        <View className="p-6 border-t border-gray-100 flex-row gap-3 items-center">
          <TextInput 
            className="flex-1 bg-gray-50 rounded-full px-6 py-4 text-[14px] font-medium"
            placeholder="Type a message..."
            value={input}
            onChangeText={setInput}
            multiline
          />
          <Pressable 
            onPress={sendMessage}
            className="h-14 w-14 rounded-full bg-blue-600 items-center justify-center shadow-md"
          >
            <Send size={20} color="#fff" />
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const ALL_ADDONS_LOOKUP: Record<string, { label: string; price: number }> = {
  // Cleaning
  fridge: { label: "Fridge interior", price: 199 },
  balcony: { label: "Balcony deep-clean", price: 149 },
  windows: { label: "Window cleaning", price: 99 },
  // AC Repair
  piping: { label: "Extra copper piping (per m)", price: 299 },
  stand: { label: "Outdoor unit stand installation", price: 399 },
  foam: { label: "Foam cleaning booster", price: 199 },
  // Plumbing
  tape: { label: "Teflon tape & washers pack", price: 49 },
  drain: { label: "Drain cleaner chemical", price: 99 },
  coupling: { label: "Sink coupling replacement", price: 149 },
  // Electrician
  switch: { label: "Modular switch replacement", price: 99 },
  wire: { label: "Anchor wire pack (10m)", price: 199 },
  plug: { label: "Heavy duty plug top (16A)", price: 149 },
  // Salon
  facial: { label: "Facial massage booster", price: 299 },
  spa: { label: "Hair spa treatment", price: 399 },
  mask: { label: "Charcoal peel-off mask", price: 149 },
};

function BookingCard({ booking, index, onOpenChat }: any) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(index === 0);
  const statusStr = (booking?.status || '').toLowerCase();
  const isCompleted = statusStr === 'completed' || statusStr === 'done';
  const isCancelled = statusStr === 'cancelled';

  const [partnerLocation, setPartnerLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recurringTasks, setRecurringTasks] = useState<any[]>([]);

  useEffect(() => {
    if (booking.bookingType !== 'recurring') return;
    const q = query(collection(db, 'serviceTasks'), where('bookingId', '==', booking.id));
    const unsub = onSnapshot(q, async (snapshot) => {
      const fetched = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
      fetched.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Fetch partner names for assigned tasks
      for (const t of fetched) {
        if (t.assignedPartnerId && !t.partnerName) {
          try {
            const pDoc = await getDoc(doc(db, 'partners', t.assignedPartnerId));
            if (pDoc.exists()) {
              const pData = pDoc.data();
              t.partnerName = pData.name || `${pData.firstName || ''} ${pData.lastName || ''}`.trim();
            }
          } catch(e) {}
        }
      }
      setRecurringTasks(fetched);
    });
    return unsub;
  }, [booking.id, booking.bookingType]);

  useEffect(() => {
    if (!booking.id || isCompleted || isCancelled || !user?.uid) {
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, 'bookings', booking.id, 'messages')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const count = snapshot.docs.filter(d => {
        const data = d.data();
        return data.senderId !== user.uid && data.read === false;
      }).length;
      setUnreadCount(count);
    });

    return unsub;
  }, [booking.id, isCompleted, isCancelled, user?.uid]);

  useEffect(() => {
    if (!booking.workerId || isCompleted || isCancelled) {
      setPartnerLocation(null);
      return;
    }

    const unsub = onSnapshot(doc(db, 'partners', booking.workerId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.latitude && data.longitude) {
          setPartnerLocation({
            latitude: data.latitude,
            longitude: data.longitude
          });
        }
      }
    });

    return () => unsub();
  }, [booking.workerId, isCompleted, isCancelled]);

  const [customerCoords, setCustomerCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Dynamically geocode customer address if booking doesn't have coordinates
  useEffect(() => {
    if (booking.location?.lat && booking.location?.lng) {
      setCustomerCoords({
        latitude: booking.location.lat,
        longitude: booking.location.lng
      });
      return;
    }

    const geocodeAddress = async () => {
      const addr = booking.userAddress || booking.address;
      if (!addr) return;
      try {
        const results = await Location.geocodeAsync(addr);
        if (results.length > 0) {
          setCustomerCoords({
            latitude: results[0].latitude,
            longitude: results[0].longitude
          });
        }
      } catch (e) {
        console.warn("Geocoding failed inside BookingCard:", e);
      }
    };
    geocodeAddress();
  }, [booking.location, booking.userAddress, booking.address]);

  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
  const [routeEta, setRouteEta] = useState<string | null>(null);

  // Fetch shortest route via Google Maps Directions API (same engine as Google Maps app)
  useEffect(() => {
    if (!partnerLocation || !customerCoords) {
      setRouteCoordinates([]);
      setRouteEta(null);
      return;
    }

    const fetchRoute = async () => {
      try {
        // Use 'bike' profile for shortest urban routes instead of 'driving'
        const url = `http://router.project-osrm.org/route/v1/bike/${partnerLocation.longitude},${partnerLocation.latitude};${customerCoords.longitude},${customerCoords.latitude}?overview=full`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          // Decode OSRM encoded polyline
          const geometry = data.routes[0].geometry;
          const decoded = decodePolyline(geometry);
          setRouteCoordinates(decoded);
          
          // Calculate realistic city ETA based on 25 km/h average speed
          const distanceInKm = data.routes[0].distance / 1000;
          const durationMins = Math.ceil((distanceInKm / 25) * 60);
          setRouteEta(`${durationMins} mins`);
        } else {
          // Fallback to straight line
          setRouteCoordinates([partnerLocation, customerCoords]);
        }
      } catch (e) {
        console.warn("Failed to fetch OSRM route:", e);
        setRouteCoordinates([partnerLocation, customerCoords]);
      }
    };

    fetchRoute();
  }, [partnerLocation, customerCoords]);

  // Aggressive support for both new top-level schema and legacy nested/different field schemas
  const serviceName = 
    booking?.service || 
    booking?.serviceName || 
    booking?.items?.[0]?.serviceName || 
    booking?.items?.[0]?.title || 
    booking?.items?.[0]?.name || 
    'Service';

  // For recurring, find the upcoming task to show its partner
  const upcomingTask = booking.bookingType === 'recurring' 
    ? recurringTasks.find(t => t.status !== 'completed' && t.status !== 'cancelled') 
    : null;
    
  const displayWorkerName = booking.bookingType === 'recurring' && upcomingTask
    ? upcomingTask.partnerName || booking.workerName || booking.specialist?.name
    : booking.workerName || booking.specialist?.name;

  const rawDate = booking?.date || booking?.items?.[0]?.date || 'No Date';
  
  // Format date nicely even if it's ISO or other formats
  const formatDisplayDate = (d: string) => {
    if (!d || d === 'No Date') return d;
    try {
      const parsedDate = new Date(d);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toDateString().toUpperCase();
      }
    } catch (e) {}
    return d.toUpperCase();
  };

  const displayDate = formatDisplayDate(rawDate);
  const displayPrice = booking?.price || booking?.totalPrice || '0';
  const selectedAddons = booking?.items?.[0]?.addons || [];

  return (
    <View className="mb-6">
      <View
        className="bg-white rounded-[40px] overflow-hidden border border-gray-50"
        style={LUMEN_SHADOW}
      >
        <Pressable 
          onPress={() => setExpanded(!expanded)}
          className="p-6"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-4 flex-1">
              <View className={`h-12 w-12 rounded-2xl items-center justify-center border ${isCompleted ? 'bg-green-50 border-green-100' : isCancelled ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
                <Sparkles size={20} color={isCompleted ? '#22C58A' : isCancelled ? '#ef4444' : '#3B6BFF'} />
              </View>
              <View className="flex-1 pr-2">
                <Text className="text-[16px] font-bold text-black" numberOfLines={1}>{serviceName}</Text>
                <View className="flex-row items-center gap-1.5 mt-1">
                  <Clock size={12} color="#64748b" />
                  <Text className="text-[11px] font-bold text-muted uppercase tracking-wider" numberOfLines={1}>
                    {displayDate}
                  </Text>
                </View>
              </View>
            </View>
            
            <View className="items-end pl-2">
              <Text className="text-[18px] font-bold text-black">₹{displayPrice}</Text>
              <View className={`flex-row items-center gap-1 mt-1 px-2 py-0.5 rounded-lg ${isCompleted ? 'bg-green-50' : isCancelled ? 'bg-red-50' : 'bg-blue-50'}`}>
                 <View className={`h-1.5 w-1.5 rounded-full ${isCompleted ? 'bg-green-500' : isCancelled ? 'bg-red-500' : 'bg-blue-500'}`} />
                 <Text className={`text-[9px] font-bold uppercase tracking-tight ${isCompleted ? 'text-green-600' : isCancelled ? 'text-red-600' : 'text-blue-600'}`}>{booking?.status || 'Pending'}</Text>
              </View>
              {!expanded && (
                <View className="mt-2 flex-row items-center gap-1">
                  {displayWorkerName ? (
                    <>
                      <Image source={{ uri: booking.workerImage || booking.specialist?.image || 'https://i.pravatar.cc/150?u=worker' }} className="h-4 w-4 rounded-full" />
                      <Text className="text-[10px] font-bold text-blue-600">{String(displayWorkerName).split(' ')[0]}</Text>
                    </>
                  ) : !isCancelled && !isCompleted ? (
                    <View className="flex-row items-center gap-1">
                      <ActivityIndicator size="small" color="#3B6BFF" style={{ transform: [{ scale: 0.6 }] }} />
                      <Text className="text-[10px] font-bold text-blue-600">Assigning...</Text>
                    </View>
                  ) : null}
                </View>
              )}
            </View>
          </View>
        </Pressable>

        {expanded && (
          <View className="px-4 pb-6">
            {/* Selected Add-ons Section */}
            {selectedAddons && selectedAddons.length > 0 && (
              <View className="mb-5 bg-gray-50 rounded-[28px] p-5 border border-gray-100">
                <Text className="text-[12px] font-bold text-black/40 uppercase tracking-widest mb-3">Included Add-ons</Text>
                {selectedAddons.map((addonId: string) => {
                  const addonInfo = ALL_ADDONS_LOOKUP[addonId];
                  if (!addonInfo) return null;
                  return (
                    <View key={addonId} className="flex-row justify-between items-center py-1">
                      <Text className="text-[13px] text-black font-semibold">• {addonInfo.label}</Text>
                      <Text className="text-[13px] text-success font-bold">+₹{addonInfo.price}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {!isCancelled && (
              <View className="flex-row justify-between items-start my-6">
                <Step 
                  label="Confirmed" 
                  active={statusStr === 'accepted' || statusStr === 'on_the_way' || statusStr === 'arrived' || statusStr === 'started' || isCompleted || booking.statusStep >= 0} 
                />
                <Step 
                  label="On Way" 
                  active={statusStr === 'on_the_way' || statusStr === 'arrived' || statusStr === 'started' || isCompleted || booking.statusStep >= 1} 
                />
                <Step 
                  label="In Progress" 
                  active={statusStr === 'arrived' || statusStr === 'started' || isCompleted || booking.statusStep >= 2} 
                />
                <Step 
                  label="Done" 
                  active={isCompleted || booking.statusStep >= 3} 
                  isLast 
                />
              </View>
            )}

            {booking.bookingType === 'recurring' && recurringTasks.length > 0 ? (
              <View className="bg-gray-50 rounded-[28px] p-5 mb-4 border border-gray-100">
                <Text className="text-[12px] font-bold text-black/40 uppercase tracking-widest mb-4">Subscription Schedule</Text>
                {recurringTasks.map((task, index) => (
                  <View key={task.id} className="flex-row items-center justify-between py-2 border-b border-gray-100/50 last:border-0">
                    <View className="flex-row items-center gap-3">
                      <View className={`h-8 w-8 rounded-full items-center justify-center ${task.status === 'completed' ? 'bg-green-100' : task.assignedPartnerId ? 'bg-blue-100' : 'bg-gray-200'}`}>
                        <Text className={`text-[10px] font-bold ${task.status === 'completed' ? 'text-green-600' : task.assignedPartnerId ? 'text-blue-600' : 'text-gray-500'}`}>{index + 1}</Text>
                      </View>
                      <View>
                        <Text className="text-[13px] font-bold text-black">
                          {task.date ? new Date(task.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Unknown'}
                        </Text>
                        <Text className="text-[10px] text-muted font-medium mt-0.5">
                          {task.status === 'completed' ? 'Completed' : task.assignedPartnerId ? 'Assigned' : 'Searching for partner...'}
                        </Text>
                      </View>
                    </View>
                    <View>
                      {task.partnerName ? (
                        <Text className="text-[12px] font-bold text-blue-600">{task.partnerName.split(' ')[0]}</Text>
                      ) : task.assignedPartnerId ? (
                        <Text className="text-[12px] font-bold text-blue-600">Assigned</Text>
                      ) : (
                        <ActivityIndicator size="small" color="#9CA3AF" />
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {displayWorkerName ? (
              <View className="bg-gray-50 rounded-[32px] p-5 flex-row items-center border border-gray-100">
                <View className="relative">
                  <Image 
                    source={{ uri: booking.workerImage || booking.specialist?.image || 'https://i.pravatar.cc/150?u=placeholder' }} 
                    className="h-12 w-12 rounded-full bg-gray-200" 
                  />
                  <View className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`} />
                </View>
                <View className="flex-1 ml-4">
                  <Text className="text-[14px] font-bold text-black">{displayWorkerName}</Text>
                  <View className="flex-row items-center gap-2 mt-1">
                    <View className="flex-row items-center gap-0.5">
                       <Star size={10} color="#D6A75A" fill="#D6A75A" />
                       <Text className="text-[11px] font-bold text-black">{booking.specialist?.rating || '4.5'}</Text>
                    </View>
                    <Text className="text-[11px] text-muted font-bold uppercase tracking-widest">• Specialist</Text>
                  </View>
                </View>
                {!isCancelled && (
                  <View className="flex-row gap-2">
                    <Pressable 
                      onPress={() => onOpenChat(booking)}
                      className="h-10 w-10 rounded-full bg-white items-center justify-center border border-gray-100 relative" 
                      style={LUMEN_SHADOW}
                    >
                      <MessageSquare size={18} color="#000" />
                      {unreadCount > 0 && (
                        <View className="absolute -top-1 -right-1 bg-red-500 rounded-full h-5 min-w-[20px] px-1.5 items-center justify-center border border-white">
                          <Text className="text-white text-[9px] font-extrabold">{unreadCount}</Text>
                        </View>
                      )}
                    </Pressable>
                    <Pressable 
                      onPress={async () => {
                        const tryCall = (phone: string) => {
                          const cleanPhone = String(phone).replace(/[^0-9+]/g, '');
                          if (!cleanPhone) return false;
                          Linking.openURL(`tel:${cleanPhone}`).catch(err => {
                            console.error("Failed to open dialer:", err);
                            alert("Could not open dialer app");
                          });
                          return true;
                        };

                        // Try booking-level phone first
                        if (booking.workerPhone && tryCall(booking.workerPhone)) return;

                        // Fallback: fetch from partners collection
                        if (booking.workerId) {
                          try {
                            const partnerDoc = await getDoc(doc(db, 'partners', booking.workerId));
                            if (partnerDoc.exists()) {
                              const partnerData = partnerDoc.data();
                              const phone = partnerData?.phone || partnerData?.phoneNumber || '';
                              if (phone && tryCall(phone)) return;
                            }
                          } catch (err) {
                            console.error("Failed to fetch partner phone:", err);
                          }
                        }

                        alert("Phone number not available");
                      }}
                      className="h-10 w-10 rounded-full bg-black items-center justify-center shadow-sm"
                    >
                      <Phone size={18} color="#fff" />
                    </Pressable>
                  </View>
                )}
              </View>
            ) : !isCancelled && !isCompleted ? (
              <View className="bg-blue-50/50 rounded-[32px] p-5 flex-row items-center border border-blue-100">
                <View className="h-12 w-12 rounded-full bg-blue-100 items-center justify-center">
                  <ActivityIndicator color="#3B6BFF" />
                </View>
                <View className="flex-1 ml-4">
                  <Text className="text-[14px] font-bold text-blue-900">Assigning Specialist...</Text>
                  <Text className="text-[11px] text-blue-600/80 font-medium mt-1 leading-4">Finding the best partner for your service</Text>
                </View>
              </View>
            ) : null}

            {/* Real-time Tracking Map (Swiggy-style) - Only visible when partner starts journey (status is 'on_the_way') */}
            {statusStr === 'on_the_way' && booking.workerId && (
              <View className="mt-5 rounded-[32px] overflow-hidden border border-gray-100 shadow-sm" style={{ height: 220 }}>
                {(customerCoords || partnerLocation) ? (
                  <MapView
                    style={{ flex: 1 }}
                    provider={PROVIDER_DEFAULT}
                    initialRegion={{
                      latitude: customerCoords?.latitude || partnerLocation?.latitude || 22.7196,
                      longitude: customerCoords?.longitude || partnerLocation?.longitude || 75.8577,
                      latitudeDelta: 0.05,
                      longitudeDelta: 0.05,
                    }}
                  >
                  {/* Customer Marker (Aesthetic Home) */}
                  {customerCoords && (
                    <Marker
                      coordinate={customerCoords}
                      title="Your Home"
                      description="Cleaning destination"
                    >
                      <View className="h-9 w-9 bg-[#3B6BFF] rounded-full items-center justify-center border-2 border-white shadow-lg">
                        <Ionicons name="home" size={15} color="#fff" />
                      </View>
                    </Marker>
                  )}

                  {/* Partner Live Marker (Dirtfree Sparkle Logo) */}
                  {partnerLocation && (
                    <Marker
                      coordinate={partnerLocation}
                      title={booking.workerName || "Partner"}
                      description="Dirtfree Partner on the way"
                    >
                      <View className="h-10 w-10 bg-[#006D44] rounded-full items-center justify-center border-2 border-white shadow-xl">
                        <Ionicons name="sparkles" size={17} color="#FBBF24" />
                      </View>
                    </Marker>
                  )}
                  {/* Route Polyline (Uber-style solid line via actual roads) */}
                  {/* Underlay glow */}
                  {routeCoordinates.length > 0 && (
                    <Polyline
                      coordinates={routeCoordinates}
                      strokeColor="rgba(59, 107, 255, 0.25)"
                      strokeWidth={8}
                    />
                  )}
                  {/* Foreground solid route */}
                  {routeCoordinates.length > 0 && (
                    <Polyline
                      coordinates={routeCoordinates}
                      strokeColor="#3B6BFF"
                      strokeWidth={4}
                    />
                  )}
                    </MapView>
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
                      <ActivityIndicator color="#3B6BFF" />
                    </View>
                  )}
                {/* Distance + ETA Badge Overlay */}
                {partnerLocation && customerCoords && (
                  <View className="absolute top-3 left-3 bg-black/90 px-4 py-2 rounded-2xl shadow flex-row items-center" style={{ gap: 8 }}>
                    <Ionicons name="navigate" size={14} color="#3B6BFF" />
                    <Text className="text-white text-[11px] font-bold uppercase tracking-wider">
                      {getDistanceKm(partnerLocation.latitude, partnerLocation.longitude, customerCoords.latitude, customerCoords.longitude).toFixed(1)} km{routeEta ? ` • ${routeEta}` : ''}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function Step({ label, active, isLast }: any) {
  return (
    <View className="items-center flex-1 relative px-0.5">
      <View className={`h-6 w-6 rounded-full items-center justify-center z-10 border-2 ${active ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-100'}`}>
        {active && <CheckCircle2 size={10} color="#fff" />}
      </View>
      <Text 
        className={`text-[8px] font-bold mt-2 uppercase tracking-[0.5px] text-center ${active ? 'text-black' : 'text-muted'}`}
        numberOfLines={1}
      >
        {label}
      </Text>
      {!isLast && (
        <View 
          className={`absolute top-3 left-[50%] right-[-50%] h-[1.5px] z-0 ${active ? 'bg-blue-600' : 'bg-gray-100'}`} 
        />
      )}
    </View>
  );
}
