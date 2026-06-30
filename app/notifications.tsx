import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { 
  ArrowLeft, 
  Bell, 
  Package, 
  Percent, 
  ShieldCheck, 
  Circle,
  Zap,
  Trash2
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInRight, Layout } from 'react-native-reanimated';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LUMEN_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 10 },
  elevation: 5,
};

interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  type: string;
  createdAt: number;
  userId: string;
  unread?: boolean;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'booking':
      return <Package size={20} color="#3B6BFF" />;
    case 'offer':
      return <Percent size={20} color="#f59e0b" />;
    case 'update':
      return <ShieldCheck size={20} color="#22C58A" />;
    case 'alert':
    default:
      return <Zap size={20} color="#6366f1" />;
  }
};

const formatRelativeTime = (timestamp: any) => {
  if (!timestamp) return 'Just now';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (isNaN(date.getTime())) return 'Just now';
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  // 1. Load read & deleted notifications from AsyncStorage
  useEffect(() => {
    const loadCache = async () => {
      try {
        const [storedRead, storedDeleted] = await Promise.all([
          AsyncStorage.getItem('read_notifications'),
          AsyncStorage.getItem('deleted_notifications'),
        ]);
        if (storedRead) setReadIds(JSON.parse(storedRead));
        if (storedDeleted) setDeletedIds(JSON.parse(storedDeleted));
      } catch (e) {
        console.error("Cache load error:", e);
      }
    };
    loadCache();
  }, []);

  // 2. Real-time Firebase Firestore listener
  useEffect(() => {
    if (!profile?.uid) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allNotifs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as NotificationItem[];

      // Filter in-memory: user's personal notifications OR broadcast announcements
      const userNotifs = allNotifs.filter(
        (n) => (n.userId === profile.uid || n.userId === 'all') && !deletedIds.includes(n.id)
      );

      // Map unread status
      const mapped = userNotifs.map(n => ({
        ...n,
        unread: !readIds.includes(n.id)
      }));

      setNotifications(mapped);
      setLoading(false);
    }, (error) => {
      console.error("Firestore notifications listen error:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [profile?.uid, readIds, deletedIds]);

  // 3. Mark all as read
  const markAllRead = async () => {
    try {
      const newReadIds = [...new Set([...readIds, ...notifications.map(n => n.id)])];
      setReadIds(newReadIds);
      await AsyncStorage.setItem('read_notifications', JSON.stringify(newReadIds));
    } catch (e) {
      console.error(e);
    }
  };

  // 4. Delete notification
  const deleteNotification = async (id: string) => {
    try {
      const newDeletedIds = [...deletedIds, id];
      setDeletedIds(newDeletedIds);
      await AsyncStorage.setItem('deleted_notifications', JSON.stringify(newDeletedIds));
    } catch (e) {
      console.error(e);
    }
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

        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#111827" />
          </View>
        ) : (
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
        )}
      </SafeAreaView>
    </View>
  );
}

function NotificationRow({ item, onDelete, delay }: any) {
  return (
    <View entering={FadeInRight.delay(delay)}
      className="mb-4 mx-6"
    >
      <Pressable 
        className={`flex-row p-5 rounded-[32px] border ${item.unread ? 'bg-blue-50/30 border-blue-100' : 'bg-white border-gray-50'}`}
        style={!item.unread ? LUMEN_SHADOW : {}}
      >
        <View className="h-12 w-12 rounded-2xl bg-white items-center justify-center shadow-sm">
           {getNotificationIcon(item.type)}
        </View>
        
        <View className="flex-1 ml-4 mr-2">
           <View className="flex-row items-center justify-between mb-1 text-wrap pr-1">
              <Text className={`text-[15px] font-bold flex-1 mr-2 ${item.unread ? 'text-black' : 'text-slate-700'}`}>{item.title}</Text>
              <Text className="text-[10px] text-muted font-bold uppercase tracking-wider">{formatRelativeTime(item.createdAt)}</Text>
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
    </View>
  );
}
