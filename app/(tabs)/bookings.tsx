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
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const LUMEN_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 10 },
  elevation: 5,
};

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
            <Animated.View entering={FadeInUp} className="items-center mt-20 opacity-40">
              <View className="h-20 w-20 rounded-full bg-gray-50 items-center justify-center border border-gray-100">
                <Calendar size={32} color="#64748b" />
              </View>
              <Text className="text-[15px] font-bold text-muted mt-6 uppercase tracking-widest text-center">No {activeTab} Bookings Found</Text>
            </Animated.View>
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
    });

    return unsubscribe;
  }, [visible, booking?.id]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    try {
      await addDoc(collection(db, 'bookings', booking.id, 'messages'), {
        text: input,
        senderId: user?.uid,
        senderName: user?.displayName || 'Customer',
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

function BookingCard({ booking, index, onOpenChat }: any) {
  const [expanded, setExpanded] = useState(index === 0);
  const statusStr = (booking?.status || '').toLowerCase();
  const isCompleted = statusStr === 'completed' || statusStr === 'done';
  const isCancelled = statusStr === 'cancelled';

  // Aggressive support for both new top-level schema and legacy nested/different field schemas
  const serviceName = 
    booking?.service || 
    booking?.serviceName || 
    booking?.items?.[0]?.serviceName || 
    booking?.items?.[0]?.title || 
    booking?.items?.[0]?.name || 
    'Service';

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

  return (
    <View className="mb-6">
      <Animated.View 
        entering={FadeInDown.delay(index * 100).duration(800)}
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
                  {booking.workerName || booking.specialist?.name ? (
                    <>
                      <Image source={{ uri: booking.workerImage || booking.specialist?.image || 'https://i.pravatar.cc/150?u=worker' }} className="h-4 w-4 rounded-full" />
                      <Text className="text-[10px] font-bold text-blue-600">{(booking.workerName || booking.specialist?.name).split(' ')[0]}</Text>
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
          <Animated.View entering={FadeInDown.duration(400)} className="px-4 pb-6">
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

            {booking.workerName || booking.specialist?.name || booking.workerId ? (
              <View className="bg-gray-50 rounded-[32px] p-5 flex-row items-center border border-gray-100">
                <View className="relative">
                  <Image 
                    source={{ uri: booking.workerImage || booking.specialist?.image || 'https://i.pravatar.cc/150?u=placeholder' }} 
                    className="h-12 w-12 rounded-full bg-gray-200" 
                  />
                  <View className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`} />
                </View>
                <View className="flex-1 ml-4">
                  <Text className="text-[14px] font-bold text-black">{booking.workerName || booking.specialist?.name}</Text>
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
                      className="h-10 w-10 rounded-full bg-white items-center justify-center border border-gray-100" 
                      style={LUMEN_SHADOW}
                    >
                      <MessageSquare size={18} color="#000" />
                    </Pressable>
                    <Pressable 
                      onPress={() => {
                        if (booking.workerPhone) {
                          Linking.openURL(`tel:${booking.workerPhone}`);
                        } else {
                          alert("Phone number not available");
                        }
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
          </Animated.View>
        )}
      </Animated.View>
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
