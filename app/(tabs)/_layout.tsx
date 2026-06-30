import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter, useSegments, usePathname } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const { width } = Dimensions.get('window');

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom + 10 }]}>
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          let iconName: any = 'home-outline';
          if (route.name === 'index') iconName = isFocused ? 'home' : 'home-outline';
          else if (route.name === 'bookings') iconName = isFocused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'profile') iconName = isFocused ? 'person' : 'person-outline';

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, isFocused && styles.activeIconContainer]}>
                <Ionicons 
                  name={iconName} 
                  size={20} 
                  color={isFocused ? '#fff' : '#94a3b8'} 
                />
              </View>
              {isFocused && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function NotServiceableScreen() {
  const { refreshLocation, loading: locationLoading, address } = useLocation();
  const router = useRouter();

  const handleWhatsAppNotify = async () => {
    try {
      const { city, region } = useLocation();
      // Log the request to Firestore for dashboard insights
      await addDoc(collection(db, 'location_requests'), {
        address: address || 'Unknown Location',
        city: city || 'Unknown City',
        region: region || 'Unknown State',
        timestamp: serverTimestamp(),
        userId: profile?.uid || 'guest'
      });
      require('react-native').Alert.alert("Request Received", "We'll notify you as soon as we launch in your area!");
    } catch (error) {
      console.error("Error logging launch request:", error);
      // Fallback alert if firestore fails
      require('react-native').Alert.alert("Coming Soon", "We'll notify you as soon as we launch in your area!");
    }
  };

  return (
    <View style={styles.comingSoonContainer}>
      {/* Floating glow dots */}
      <View style={styles.comingSoonDots}>
        {[...Array(15)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                top: 50 + Math.random() * 500,
                left: Math.random() * width,
                opacity: 0.08 + Math.random() * 0.15,
                width: 4 + Math.random() * 8,
                height: 4 + Math.random() * 8,
              },
            ]}
          />
        ))}
      </View>

      {/* Accent glow behind text */}
      <View style={styles.glowCircle} />

      <View style={styles.comingSoonContent}>
        {/* Brand badge */}
        <View style={styles.brandBadge}>
          <View style={styles.brandLine} />
          <Text style={styles.brandBadgeText}>PREMIUM LIVING</Text>
        </View>

        <Text style={styles.comingSoonBrand}>DirtFree</Text>

        <Text style={styles.comingSoonWe}>WE ARE</Text>
        <Text style={styles.comingSoonText}>COMING SOON</Text>

        <Text style={styles.comingSoonSubtitle}>
          We're currently live in select areas and{"\n"}expanding quickly. Stay tuned!
        </Text>

        {/* Notify card */}
        <View style={styles.notifyCard}>
          <Text style={styles.notifyCardTitle}>Get notified when we launch near you</Text>
          <TouchableOpacity
            style={styles.notifyButton}
            onPress={handleWhatsAppNotify}
            activeOpacity={0.9}
          >
            <Ionicons name="logo-whatsapp" size={20} color="#0E1220" />
            <Text style={styles.notifyButtonText}>Notify Me</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/location')}
          style={styles.changeLocationBtn}
        >
          <Text style={styles.changeLocationText}>Change location</Text>
        </TouchableOpacity>

        {address && (
          <View style={styles.locationPill}>
            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.3)" />
            <Text style={styles.locationPillText} numberOfLines={1}>{address}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { profile, loading } = useAuth();
  const { isServiceable } = useLocation();
  const router = useRouter();
  const [showNotServiceable, setShowNotServiceable] = useState(false);

  useEffect(() => {
    if (!isServiceable) {
      // Small 1.5s delay to show a checking screen instead of abrupt flash
      const timer = setTimeout(() => setShowNotServiceable(true), 1500);
      return () => clearTimeout(timer);
    } else {
      setShowNotServiceable(false);
    }
  }, [isServiceable]);

  useEffect(() => {
    if (loading) return;

    const hasUid = !!profile?.uid;
    const hasName = !!profile?.firstName;

    if (!hasUid) {
      router.replace('/');
    } else if (!hasName) {
      router.replace('/register');
    }
  }, [profile, loading]);

  if (loading) return null;

  // Block access when user is not in a serviceable area
  if (!isServiceable) {
    if (!showNotServiceable) {
      return (
        <View style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={{ marginTop: 12, fontSize: 14, fontWeight: '600', color: '#666' }}>Checking availability in your area...</Text>
        </View>
      );
    }
    return <NotServiceableScreen />;
  }

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="bookings" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 30,
    height: 70,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  iconContainer: {
    width: 54,
    height: 32,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  activeIconContainer: {
    backgroundColor: '#111827',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.secondary,
    marginTop: 4,
  },

  // Coming Soon Screen — Dark Premium Theme
  comingSoonContainer: {
    flex: 1,
    backgroundColor: '#0E1220',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  comingSoonDots: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  dot: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: '#22C58A',
  },
  glowCircle: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#22C58A',
    opacity: 0.06,
    top: '25%',
  },
  comingSoonContent: {
    alignItems: 'center',
    maxWidth: 340,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  brandLine: {
    width: 24,
    height: 1,
    backgroundColor: '#22C58A',
  },
  brandBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#22C58A',
    letterSpacing: 4,
  },
  comingSoonBrand: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
    marginBottom: 32,
  },
  comingSoonWe: {
    fontSize: 28,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    letterSpacing: 8,
  },
  comingSoonText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#22C58A',
    textAlign: 'center',
    letterSpacing: 3,
    marginBottom: 20,
  },
  comingSoonSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 32,
  },
  notifyCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    marginBottom: 20,
  },
  notifyCardTitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  notifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    width: 'auto',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  notifyButtonText: {
    color: '#0E1220',
    fontSize: 14,
    fontWeight: '800',
  },
  changeLocationBtn: {
    paddingVertical: 10,
    marginBottom: 16,
  },
  changeLocationText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  locationPillText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
    fontWeight: '600',
    maxWidth: 200,
  },
});

