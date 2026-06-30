import React, { createContext, useContext, useState, useCallback } from 'react';
import { Modal, StyleSheet, Text, View, TouchableOpacity, Pressable, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface AlertOptions {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'confirm';
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AlertOptions | null>(null);

  const showAlert = useCallback((opts: AlertOptions) => {
    setOptions(opts);
    setVisible(true);
  }, []);

  const hideAlert = useCallback(() => {
    setVisible(false);
  }, []);

  const handleConfirm = () => {
    if (options?.onConfirm) options.onConfirm();
    hideAlert();
  };

  const getIcon = () => {
    switch (options?.type) {
      case 'success': return { name: 'checkmark-circle', color: '#10b981', bg: '#ecfdf5' };
      case 'error': return { name: 'alert-circle', color: '#ef4444', bg: '#fef2f2' };
      case 'confirm': return { name: 'help-circle', color: '#6366f1', bg: '#eef2ff' };
      default: return { name: 'information-circle', color: '#3b82f6', bg: '#eff6ff' };
    }
  };

  const icon = getIcon();

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={hideAlert}>
          {options && (
             <View style={styles.content}>
              <View style={[styles.iconBox, { backgroundColor: icon.bg }]}>
                <Ionicons name={icon.name as any} size={40} color={icon.color} />
              </View>
              
              <Text style={styles.title}>{options.title}</Text>
              <Text style={styles.message}>{options.message}</Text>

              <View style={styles.actions}>
                {(options.type === 'confirm' || options.onConfirm) && (
                  <TouchableOpacity style={styles.cancelBtn} onPress={hideAlert}>
                    <Text style={styles.cancelText}>{options.cancelText || 'Cancel'}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={[styles.confirmBtn, { backgroundColor: options.type === 'error' ? '#ef4444' : '#111827' }]} 
                  onPress={handleConfirm}
                >
                  <Text style={styles.confirmBtnText}>
                    {options.confirmText || (options.onConfirm ? 'Confirm' : 'OK')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Pressable>
      </Modal>
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) throw new Error('useAlert must be used within AlertProvider');
  return context;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 25 },
  content: { width: '100%', backgroundColor: '#fff', borderRadius: 32, padding: 30, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 30, elevation: 15 },
  iconBox: { width: 80, height: 80, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '900', color: '#111827', marginBottom: 10, textAlign: 'center' },
  message: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 30 },
  actions: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: { flex: 1, height: 56, borderRadius: 20, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  confirmBtn: { flex: 1, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
