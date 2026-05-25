import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { 
  ArrowLeft, 
  CreditCard, 
  IndianRupee,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Receipt
} from 'lucide-react-native';

const LUMEN_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 10 },
  elevation: 5,
};

interface Payment {
  id: string;
  amount: number;
  status: string;
  method: string;
  service: string;
  date: any;
  bookingId: string;
}

export default function PaymentsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    if (!profile?.uid) {
      setLoading(false);
      return;
    }
    try {
      const q = query(
        collection(db, 'bookings'),
        where('userId', '==', profile.uid),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(d => {
        const booking = d.data();
        return {
          id: d.id,
          amount: booking.totalPrice || booking.price || 0,
          status: booking.paymentStatus || (booking.status === 'completed' ? 'paid' : 'pending'),
          method: booking.paymentMethod || 'Cash',
          service: booking.serviceName || booking.service || 'Service',
          date: booking.createdAt,
          bookingId: d.id,
        } as Payment;
      });
      setPayments(data);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'completed':
        return <CheckCircle2 size={16} color="#10b981" />;
      case 'failed':
      case 'refunded':
        return <XCircle size={16} color="#ef4444" />;
      default:
        return <Clock size={16} color="#f59e0b" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'completed':
        return '#10b981';
      case 'failed':
      case 'refunded':
        return '#ef4444';
      default:
        return '#f59e0b';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="px-6 pt-4 pb-6 flex-row items-center gap-4">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="h-12 w-12 rounded-2xl bg-white items-center justify-center border border-gray-100"
            style={LUMEN_SHADOW}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#000" />
          </TouchableOpacity>
          <Text className="text-[28px] font-bold text-black tracking-tight">Payments</Text>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#111827" size="large" />
          </View>
        ) : (
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            {/* Summary Card */}
            <Animated.View entering={FadeInDown.duration(600)} className="mx-6 mb-8">
              <View 
                className="bg-[#0E1220] rounded-[36px] p-8 overflow-hidden"
                style={LUMEN_SHADOW}
              >
                <View className="flex-row items-center gap-2 mb-4">
                  <View className="h-8 w-8 rounded-full bg-white/10 items-center justify-center">
                    <CreditCard size={16} color="#fff" />
                  </View>
                  <Text className="text-white/50 text-[11px] font-bold uppercase tracking-[3px]">Payment Summary</Text>
                </View>
                <View className="flex-row items-end gap-1 mb-2">
                  <Text className="text-white text-[40px] font-bold tracking-tight">
                    ₹{payments.reduce((sum, p) => sum + (p.status === 'paid' || p.status === 'completed' ? p.amount : 0), 0).toLocaleString('en-IN')}
                  </Text>
                </View>
                <Text className="text-white/40 text-[12px] font-bold">Total amount paid</Text>

                <View className="flex-row mt-6 gap-6">
                  <View>
                    <Text className="text-white/30 text-[10px] font-bold uppercase tracking-wider">Transactions</Text>
                    <Text className="text-white text-[18px] font-bold mt-1">{payments.length}</Text>
                  </View>
                  <View>
                    <Text className="text-white/30 text-[10px] font-bold uppercase tracking-wider">Pending</Text>
                    <Text className="text-amber-400 text-[18px] font-bold mt-1">
                      {payments.filter(p => p.status === 'pending').length}
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Transaction List */}
            <View className="px-6">
              <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-[3px] mb-6 ml-2">
                Recent Transactions
              </Text>

              {payments.length === 0 ? (
                <View className="items-center py-20 opacity-30">
                  <Receipt size={40} color="#64748b" />
                  <Text className="text-[14px] font-bold text-gray-400 mt-4">No payments yet</Text>
                </View>
              ) : (
                payments.map((payment, index) => (
                  <Animated.View 
                    key={payment.id} 
                    entering={FadeInDown.delay(index * 80).duration(500)}
                  >
                    <View
                      className="flex-row items-center mb-4 bg-white p-5 rounded-[28px] border border-gray-50"
                      style={LUMEN_SHADOW}
                    >
                      <View className="h-12 w-12 rounded-2xl bg-gray-50 items-center justify-center">
                        <IndianRupee size={20} color="#111827" />
                      </View>
                      <View className="flex-1 ml-4">
                        <Text className="text-[15px] font-bold text-black" numberOfLines={1}>
                          {payment.service}
                        </Text>
                        <View className="flex-row items-center gap-2 mt-1">
                          {getStatusIcon(payment.status)}
                          <Text 
                            className="text-[11px] font-bold uppercase"
                            style={{ color: getStatusColor(payment.status) }}
                          >
                            {payment.status}
                          </Text>
                          <Text className="text-gray-200 text-[10px]">•</Text>
                          <Text className="text-[11px] text-gray-400 font-bold">{payment.method}</Text>
                        </View>
                      </View>
                      <View className="items-end">
                        <Text className="text-[16px] font-bold text-black">₹{payment.amount}</Text>
                        <Text className="text-[10px] text-gray-400 font-bold mt-1">{formatDate(payment.date)}</Text>
                      </View>
                    </View>
                  </Animated.View>
                ))
              )}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
