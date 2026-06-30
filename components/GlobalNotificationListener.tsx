import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

// Detect if running inside Expo Go (push token registration not supported in SDK 53+)
const isExpoGo = typeof expo !== 'undefined'
  ? false
  : !!(globalThis as any).ExpoModules?.ExpoGoModule;

// Configure notification behavior for foreground apps
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (_) {
  // Silently ignore if not supported (Expo Go SDK 53+)
}

export default function GlobalNotificationListener() {
  const { user, profile } = useAuth();
  const notifiedMessageIds = useRef(new Set<string>());
  const listenerStartTime = useRef(Date.now());

  useEffect(() => {
    async function requestPermissions() {
      if (Platform.OS === 'web') return;

      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#3B6BFF',
            showBadge: true,
          });
        }
      } catch (e) {
        // Silently ignore — push notifications not supported in Expo Go SDK 53+
      }
    }
    requestPermissions();
  }, []);

  // Listen to active booking messages and trigger local notifications
  useEffect(() => {
    if (!user?.uid) return;

    listenerStartTime.current = Date.now();

    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('userId', '==', user.uid)
    );

    const messageUnsubscribes: Record<string, () => void> = {};
    const activeListeners = new Set<string>();

    const unsubscribeBookings = onSnapshot(bookingsQuery, (snapshot) => {
      const currentActiveBookingIds = new Set<string>();

      snapshot.docs.forEach((doc) => {
        const bookingId = doc.id;
        const bookingData = doc.data();
        const status = bookingData.status?.toLowerCase();
        const isActive = status !== 'completed' && status !== 'done' && status !== 'cancelled';

        if (isActive) {
          currentActiveBookingIds.add(bookingId);

          if (!activeListeners.has(bookingId)) {
            activeListeners.add(bookingId);

            const messagesQuery = query(
              collection(db, 'bookings', bookingId, 'messages'),
              orderBy('createdAt', 'desc'),
              limit(5)
            );

            const unsubscribeMessages = onSnapshot(messagesQuery, (msgSnapshot) => {
              msgSnapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                  const msgId = change.doc.id;
                  const msgData = change.doc.data();
                  const isFromOther = msgData.senderId !== user?.uid;

                  if (isFromOther && !notifiedMessageIds.current.has(msgId)) {
                    notifiedMessageIds.current.add(msgId);

                    const createdAt = msgData.createdAt?.toMillis
                      ? msgData.createdAt.toMillis()
                      : (msgData.createdAt ? new Date(msgData.createdAt).getTime() : Date.now());

                    if (createdAt > listenerStartTime.current) {
                      triggerLocalNotification(bookingData.service || 'Specialist', msgData.text);
                    }
                  }
                }
              });
            });

            messageUnsubscribes[bookingId] = unsubscribeMessages;
          }
        }
      });

      activeListeners.forEach((bookingId) => {
        if (!currentActiveBookingIds.has(bookingId)) {
          if (messageUnsubscribes[bookingId]) {
            messageUnsubscribes[bookingId]();
            delete messageUnsubscribes[bookingId];
          }
          activeListeners.delete(bookingId);
        }
      });
    });

    const triggerLocalNotification = async (serviceName: string, messageText: string) => {
      if (profile?.notificationsEnabled === false) return;
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `New Message - ${serviceName}`,
            body: messageText,
            data: { type: 'chat' },
            sound: true,
          },
          trigger: null,
        });
      } catch (_) {
        // Silently ignore — not supported in Expo Go SDK 53+
      }
    };

    return () => {
      unsubscribeBookings();
      Object.values(messageUnsubscribes).forEach((unsub) => unsub());
    };
  }, [user?.uid, profile?.notificationsEnabled]);

  // Listen to general notifications collection
  useEffect(() => {
    if (!user?.uid) return;

    const notificationsQuery = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const triggerLocalNotification = async (title: string, body: string, type: string) => {
      if (profile?.notificationsEnabled === false) return;
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { type },
            sound: true,
          },
          trigger: null,
        });
      } catch (_) {
        // Silently ignore — not supported in Expo Go SDK 53+
      }
    };

    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notifId = change.doc.id;
          const notifData = change.doc.data();
          const isForUser = notifData.userId === user.uid || notifData.userId === 'all';

          if (isForUser && !notifiedMessageIds.current.has(notifId)) {
            notifiedMessageIds.current.add(notifId);

            const createdAt = notifData.createdAt;
            if (createdAt && createdAt > listenerStartTime.current) {
              triggerLocalNotification(
                notifData.title || 'Notification',
                notifData.desc || '',
                notifData.type || 'alert'
              );
            }
          }
        }
      });
    });

    return () => {
      unsubscribeNotifications();
    };
  }, [user?.uid, profile?.notificationsEnabled]);

  return null;
}
