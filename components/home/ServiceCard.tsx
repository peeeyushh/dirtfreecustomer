import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

interface ServiceCardProps {
  service: any;
  cardWidth: number;
}

const LOCAL_IMAGES: Record<string, any> = {
  'bathroom_cleaning': require('@/assets/images/bathroom_clean_icon_1777307160436.png'),
  'fridge_cleaning': require('@/assets/images/fridge_cleaning_icon_1777307231310.png'),
  'packing_moving': require('@/assets/images/packing_icon_1777307254394.png'),
  'kitchen_cleaning': require('@/assets/images/kitchen_cleaning_icon_1777307189085.png'),
};

import { useRouter } from 'expo-router';
import { useLocation } from '../../context/LocationContext';
import { Alert } from 'react-native';

export default function ServiceCard({ service, cardWidth }: ServiceCardProps) {
  const router = useRouter();
  
  const imageSource = service.imageUrl 
    ? { uri: service.imageUrl }
    : (service.localImageKey ? LOCAL_IMAGES[service.localImageKey] : service.image);

  return (
    <TouchableOpacity 
      style={[styles.serviceCard, { width: cardWidth }]}
      onPress={() => router.push(`/service/${service.id}`)}
      activeOpacity={0.9}
    >
      <View style={styles.imageWrapper}>
        {imageSource ? (
          <Image 
            source={typeof imageSource === 'string' ? { uri: imageSource } : imageSource} 
            style={styles.image} 
            resizeMode="cover" 
          />
        ) : (
          <View style={[styles.image, { backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name={service.icon || 'construct-outline'} size={32} color={Colors.primary} />
          </View>
        )}
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={10} color={Colors.warning} />
          <Text style={styles.ratingText}>{service.rating || '4.5'}</Text>
        </View>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.serviceName} numberOfLines={1}>{service.name}</Text>
        <View style={styles.footer}>
          <Text style={styles.priceText}>₹{service.price || '49'}</Text>
          <View style={styles.bookBtn}>
            <Text style={styles.bookBtnText}>Book</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  serviceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  imageWrapper: {
    width: '100%',
    height: 120,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.text,
    marginLeft: 2,
  },
  content: {
    padding: 12,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '800',
  },
  bookBtn: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  bookBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
});
