import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, LayoutAnimation, UIManager, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import ShimmerLoader from '../../components/ShimmerLoader';
import { StatusBar } from 'expo-status-bar';

const isNewArch = typeof global !== 'undefined' && ((global as any).RN$Bridgeless || (global as any).nativeFabricUIManager);
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental && !isNewArch) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PRIMARY_GREEN = '#00b167';

export default function TopicScreen() {
  const { topic } = useLocalSearchParams<{ topic: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchTopicFaqs = async () => {
      if (!topic) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, 'faqs'), 
          orderBy('order', 'asc')
        );
        const snap = await getDocs(q);
        const data = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((faq: any) => faq.category === topic);
        setFaqs(data);
      } catch (err) {
        console.error('Error fetching topic FAQs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTopicFaqs();
  }, [topic]);

  const toggleExpand = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const topicTitle = typeof topic === 'string' 
    ? topic.charAt(0).toUpperCase() + topic.slice(1) 
    : 'Help';

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{topicTitle}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Help related to {topicTitle.toLowerCase()}</Text>
        
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <View key={i} style={{ marginBottom: 16 }}>
              <ShimmerLoader width={width - 48} height={80} borderRadius={16} />
            </View>
          ))
        ) : faqs.length === 0 ? (
          <View style={{ marginTop: 40, alignItems: 'center' }}>
            <Ionicons name="help-circle-outline" size={48} color="#94a3b8" />
            <Text style={{ color: '#94a3b8', marginTop: 12 }}>No FAQs found for this topic.</Text>
          </View>
        ) : (
          faqs.map((faq, index) => (
            <TouchableOpacity 
              key={faq.id}
              style={styles.accordionContainer}
              onPress={() => toggleExpand(index)}
              activeOpacity={0.7}
            >
              <View style={styles.accordionHeader}>
                <Text style={styles.questionText}>{faq.question}</Text>
                <Ionicons 
                  name={expandedIndex === index ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#64748b" 
                />
              </View>
              {expandedIndex === index && (
                <View style={styles.accordionBody}>
                  <View style={styles.accordionDivider} />
                  <Text style={styles.answerText}>{faq.answer}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Floating Bottom Card */}
      <View style={[styles.bottomCardWrapper, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.supportCard}>
          <View style={styles.supportIconWrapper}>
            <Ionicons name="headset" size={24} color={PRIMARY_GREEN} />
          </View>
          <View style={styles.supportTextWrapper}>
            <Text style={styles.supportTitle}>Can't find your answer?</Text>
            <Text style={styles.supportSubtext}>Our support team is here to help</Text>
          </View>
          <TouchableOpacity style={styles.supportActionBtn}>
            <Ionicons name="arrow-forward" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 120, // Extra space for bottom floating card
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 24,
  },
  accordionContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  questionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginRight: 16,
    lineHeight: 22,
  },
  accordionBody: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  accordionDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginBottom: 16,
  },
  answerText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 24,
  },
  bottomCardWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: 'transparent', // Transparent to look floating but mask scroll
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 16,
    padding: 16,
  },
  supportIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  supportTextWrapper: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  supportSubtext: {
    fontSize: 13,
    color: '#64748b',
  },
  supportActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
