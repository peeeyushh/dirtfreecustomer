import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

interface HomeHeaderProps {
  userLocation: string;
  topInset: number;
  isScrolled: boolean;
}

export default function HomeHeader({ userLocation, topInset, isScrolled }: HomeHeaderProps) {
  const router = useRouter();
  const { profile } = useAuth();

  return (
    <View style={[
      styles.header, 
      { 
        paddingTop: topInset + 10,
        backgroundColor: Colors.background,
      }
    ]}>
      {/* Top Row: Profile, Greeting, Location, Notification */}
      <View style={styles.topRow}>
        <View style={styles.leftSide}>
          <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/profile')}>
            {profile?.profileImage ? (
              <Image 
                source={{ uri: profile.profileImage }} 
                style={styles.profileImg} 
                contentFit="cover"
              />
            ) : (
              <View style={styles.profileCircle}>
                <Text style={styles.profileText}>{profile?.firstName?.charAt(0) || 'P'}</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.greetingCol}>
            <Text style={styles.greetingLabel}>Good morning</Text>
            <Text style={styles.greetingName}>{profile?.firstName || 'Piyush'} 👋</Text>
          </View>
        </View>

        <View style={styles.rightSide}>
          <TouchableOpacity style={styles.locationPill} onPress={() => router.push('/addresses')}>
            <Ionicons name="location-sharp" size={12} color="#3b82f6" />
            <Text style={styles.locationText} numberOfLines={1}>{userLocation.split(',')[0]}</Text>
            <Ionicons name="chevron-down" size={10} color="#94a3b8" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.notificationBtn}>
            <Ionicons name="notifications-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Row: Search Input + AI Button */}
      <Animated.View entering={FadeInDown.delay(200)} style={styles.searchRow}>
        <TouchableOpacity style={styles.searchContainer} activeOpacity={1}>
          <Ionicons name="search-outline" size={20} color="#94a3b8" />
          <Text style={styles.searchPlaceholder}>Try 'deep cleaning tomorrow at 9am'</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.aiButton} onPress={() => router.push('/ai-assistant')}>
          <Ionicons name="sparkles" size={16} color="#fff" />
          <Text style={styles.aiText}>AI</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  leftSide: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  profileBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  profileImg: { width: 44, height: 44, borderRadius: 22 },
  profileCircle: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  profileText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  greetingCol: { justifyContent: 'center' },
  greetingLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  greetingName: { fontSize: 16, fontWeight: '900', color: Colors.primary, letterSpacing: -0.5 },
  
  rightSide: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 15, gap: 5, maxWidth: 120, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  locationText: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  notificationBtn: { width: 40, height: 40, borderRadius: 15, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },

  searchRow: { flexDirection: 'row', gap: 10 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', height: 50, borderRadius: 15, paddingHorizontal: 15, gap: 10, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  searchPlaceholder: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  
  aiButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#111827', 
    paddingHorizontal: 15, 
    borderRadius: 25, 
    gap: 4, 
    height: 50,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3
  },
  aiText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
});
