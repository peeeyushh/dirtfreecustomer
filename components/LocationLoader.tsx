import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withDelay,
  withSequence,
  Easing,
  interpolate
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const PRIMARY_GREEN = '#00b167';

const Ripple = ({ delay }: { delay: number }) => {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withDelay(delay, withRepeat(withTiming(2.5, { duration: 3000, easing: Easing.out(Easing.ease) }), -1, false));
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
  const mapScale = useSharedValue(1.1);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 10000, easing: Easing.linear }), -1, false);
    pinY.value = withRepeat(withSequence(
      withTiming(-15, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
    ), -1, true);
    mapScale.value = withRepeat(withTiming(1.3, { duration: 20000, easing: Easing.linear }), -1, true);
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
            <Ionicons name="location" size={40} color="white" />
          </View>
        </Animated.View>

        {/* Loading Text */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>Finding your location</Text>
          <Text style={styles.subtitle}>Connecting you with the best cleaning experts nearby...</Text>
          
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
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.25,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f172a',
    opacity: 0.4,
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
    borderWidth: 2,
    borderColor: PRIMARY_GREEN,
  },
  dashedCircle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: 'rgba(0, 177, 103, 0.4)',
    borderStyle: 'dashed',
  },
  pinWrapper: {
    zIndex: 10,
  },
  pinCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PRIMARY_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PRIMARY_GREEN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 15,
  },
  textContainer: {
    marginTop: 60,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: PRIMARY_GREEN,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PRIMARY_GREEN,
  },
});
