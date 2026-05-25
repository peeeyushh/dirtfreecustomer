import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const { width } = Dimensions.get('window');

// Fallback local banners (used if Firebase fetch fails or collection is empty)
const FALLBACK_BANNERS = [
  { id: '1', title: 'Ready before you cook.', subtitle: 'Get Kitchen Prep in minutes', buttonText: 'BOOK NOW', imageUrl: '' },
  { id: '2', title: 'Play & Win', subtitle: 'Unlock exciting rewards', buttonText: 'PLAY NOW', imageUrl: '' },
  { id: '3', title: 'Super Savings!', subtitle: 'Up to 80% OFF on first 3 bookings', buttonText: 'BOOK NOW', imageUrl: '' },
];

export default function HomeCarousel() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [banners, setBanners] = useState(FALLBACK_BANNERS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const q = query(collection(db, 'banners'), orderBy('order', 'asc'));
        const snap = await getDocs(q);
        const fetchedBanners = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        if (fetchedBanners && fetchedBanners.length > 0) {
          setBanners(fetchedBanners);
        }
      } catch (err) {
        console.error('Carousel fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBanners();
  }, []);

  return (
    <View style={styles.carouselSection}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => {
          const slide = Math.round(e.nativeEvent.contentOffset.x / width);
          if (slide !== activeSlide) setActiveSlide(slide);
        }}
        scrollEventThrottle={16}
      >
        {banners.map((item) => (
          <View key={item.id} style={[styles.carouselSlide, { width }]}>
            <View style={styles.slideContainer}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.carouselImage} />
              ) : (
                <LinearGradient
                  colors={['#00b36b', '#006D44']}
                  style={styles.carouselImage}
                />
              )}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.carouselGradient}
              />
              <View style={styles.carouselContent}>
                <Text style={styles.carouselTitle}>{item.title}</Text>
                <Text style={styles.carouselSubtitle}>{item.subtitle}</Text>
                <TouchableOpacity style={styles.carouselButton}>
                  <Text style={styles.carouselButtonText}>{item.buttonText || 'Book Now'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
      
      <View style={styles.paginationDots}>
        {banners.map((_, i) => (
          <View 
            key={i} 
            style={[
              styles.dot, 
              i === activeSlide ? styles.activeDot : styles.inactiveDot
            ]} 
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  carouselSection: {
    height: 220,
    width: '100%',
    backgroundColor: Colors.white,
    paddingVertical: 10,
  },
  carouselSlide: {
    height: 200,
    paddingHorizontal: 20,
  },
  slideContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.surface,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  carouselGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  carouselContent: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  carouselTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.2,
  },
  carouselSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    marginTop: 4,
  },
  carouselButton: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  carouselButtonText: {
    color: Colors.text,
    fontWeight: '700',
    fontSize: 11,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  dot: {
    height: 4,
    borderRadius: 2,
    marginHorizontal: 2,
  },
  activeDot: {
    width: 20,
    backgroundColor: Colors.primary,
  },
  inactiveDot: {
    width: 6,
    backgroundColor: Colors.border,
  },
});
