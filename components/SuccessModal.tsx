import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

interface SuccessModalProps {
  visible: boolean;
  onClose: () => void;
  bookingDetails?: {
    date: string;
    time: string;
    price: string;
    isAssigned?: boolean;
  };
}

export default function SuccessModal({ visible, onClose, bookingDetails }: SuccessModalProps) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={30} style={StyleSheet.absoluteFill} />
        
        <View style={styles.modalCard}>
          <View style={styles.iconContainer}>
            <View style={styles.iconBg}>
              <Ionicons name="checkmark-sharp" size={40} color="#ffffff" />
            </View>
          </View>
          
          <Text style={styles.title}>Booking Confirmed!</Text>
          <Text style={styles.subtitle}>
            {bookingDetails?.isAssigned 
              ? 'Great news! A partner has been automatically assigned to your service.'
              : 'Your service has been successfully scheduled. We are assigning a partner.'}
          </Text>
          
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{bookingDetails?.date || 'N/A'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Time Slot</Text>
              <Text style={styles.detailValue}>{bookingDetails?.time || 'N/A'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Paid</Text>
              <Text style={styles.detailValueBold}>₹{bookingDetails?.price || '0'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Partner Status</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons 
                  name={bookingDetails?.isAssigned ? "checkmark-circle" : "time-outline"} 
                  size={16} 
                  color={bookingDetails?.isAssigned ? "#006D44" : "#f59e0b"} 
                />
                <Text style={[styles.detailValue, { marginLeft: 4, color: bookingDetails?.isAssigned ? "#006D44" : "#f59e0b" }]}>
                  {bookingDetails?.isAssigned ? 'Partner Assigned' : 'Finding Partner...'}
                </Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Go to My Bookings</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalCard: {
    width: width * 0.85,
    backgroundColor: '#ffffff',
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  iconContainer: {
    marginTop: -60,
    marginBottom: 20,
  },
  iconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#00b167',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: '#ffffff',
    elevation: 5,
    shadowColor: '#00b167',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  detailsCard: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  detailValueBold: {
    fontSize: 16,
    fontWeight: '900',
    color: '#006D44',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  button: {
    width: '100%',
    backgroundColor: '#112e24',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
