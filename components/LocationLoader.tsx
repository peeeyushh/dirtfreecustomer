import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withDelay,
  withSequence,
  Easing
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const PRIMARY_COLOR = '#0E1220'; // Matching DirtFree dark palette

const Ripple = ({ delay }: { delay: number }) => {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withDelay(delay, withRepeat(withTiming(2.8, { duration: 3000, easing: Easing.out(Easing.ease) }), -1, false));
    opacity.value = withDelay(delay, withRepeat(withTiming(0, { duration: 3000, easing: Easing.out(Easing.ease) }), -1, false));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.ripple, animatedStyle]} />;
};

export default function LocationLoader() {
  const rotation = useSharedValue(0);
  const pinY = useSharedValue(0);
  const mapScale = useSharedValue(1.15);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 12000, easing: Easing.linear }), -1, false);
    pinY.value = withRepeat(withSequence(
      withTiming(-18, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) })
    ), -1, true);
    mapScale.value = withRepeat(withTiming(1.35, { duration: 25000, easing: Easing.linear }), -1, true);
  }, []);

  const rotatingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const pinStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pinY.value }],
  }));

  const mapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mapScale.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Background Map Animation */}
      <Animated.View style={[styles.mapContainer, mapStyle]}>
        <Image 
          source={require('../assets/images/map_bg.png')} 
          style={styles.mapImage}
          resizeMode="cover"
        />
        <View style={styles.overlay} />
      </Animated.View>

      <View style={styles.content}>
        {/* Ripples */}
        <Ripple delay={0} />
        <Ripple delay={1000} />
        <Ripple delay={2000} />

        {/* Rotating Dashed Circle */}
        <Animated.View style={[styles.dashedCircle, rotatingStyle]} />

        {/* Central Pin */}
        <Animated.View style={[styles.pinWrapper, pinStyle]}>
          <View style={styles.pinCircle}>
            <Ionicons name="location" size={38} color="white" />
          </View>
        </Animated.View>

        {/* Loading Text */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>Locating You</Text>
          <Text style={styles.subtitle}>Fetching your live coordinates to check serviceable areas...</Text>
          
          <View style={styles.dotsRow}>
            {[0, 1, 2].map((i) => (
              <Dot key={i} delay={i * 200} />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const Dot = ({ delay }: { delay: number }) => {
  const opacity = useSharedValue(0.3);
  useEffect(() => {
    opacity.value = withDelay(delay, withRepeat(withSequence(
      withTiming(1, { duration: 500 }),
      withTiming(0.3, { duration: 500 })
    ), -1, true));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.dot, style]} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F8', // Matching bg color in tailwind config
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F7F7F8',
    opacity: 0.3,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    borderColor: 'rgba(14, 18, 32, 0.15)',
  },
  dashedCircle: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1.5,
    borderColor: 'rgba(14, 18, 32, 0.2)',
    borderStyle: 'dashed',
  },
  pinWrapper: {
    zIndex: 10,
  },
  pinCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  textContainer: {
    marginTop: 50,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: PRIMARY_COLOR,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  dotsRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: PRIMARY_COLOR,
  },
});
