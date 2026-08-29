import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Modal,
  Image,
  StatusBar,
  SafeAreaView
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from "../services/api";
import { useAuth } from "../hooks/useAuth";
import Navbar from "../components/Navbar";

// Récupérer l'URL de base de l'API depuis les variables d'environnement ou utiliser l'IP par défaut
const API_BASE_URL = 'http://192.168.1.17:5000'; // À remplacer par votre IP

export default function Compte() {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  
  // Données du profil
  const [profileData, setProfileData] = useState({
    nom: '',
    email: '',
    telephone: '',
    avatar: null,
    date_creation: '',
    statistiques: {
      reservations_total: 0,
      reservations_confirmees: 0,
      reservations_annulees: 0,
      reservations_terminees: 0,
      reservations_en_attente: 0
    }
  });

  // Données pour modification
  const [editForm, setEditForm] = useState({
    nom: '',
    email: '',
    telephone: '',
    mot_de_passe_actuel: '',
    nouveau_mot_de_passe: '',
    confirmer_mot_de_passe: ''
  });

  const [showPasswordFields, setShowPasswordFields] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfileData();
      setEditForm({
        ...editForm,
        nom: user.nom || '',
        email: user.email || '',
        telephone: user.telephone || ''
      });
    }
  }, [user]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/profil/profile/${user.id}`);
      setProfileData(res.data);
    } catch (err) {
      console.log("Erreur fetchProfile:", err);
      Alert.alert("Erreur", "Impossible de charger les informations");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Déconnexion",
      "Êtes-vous sûr de vouloir vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Déconnexion", 
          onPress: async () => {
            await logout();
          },
          style: "destructive"
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Supprimer le compte",
      "Êtes-vous absolument sûr de vouloir supprimer votre compte ? Cette action est irréversible et toutes vos données seront perdues.",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer définitivement", 
          onPress: confirmDeleteAccount,
          style: "destructive"
        }
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    try {
      setLoading(true);
      await API.delete(`/profil/delete/${user.id}`);
      
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      delete API.defaults.headers.common['Authorization'];
      
      navigation.replace("AuthScreen");
      
    } catch (err) {
      console.log("Erreur suppression:", err);
      Alert.alert("Erreur", err.response?.data?.message || "Impossible de supprimer le compte");
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editForm.nom || !editForm.email || !editForm.telephone) {
      Alert.alert("Erreur", "Tous les champs sont requis");
      return;
    }

    if (showPasswordFields) {
      if (!editForm.mot_de_passe_actuel) {
        Alert.alert("Erreur", "Veuillez entrer votre mot de passe actuel");
        return;
      }
      if (editForm.nouveau_mot_de_passe !== editForm.confirmer_mot_de_passe) {
        Alert.alert("Erreur", "Les nouveaux mots de passe ne correspondent pas");
        return;
      }
      if (editForm.nouveau_mot_de_passe && editForm.nouveau_mot_de_passe.length < 6) {
        Alert.alert("Erreur", "Le nouveau mot de passe doit contenir au moins 6 caractères");
        return;
      }
    }

    try {
      setLoading(true);
      
      const updateData = {
        nom: editForm.nom,
        email: editForm.email,
        telephone: editForm.telephone
      };

      if (showPasswordFields && editForm.nouveau_mot_de_passe) {
        updateData.mot_de_passe_actuel = editForm.mot_de_passe_actuel;
        updateData.nouveau_mot_de_passe = editForm.nouveau_mot_de_passe;
      }

      const res = await API.put(`/profil/update/${user.id}`, updateData);
      
      const updatedUser = { ...user, ...res.data.user };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      
      Alert.alert("Succès", "Profil mis à jour avec succès");
      setEditModalVisible(false);
      setShowPasswordFields(false);
      setEditForm({
        ...editForm,
        mot_de_passe_actuel: '',
        nouveau_mot_de_passe: '',
        confirmer_mot_de_passe: ''
      });
      fetchProfileData();
      
    } catch (err) {
      console.log("Erreur mise à jour:", err);
      Alert.alert(
        "Erreur", 
        err.response?.data?.message || "Impossible de mettre à jour le profil"
      );
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert("Permission refusée", "Nous avons besoin de votre permission pour accéder à vos photos");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      uploadImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert("Permission refusée", "Nous avons besoin de votre permission pour utiliser la caméra");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('avatar', {
        uri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      });

      const res = await API.post(`/profil/avatar/${user.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setProfileData({ ...profileData, avatar: res.data.avatar });
      
      const updatedUser = { ...user, avatar: res.data.avatar };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      
      setPhotoModalVisible(false);
      Alert.alert("Succès", "Photo de profil mise à jour");
      
    } catch (err) {
      console.log("Erreur upload:", err);
      Alert.alert("Erreur", err.response?.data?.message || "Impossible de télécharger l'image");
    } finally {
      setLoading(false);
    }
  };

  const removePhoto = async () => {
    try {
      setLoading(true);
      await API.delete(`/profil/avatar/${user.id}`);
      
      setProfileData({ ...profileData, avatar: null });
      
      const updatedUser = { ...user, avatar: null };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      
      Alert.alert("Succès", "Photo de profil supprimée");
    } catch (err) {
      console.log("Erreur suppression photo:", err);
      Alert.alert("Erreur", err.response?.data?.message || "Impossible de supprimer la photo");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return null;
    if (avatarPath.startsWith('http')) return avatarPath;
    return `${API_BASE_URL}${avatarPath}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E90FF" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#1E90FF" barStyle="light-content" />
      
      {/* Header inspiré de Reservations et Trajets */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mon Compte</Text>
        <Text style={styles.headerSubtitle}>
          Gérez vos informations personnelles
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Photo de profil */}
        <View style={styles.photoSection}>
          <View style={styles.photoContainer}>
            {profileData.avatar ? (
              <Image 
                source={{ uri: getAvatarUrl(profileData.avatar) }} 
                style={styles.profilePhoto} 
                onError={(e) => console.log("Erreur chargement image:", e.nativeEvent.error)}
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>
                  {user?.nom?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <TouchableOpacity 
              style={styles.photoEditButton}
              onPress={() => setPhotoModalVisible(true)}
            >
              <Ionicons name="camera" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{user?.nom}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <Text style={styles.userSince}>Membre depuis {formatDate(profileData.date_creation)}</Text>
        </View>

        {/* Statistiques */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Statistiques</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="ticket" size={24} color="#1E90FF" />
              <Text style={styles.statNumber}>{profileData.statistiques?.reservations_total || 0}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.statNumber}>{profileData.statistiques?.reservations_confirmees || 0}</Text>
              <Text style={styles.statLabel}>Confirmées</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="time" size={24} color="#FF9800" />
              <Text style={styles.statNumber}>{profileData.statistiques?.reservations_terminees || 0}</Text>
              <Text style={styles.statLabel}>Terminées</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="close-circle" size={24} color="#F44336" />
              <Text style={styles.statNumber}>{profileData.statistiques?.reservations_annulees || 0}</Text>
              <Text style={styles.statLabel}>Annulées</Text>
            </View>
          </View>
        </View>

        {/* Informations personnelles */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>Nom complet</Text>
              <Text style={styles.infoValue}>{user?.nom}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>Téléphone</Text>
              <Text style={styles.infoValue}>{user?.telephone}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setEditModalVisible(true)}
          >
            <Ionicons name="create-outline" size={24} color="#1E90FF" />
            <Text style={styles.actionText}>Modifier le profil</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={24} color="#FF9800" />
            <Text style={styles.actionText}>Déconnexion</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => setDeleteModalVisible(true)}
          >
            <Ionicons name="trash-outline" size={24} color="#F44336" />
            <Text style={[styles.actionText, styles.deleteText]}>Supprimer le compte</Text>
            <Ionicons name="chevron-forward" size={20} color="#F44336" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de modification du profil */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier le profil</Text>
              <TouchableOpacity onPress={() => {
                setEditModalVisible(false);
                setShowPasswordFields(false);
                setEditForm({
                  ...editForm,
                  mot_de_passe_actuel: '',
                  nouveau_mot_de_passe: '',
                  confirmer_mot_de_passe: ''
                });
              }}>
                <Ionicons name="close" size={24} color="red" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nom complet</Text>
              <TextInput
                style={styles.input}
                value={editForm.nom}
                onChangeText={(text) => setEditForm({...editForm, nom: text})}
                placeholder="Votre nom"
              />

              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={editForm.email}
                onChangeText={(text) => setEditForm({...editForm, email: text})}
                placeholder="Votre email"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Téléphone</Text>
              <TextInput
                style={styles.input}
                value={editForm.telephone}
                onChangeText={(text) => setEditForm({...editForm, telephone: text})}
                placeholder="Votre téléphone"
                keyboardType="phone-pad"
              />

              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPasswordFields(!showPasswordFields)}
              >
                <Text style={styles.passwordToggleText}>
                  {showPasswordFields ? "Masquer" : "Changer le mot de passe"}
                </Text>
                <Ionicons 
                  name={showPasswordFields ? "eye-off" : "eye"} 
                  size={20} 
                  color="#1E90FF" 
                />
              </TouchableOpacity>

              {showPasswordFields && (
                <>
                  <Text style={styles.inputLabel}>Mot de passe actuel</Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.mot_de_passe_actuel}
                    onChangeText={(text) => setEditForm({...editForm, mot_de_passe_actuel: text})}
                    placeholder="Entrez votre mot de passe actuel"
                    secureTextEntry
                  />

                  <Text style={styles.inputLabel}>Nouveau mot de passe</Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.nouveau_mot_de_passe}
                    onChangeText={(text) => setEditForm({...editForm, nouveau_mot_de_passe: text})}
                    placeholder="Nouveau mot de passe"
                    secureTextEntry
                  />

                  <Text style={styles.inputLabel}>Confirmer le mot de passe</Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.confirmer_mot_de_passe}
                    onChangeText={(text) => setEditForm({...editForm, confirmer_mot_de_passe: text})}
                    placeholder="Confirmer le nouveau mot de passe"
                    secureTextEntry
                  />
                </>
              )}

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateProfile}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Enregistrer les modifications</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setEditModalVisible(false);
                  setShowPasswordFields(false);
                  setEditForm({
                    ...editForm,
                    mot_de_passe_actuel: '',
                    nouveau_mot_de_passe: '',
                    confirmer_mot_de_passe: ''
                  });
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de suppression de compte */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.deleteModalContent}>
            <Ionicons name="warning" size={60} color="#F44336" />
            <Text style={styles.deleteModalTitle}>Supprimer le compte</Text>
            <Text style={styles.deleteModalText}>
              Êtes-vous absolument sûr de vouloir supprimer votre compte ? 
              Cette action est irréversible et toutes vos données seront perdues.
            </Text>
            
            <TouchableOpacity
              style={styles.confirmDeleteButton}
              onPress={handleDeleteAccount}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmDeleteText}>Oui, supprimer définitivement</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelDeleteButton}
              onPress={() => setDeleteModalVisible(false)}
            >
              <Text style={styles.cancelDeleteText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de sélection de photo */}
      <Modal
        visible={photoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.photoModalContent}>
            <Text style={styles.photoModalTitle}>Photo de profil</Text>
            
            <TouchableOpacity
              style={styles.photoOption}
              onPress={takePhoto}
            >
              <Ionicons name="camera" size={24} color="#1E90FF" />
              <Text style={styles.photoOptionText}>Prendre une photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.photoOption}
              onPress={pickImage}
            >
              <Ionicons name="images" size={24} color="#1E90FF" />
              <Text style={styles.photoOptionText}>Choisir dans la galerie</Text>
            </TouchableOpacity>

            {profileData.avatar && (
              <TouchableOpacity
                style={[styles.photoOption, styles.photoOptionDelete]}
                onPress={removePhoto}
              >
                <Ionicons name="trash" size={24} color="#F44336" />
                <Text style={[styles.photoOptionText, styles.photoOptionDeleteText]}>
                  Supprimer la photo
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.photoOptionCancel}
              onPress={() => setPhotoModalVisible(false)}
            >
              <Text style={styles.photoOptionCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Navbar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5"
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 16
  },
  // Header style comme dans Reservations et Trajets
  header: {
    backgroundColor: "#1E90FF",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
  },
  photoSection: {
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  photoContainer: {
    position: "relative",
    marginBottom: 10,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#1E90FF",
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#1E90FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  photoPlaceholderText: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#fff",
  },
  photoEditButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#1E90FF",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  userSince: {
    fontSize: 12,
    color: "#999",
  },
  statsSection: {
    padding: 15,
    backgroundColor: "#fff",
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  infoSection: {
    padding: 15,
    backgroundColor: "#fff",
    marginTop: 10,
  },
  infoCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 15,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  infoLabel: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    marginLeft: 10,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  actionsSection: {
    padding: 15,
    backgroundColor: "#fff",
    marginTop: 10,
    marginBottom: 80,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    marginLeft: 15,
  },
  deleteButton: {
    borderBottomWidth: 0,
  },
  deleteText: {
    color: "#F44336",
  },
  
  // Modals
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E90FF",
  },
  inputLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  passwordToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 15,
    marginBottom: 5,
  },
  passwordToggleText: {
    fontSize: 14,
    color: "#1E90FF",
  },
  saveButton: {
    backgroundColor: "#1E90FF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#666",
  },
  
  // Delete modal
  deleteModalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "90%",
    alignItems: "center",
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#F44336",
    marginTop: 10,
    marginBottom: 10,
  },
  deleteModalText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  confirmDeleteButton: {
    backgroundColor: "#F44336",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    width: "100%",
    marginBottom: 10,
  },
  confirmDeleteText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelDeleteButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    width: "100%",
    backgroundColor: "#f0f0f0",
  },
  cancelDeleteText: {
    fontSize: 16,
    color: "#666",
  },
  
  // Photo modal
  photoModalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "90%",
  },
  photoModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  photoOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  photoOptionText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 15,
  },
  photoOptionDelete: {
    borderBottomWidth: 0,
  },
  photoOptionDeleteText: {
    color: "#F44336",
  },
  photoOptionCancel: {
    padding: 15,
    alignItems: "center",
    marginTop: 10,
  },
  photoOptionCancelText: {
    fontSize: 16,
    color: "#666",
  },
});