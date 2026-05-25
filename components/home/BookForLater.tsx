import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';

export default function BookForLater() {
  const router = useRouter();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Book for Later</Text>
      <Text style={styles.sectionSubtitle}>Select your slot & stay worry-free</Text>
      <View style={styles.bookingRow}>
        <TouchableOpacity 
          style={styles.cardContainer} 
          onPress={() => router.push('/schedule')}
        >
          <LinearGradient
            colors={['#f0fdf4', '#dcfce7']}
            style={styles.bookingCardLarge}
          >
            <View style={styles.bookingCardContent}>
              <Text style={styles.bookingCardTitle}>Schedule Booking</Text>
              <View style={styles.promoBadge}>
                <Text style={styles.promoBadgeText}>UP TO 50% OFF</Text>
              </View>
            </View>
            <Ionicons name="time-outline" size={60} color={Colors.secondary} style={styles.bookingIcon} />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.cardContainer} 
          onPress={() => router.push('/schedule')}
        >
          <LinearGradient
            colors={['#eff6ff', '#dbeafe']}
            style={styles.bookingCardLarge}
          >
            <View style={styles.bookingCardContent}>
              <Text style={styles.bookingCardTitle}>Recurring Booking</Text>
              <View style={[styles.promoBadge, { borderColor: '#bfdbfe' }]}>
                <Text style={[styles.promoBadgeText, { color: '#3b82f6' }]}>SAVE UP TO 30%</Text>
              </View>
            </View>
            <Ionicons name="calendar-outline" size={60} color="#60a5fa" style={styles.bookingIcon} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 4,
    marginBottom: 16,
  },
  bookingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardContainer: {
    width: '48%',
  },
  bookingCardLarge: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  bookingCardContent: {
    zIndex: 1,
  },
  bookingCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    width: '90%',
  },
  promoBadge: {
    backgroundColor: Colors.white,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  promoBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.secondary,
  },
  bookingIcon: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    opacity: 0.6,
  },
});
