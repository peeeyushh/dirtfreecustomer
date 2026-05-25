import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useLocation } from '../../context/LocationContext';

interface AddressSelectorProps {
  onSelect: (address: string, isServiceable: boolean) => void;
  onAdd?: () => void;
}

export default function AddressSelector({ onSelect, onAdd }: AddressSelectorProps) {
  const { savedAddresses, deleteSavedAddress } = useLocation();

  const getIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case 'home': return 'home-outline';
      case 'work': return 'briefcase-outline';
      default: return 'location-outline';
    }
  };

  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteSavedAddress(deleteId);
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting address:', error);
      // Let it fail silently or add a toast, but close modal
      setDeleteId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Saved Addresses</Text>
      <View style={styles.listContent}>
        {savedAddresses.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.addressCard}
            onPress={() => onSelect(item.address, item.isServiceable)}
          >
            <View style={styles.iconContainer}>
              <Ionicons name={getIcon(item.label)} size={24} color={Colors.primary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.address} numberOfLines={2}>{item.address}</Text>
              {!item.isServiceable && (
                <Text style={styles.notAvailable}>Not Serviceable</Text>
              )}
            </View>
            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={() => handleDelete(item.id)}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        <TouchableOpacity 
          style={[styles.addressCard, styles.addNewCard]}
          onPress={onAdd}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#f0fdf4' }]}>
            <Ionicons name="add" size={28} color={Colors.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.label, { color: Colors.primary }]}>Add New Address</Text>
            <Text style={styles.address}>Save another location</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      {/* Custom Delete Confirmation Modal */}
      <Modal visible={deleteId !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="trash-outline" size={40} color="#ef4444" />
            </View>
            <Text style={styles.modalTitle}>Delete Address?</Text>
            <Text style={styles.modalSubtext}>
              Are you sure you want to remove this address from your saved locations? This action cannot be undone.
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setDeleteId(null)}
                disabled={isDeleting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmBtn} 
                onPress={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.confirmBtnText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingBottom: 20,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
    paddingRight: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  notAvailable: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
    marginTop: 6,
  },
  addNewCard: {
    backgroundColor: '#f8fafc',
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderWidth: 1.5,
  },
  deleteButton: {
    padding: 10,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 32,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cancelBtnText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#ef4444',
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
