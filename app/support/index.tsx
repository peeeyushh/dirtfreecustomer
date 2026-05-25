import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const PRIMARY_GREEN = '#00b167';

const TOPICS = [
  { id: 'booking', title: 'Booking', subtitle: 'Manage bookings, cancellations, and schedules' },
  { id: 'account', title: 'Account', subtitle: 'Profile, login, and account settings' },
  { id: 'payments', title: 'Payments', subtitle: 'Billing, refunds, and transactions' },
  { id: 'quality', title: 'Service quality', subtitle: 'Feedback, issues, and service standards' },
  { id: 'safety', title: 'Safety', subtitle: 'Security and safety-related concerns' },
];

export default function SupportIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & support</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Refunds Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My refunds</Text>
          <Text style={styles.noRefundsText}>You don't have any refunds</Text>
        </View>

        <View style={styles.divider} />

        {/* Topics Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse all help topics</Text>
          
          {TOPICS.map((topic, index) => (
            <TouchableOpacity 
              key={topic.id}
              style={[styles.topicCard, index === 0 && { marginTop: 16 }]}
              onPress={() => router.push({ pathname: '/support/[topic]', params: { topic: topic.id } })}
            >
              <View style={styles.topicTextContainer}>
                <Text style={styles.topicTitle}>{topic.title}</Text>
                <Text style={styles.topicSubtitle}>{topic.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Footer Call Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.footerText}>Reach out to customer support</Text>
        <TouchableOpacity style={styles.callBtn}>
          <Text style={styles.callBtnText}>Call us</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 60,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  noRefundsText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 8,
  },
  divider: {
    height: 4,
    backgroundColor: '#f8fafc',
  },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  topicTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  topicTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  topicSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: '#ffffff',
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  callBtn: {
    backgroundColor: PRIMARY_GREEN,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});
