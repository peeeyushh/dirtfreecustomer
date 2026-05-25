import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface ShimmerLoaderProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}

const ShimmerLoader: React.FC<ShimmerLoaderProps> = ({ 
  width: w, 
  height: h, 
  borderRadius = 8,
  style 
}) => {
  const translateX = useSharedValue(-1);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const loaderWidth = typeof w === 'number' ? w : width;
    return {
      transform: [
        {
          translateX: interpolate(
            translateX.value,
            [-1, 1],
            [-loaderWidth, loaderWidth]
          ),
        },
      ],
    };
  });

  return (
    <View 
      style={[
        styles.container, 
        { width: w, height: h, borderRadius },
        style
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
  },
});

export default ShimmerLoader;
