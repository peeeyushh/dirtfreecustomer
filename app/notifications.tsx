import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { 
  ArrowLeft, 
  Bell, 
  Package, 
  Percent, 
  ShieldCheck, 
  ChevronRight,
  MoreVertical,
  Circle,
  Zap,
  Trash2
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import Animated, { FadeInDown, FadeInRight, Layout } from 'react-native-reanimated';

const LUMEN_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 10 },
  elevation: 5,
};

const NOTIFICATIONS = [
  {
    id: '1',
    title: 'Booking Confirmed!',
    desc: 'Your Deep Home Cleaning is scheduled for tomorrow at 10:00 AM.',
    type: 'booking',
    time: '2m ago',
    unread: true,
    icon: <Package size={20} color="#3B6BFF" />
  },
  {
    id: '2',
    title: '50% OFF Special',
    desc: 'Flash sale on all Salon services! Only valid for the next 3 hours.',
    type: 'offer',
    time: '1h ago',
    unread: true,
    icon: <Percent size={20} color="#f59e0b" />
  },
  {
    id: '3',
    title: 'Verified Partner Arrived',
    desc: 'Your AC technician, Amit Kumar, has arrived at your location.',
    type: 'update',
    time: '3h ago',
    unread: false,
    icon: <ShieldCheck size={20} color="#22C58A" />
  },
  {
    id: '4',
    title: 'New Service Alert!',
    desc: 'We just launched Premium Kitchen Deep Cleaning. Check it out now.',
    type: 'alert',
    time: 'Yesterday',
    unread: false,
    icon: <Zap size={20} color="#6366f1" />
  }
];

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(NOTIFICATIONS);

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />
      
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="px-8 pt-4 pb-6 border-b border-gray-50">
           <View className="flex-row items-center justify-between mb-2">
              <Pressable 
                onPress={() => router.back()}
                className="h-12 w-12 rounded-2xl bg-white items-center justify-center border border-gray-100"
                style={LUMEN_SHADOW}
              >
                <ArrowLeft size={20} color="#000" />
              </Pressable>
              <Pressable onPress={markAllRead}>
                 <Text className="text-[12px] font-bold text-blue-600">MARK ALL READ</Text>
              </Pressable>
           </View>
           <Text className="text-[32px] font-bold text-black tracking-tight mt-4">Notifications</Text>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {notifications.length > 0 ? (
            <View className="pt-8">
              {notifications.map((item, idx) => (
                <NotificationRow 
                  key={item.id} 
                  item={item} 
                  onDelete={() => deleteNotification(item.id)}
                  delay={idx * 100}
                />
              ))}
            </View>
          ) : (
            <View className="items-center mt-32 opacity-30 px-10">
               <View className="h-24 w-24 rounded-full bg-gray-50 items-center justify-center border border-gray-100">
                  <Bell size={40} color="#64748b" />
               </View>
               <Text className="text-[18px] font-bold text-black mt-8 text-center">All caught up!</Text>
               <Text className="text-[13px] text-muted font-medium mt-2 text-center">
                 Check back later for bookings, offers, and app updates.
               </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function NotificationRow({ item, onDelete, delay }: any) {
  return (
    <Animated.View 
      layout={Layout.springify()}
      entering={FadeInRight.delay(delay)}
      className="mb-4 mx-6"
    >
      <Pressable 
        className={`flex-row p-5 rounded-[32px] border ${item.unread ? 'bg-blue-50/30 border-blue-100' : 'bg-white border-gray-50'}`}
        style={!item.unread ? LUMEN_SHADOW : {}}
      >
        <View className="h-12 w-12 rounded-2xl bg-white items-center justify-center shadow-sm">
           {item.icon}
        </View>
        
        <View className="flex-1 ml-4 mr-2">
           <View className="flex-row items-center justify-between mb-1">
              <Text className={`text-[15px] font-bold ${item.unread ? 'text-black' : 'text-slate-700'}`}>{item.title}</Text>
              <Text className="text-[10px] text-muted font-bold uppercase tracking-wider">{item.time}</Text>
           </View>
           <Text className="text-[13px] text-muted font-medium leading-5" numberOfLines={2}>
             {item.desc}
           </Text>
           
           <View className="flex-row items-center justify-between mt-4">
              <View className="flex-row items-center gap-2">
                 {item.unread && (
                   <View className="flex-row items-center gap-1.5">
                      <Circle size={8} color="#3B6BFF" fill="#3B6BFF" />
                      <Text className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">New</Text>
                   </View>
                 )}
              </View>
              <Pressable onPress={onDelete} className="h-8 w-8 rounded-full items-center justify-center">
                 <Trash2 size={14} color="#ef4444" opacity={0.5} />
              </Pressable>
           </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
