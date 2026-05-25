import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, getDocs, addDoc, query, where, serverTimestamp, onSnapshot, deleteDoc, setDoc, orderBy, limit } from 'firebase/firestore';
import { useAuth } from './AuthContext';

interface SavedAddress {
  id: string;
  address: string;
  label: string; // Home, Work, Other
  isServiceable: boolean;
  lat?: number;
  lng?: number;
}
interface LocationContextType {
  address: string | null;
  city: string | null;
  region: string | null;
  location: Location.LocationObject | null;
  isServiceable: boolean;
  loading: boolean;
  errorMsg: string | null;
  savedAddresses: SavedAddress[];
  currentCityData: any | null;
  refreshLocation: () => Promise<void>;
  setManualAddress: (address: string, lat?: number, lng?: number) => Promise<void>;
  fetchSavedAddresses: () => Promise<void>;
  addSavedAddress: (address: string, label: string, lat?: number, lng?: number) => Promise<void>;
  deleteSavedAddress: (id: string) => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

interface ServiceableCity {
  name: string;
  lat: number;
  lng: number;
  radius: number; // in km
  id?: string;
  settings?: any;
}

let serviceableCities: ServiceableCity[] = [];

// Haversine formula — distance between two GPS points in km
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, updateProfile } = useAuth();
  const [address, setAddress] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isServiceable, setIsServiceable] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [currentCityData, setCurrentCityData] = useState<any | null>(null);
  const [allCities, setAllCities] = useState<ServiceableCity[]>([]);

  useEffect(() => {
    const fetchOperatingCities = async () => {
      try {
        const snap = await getDocs(collection(db, 'cities'));
        const activeCities: ServiceableCity[] = [];
        snap.docs.forEach(d => {
          const data = d.data();
          // Fix: allow lat/lng to be 0 and only exclude if truly missing
          if (data.isActive !== false && data.name) {
            activeCities.push({
              id: d.id,
              name: data.name.toLowerCase(),
              lat: typeof data.lat === 'number' ? data.lat : undefined,
              lng: typeof data.lng === 'number' ? data.lng : undefined,
              radius: data.radius || 5,
              settings: data.settings || {}
            } as any);
          }
        });
        serviceableCities = activeCities;
        setAllCities(activeCities);

        // Update current city data if address exists
        if (address) {
          const city = activeCities.find(c => address.toLowerCase().includes(c.name));
          if (city) setCurrentCityData(city);
        }

        // Re-check with GPS if available
        if (location) {
          const serviceable = checkServiceabilityByCoords(
            location.coords.latitude,
            location.coords.longitude
          );
          setIsServiceable(serviceable);
        } else if (address) {
          const serviceable = checkServiceabilityByName(address);
          setIsServiceable(serviceable);
        }
      } catch (err) {
        console.error('Error fetching cities:', err);
      }
    };
    fetchOperatingCities();
  }, []);

  // Primary check: GPS coordinates vs city circles
  const checkServiceabilityByCoords = (userLat: number, userLng: number): boolean => {
    if (serviceableCities.length === 0) return true; // Allow if cities not loaded yet
    return serviceableCities.some(city => {
      const distance = getDistanceKm(userLat, userLng, city.lat, city.lng);
      return distance <= city.radius;
    });
  };

  // Fallback check: address string matching
  const checkServiceabilityByName = (addr: string): boolean => {
    if (!addr) return false;
    const addrLower = addr.toLowerCase();
    if (serviceableCities.length > 0) {
      return serviceableCities.some(city => addrLower.includes(city.name));
    }
    // Hardcoded fallback if nothing loaded or for testing
    const fallback = ['gwalior', 'indore', 'bhopal', 'ghaziabad', 'noida', 'delhi', 'gurugram'];
    return fallback.some(city => addrLower.includes(city));
  };

  // Combined check — allow if EITHER GPS or address name matches
  const checkServiceability = (addr: string): boolean => {
    // Check by address name first (handles manual selection)
    if (checkServiceabilityByName(addr)) return true;
    // Then check by GPS coordinates
    if (location) {
      return checkServiceabilityByCoords(
        location.coords.latitude,
        location.coords.longitude
      );
    }
    return false;
  };

  // Automatically update currentCityData whenever address, location or cities change
  useEffect(() => {
    if (allCities.length > 0) {
      if (location) {
        const matchingCity = allCities.find(c => {
          if (c.lat !== undefined && c.lng !== undefined) {
            const distance = getDistanceKm(location.coords.latitude, location.coords.longitude, c.lat, c.lng);
            return distance <= c.radius;
          }
          return false;
        });
        if (matchingCity) {
          setCurrentCityData(matchingCity);
          return;
        }
      }

      if (address) {
        const addrLower = address.toLowerCase();
        const city = allCities.find(c => addrLower.includes(c.name));
        if (city) {
          setCurrentCityData(city);
        }
      }
    }
  }, [address, allCities, location]);


  useEffect(() => {
    if (!user) return;
    
    const q = query(collection(db, `users/${user.uid}/addresses`));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty && savedAddresses.length === 0) {
        setSavedAddresses([]);
        return;
      }
      
      const addresses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedAddress));
      // Sort by createdAt descending (newest first)
      addresses.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setSavedAddresses(addresses);
    }, (error) => {
      console.error('Error listening to addresses:', error);
    });

    return () => unsubscribe();
  }, [user]);

  const addSavedAddress = async (addr: string, label: string, lat?: number, lng?: number) => {
    console.log('Attempting to add saved address:', addr, 'for user:', user?.uid);
    if (!user) {
      console.error('Add Saved Address failed: No user found');
      return;
    }
    
    const serviceable = lat !== undefined && lng !== undefined
      ? checkServiceabilityByCoords(lat, lng)
      : checkServiceability(addr);
      
    try {
      const addressesRef = collection(db, 'users', user.uid, 'addresses');
      
      const docData = {
        address: addr,
        label,
        isServiceable: serviceable,
        lat: lat ?? null,
        lng: lng ?? null,
        createdAt: serverTimestamp()
      };

      console.log('Saving to Firestore path:', `users/${user.uid}/addresses`, 'Data:', docData);
      
      const docRef = await addDoc(addressesRef, docData);
      console.log('Address saved successfully! Doc ID:', docRef.id);
    } catch (error: any) {
      console.error('Error adding address to Firestore:', error);
      throw error;
    }
  };

  const deleteSavedAddress = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'addresses', id));
    } catch (error) {
      console.error('Error deleting address:', error);
      throw error;
    }
  };

  const refreshLocation = async () => {
    if (loading) return;
    
    setLoading(true);
    setErrorMsg(null);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission denied. Using default location.');
        // Fallback to Indore if permission denied
        setAddress('Vijay Nagar, Indore, Madhya Pradesh');
        setIsServiceable(true);
        setLoading(false);
        return;
      }

      let currentLocation = await Location.getLastKnownPositionAsync({});
      if (!currentLocation) {
        try {
          currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeout: 5000
          });
        } catch (gpsError) {
          console.log('GPS failed, using fallback:', gpsError);
          // If GPS hardware fails, use Indore as fallback
          currentLocation = {
            coords: { latitude: 22.7196, longitude: 75.8577, accuracy: 10, altitude: 0, heading: 0, speed: 0 },
            timestamp: Date.now()
          } as Location.LocationObject;
        }
      }

      setLocation(currentLocation);

      let reverseGeocode = [];
      try {
        reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
      } catch (revError) {
        console.log('Reverse geocode failed:', revError);
      }

      if (reverseGeocode.length > 0) {
        const item = reverseGeocode[0];
        const formattedAddress = [
          item.name,
          item.street,
          item.subregion,
          item.city,
          item.region,
          item.postalCode
        ].filter(Boolean).join(', ');

        setAddress(formattedAddress);
        setCity(item.city || item.district || item.subregion || null);
        setRegion(item.region || null);
        const serviceable = checkServiceability(formattedAddress);
        setIsServiceable(serviceable);
        
        await AsyncStorage.setItem('user_location', formattedAddress);
        await AsyncStorage.setItem('is_serviceable', JSON.stringify(serviceable));
        
        if (user && profile?.selectedAddress !== formattedAddress) {
          await updateProfile({ selectedAddress: formattedAddress });
        }
      } else {
        // Fallback if geocode fails but we have coords
        const fallbackAddr = 'Vijay Nagar, Indore';
        setAddress(fallbackAddr);
        setIsServiceable(true);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setErrorMsg('Could not fetch location. Using Indore.');
      setAddress('Vijay Nagar, Indore');
      setIsServiceable(true);
    } finally {
      setLoading(false);
    }
  };

  const setManualAddress = async (addr: string, lat?: number, lng?: number) => {
    let serviceable = false;
    if (lat !== undefined && lng !== undefined) {
      serviceable = checkServiceabilityByCoords(lat, lng);
      
      // Update location coords so that booking flow picks up manual coords
      setLocation({
        coords: {
          latitude: lat,
          longitude: lng,
          accuracy: 0,
          altitude: 0,
          heading: 0,
          speed: 0
        },
        timestamp: Date.now()
      } as Location.LocationObject);

      await AsyncStorage.setItem('user_lat', lat.toString());
      await AsyncStorage.setItem('user_lng', lng.toString());
    } else {
      serviceable = checkServiceability(addr);
    }

    setAddress(addr);
    setIsServiceable(serviceable);
    await AsyncStorage.setItem('user_location', addr);
    await AsyncStorage.setItem('is_serviceable', JSON.stringify(serviceable));
    
    // Sync with Firestore profile
    if (user) {
      await updateProfile({ selectedAddress: addr });
    }
  };

  useEffect(() => {
    let isSubscribed = true;

    const loadSavedLocation = async () => {
      if (!user) {
        setAddress(null);
        setIsServiceable(true);
        setSavedAddresses([]);
        return;
      }

      // 1. If profile already has an address, use it and stop (Prevents loop)
      if (profile?.selectedAddress) {
        setAddress(profile.selectedAddress);
        setIsServiceable(checkServiceability(profile.selectedAddress));
        return;
      }

      // 2. Try fetching the most recent saved address from Firestore
      try {
        const addressesRef = collection(db, 'users', user.uid, 'addresses');
        const q = query(addressesRef, orderBy('createdAt', 'desc'), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty && isSubscribed) {
          const latestAddr = querySnapshot.docs[0].data();
          setAddress(latestAddr.address);
          setIsServiceable(latestAddr.isServiceable);
          
          // Sync to profile and storage only if missing
          if (!profile?.selectedAddress) {
            await updateProfile({ selectedAddress: latestAddr.address });
          }
          await AsyncStorage.setItem('user_location', latestAddr.address);
        } else if (isSubscribed) {
          // 3. Fallback: Try AsyncStorage
          const savedAddr = await AsyncStorage.getItem('user_location');
          if (savedAddr) {
            setAddress(savedAddr);
            const savedServiceable = await AsyncStorage.getItem('is_serviceable');
            setIsServiceable(savedServiceable ? JSON.parse(savedServiceable) : true);
            
            const savedLat = await AsyncStorage.getItem('user_lat');
            const savedLng = await AsyncStorage.getItem('user_lng');
            if (savedLat && savedLng) {
              setLocation({
                coords: {
                  latitude: parseFloat(savedLat),
                  longitude: parseFloat(savedLng),
                  accuracy: 0,
                  altitude: 0,
                  heading: 0,
                  speed: 0
                },
                timestamp: Date.now()
              } as Location.LocationObject);
            }
            
            if (!profile?.selectedAddress) {
              await updateProfile({ selectedAddress: savedAddr });
            }
          } else {
            // 4. Final fallback: Refresh from GPS
            refreshLocation();
          }
        }
      } catch (err) {
        console.error('Error fetching latest address:', err);
        if (isSubscribed) refreshLocation();
      }
    };

    loadSavedLocation();
    return () => { isSubscribed = false; };
  }, [user?.uid, profile?.selectedAddress]);

  return (
    <LocationContext.Provider 
      value={{ 
        address, 
        city,
        region,
        location, 
        isServiceable, 
        loading, 
        errorMsg, 
        savedAddresses,
        currentCityData,
        refreshLocation,
        setManualAddress,
        fetchSavedAddresses: async () => {}, // Kept for interface compatibility
        addSavedAddress,
        deleteSavedAddress
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
