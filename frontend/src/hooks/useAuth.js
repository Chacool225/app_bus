// hooks/useAuth.js
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import API from '../services/api';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const userData = await AsyncStorage.getItem('user');
      const token = await AsyncStorage.getItem('token');

      if (!userData || !token) {
        setIsAuthenticated(false);
        setUser(null);
        navigation.replace('AuthScreen');
        return;
      }

      // Configurer le token pour toutes les requêtes API
      API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setIsAuthenticated(true);
      
    } catch (err) {
      console.log('Erreur checkAuth:', err);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      delete API.defaults.headers.common['Authorization'];
      setUser(null);
      setIsAuthenticated(false);
      navigation.replace('AuthScreen');
    } catch (err) {
      console.log('Erreur logout:', err);
    }
  };

  return { user, loading, isAuthenticated, logout, checkAuth };
};