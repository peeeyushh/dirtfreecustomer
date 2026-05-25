import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface CategoryPillProps {
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  color: string;
  backgroundColor: string;
}

export default function CategoryPill({ label, iconName, color, backgroundColor }: CategoryPillProps) {
  return (
    <View style={[styles.pill, { backgroundColor }]}>
      <Ionicons name={iconName} size={16} color={color} style={styles.icon} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
});
