import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Dimensions,
  Platform
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import API from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import NotificationIcon from "../components/NotificationIcon";
import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');

export default function Trajets() {
  const navigation = useNavigation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [trajets, setTrajets] = useState([]);
  const [filteredTrajets, setFilteredTrajets] = useState([]);
  const [search, setSearch] = useState("");
  
  // Recherche par date
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateFilter, setDateFilter] = useState(null);
  
  // Modals
  const [trajetModal, setTrajetModal] = useState(false);
  const [voyageModal, setVoyageModal] = useState(false);
  const [siegeModal, setSiegeModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState(false);
  const [paymentMethodModal, setPaymentMethodModal] = useState(false);
  const [unavailableModal, setUnavailableModal] = useState(false);

  // Données sélectionnées
  const [selectedTrajet, setSelectedTrajet] = useState(null);
  const [voyages, setVoyages] = useState([]);
  const [filteredVoyages, setFilteredVoyages] = useState([]);
  const [selectedVoyage, setSelectedVoyage] = useState(null);
  const [sieges, setSieges] = useState([]);
  const [selectedSiege, setSelectedSiege] = useState(null);
  const [selectedSiegeDetails, setSelectedSiegeDetails] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [unavailableMethod, setUnavailableMethod] = useState(null);
  
  // États
  const [loadingVoyages, setLoadingVoyages] = useState(false);
  const [loadingSieges, setLoadingSieges] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [reservationCode, setReservationCode] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  // ✅ Méthodes de paiement - SEULE ESPÈCES EST DISPONIBLE
  const paymentMethods = [
    { id: 'especes', label: '💵 ESPÈCES', icon: 'cash', color: '#4CAF50', description: 'Paiement à bord', disponible: true },
    { id: 'mobile_money', label: '📱 MOBILE MONEY', icon: 'phone-portrait', color: '#FF9800', description: 'Orange Money, MTN Money', disponible: false },
    { id: 'carte_credit', label: '💳 CARTE DE CRÉDIT', icon: 'card', color: '#1E90FF', description: 'Visa, Mastercard', disponible: false },
    { id: 'virement_bancaire', label: '🏦 VIREMENT BANCAIRE', icon: 'business', color: '#9C27B0', description: 'Virement avant départ', disponible: false }
  ];

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchTrajets();
      fetchUnreadCount();
      
      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  const fetchUnreadCount = async () => {
    try {
      const res = await API.get(`/notifications/user/${user.id}/count`);
      setUnreadCount(res.data.count);
    } catch (err) {
      console.log("Erreur fetchUnreadCount:", err);
    }
  };

  const fetchTrajets = async () => {
    try {
      setLoadingData(true);
      const res = await API.get("/trajets");
      setTrajets(res.data);
      setFilteredTrajets(res.data);
    } catch (err) {
      console.log("Erreur fetchTrajets:", err.message);
      Alert.alert("Erreur", "Impossible de charger les trajets");
    } finally {
      setLoadingData(false);
    }
  };

  const fetchVoyagesByTrajet = async (trajetId) => {
    try {
      setLoadingVoyages(true);
      const res = await API.get(`/trajets/${trajetId}/voyages`);
      
      // Filtrer les voyages pour n'afficher que ceux qui ne sont pas encore passés et qui ont des places
      const maintenant = new Date();
      let voyagesFiltres = res.data.filter(voyage => {
        const dateDepart = new Date(voyage.heure_depart);
        return dateDepart > maintenant && voyage.places_disponibles > 0;
      });
      
      // Appliquer le filtre de date si sélectionné
      if (dateFilter) {
        const filterDate = new Date(dateFilter).toDateString();
        voyagesFiltres = voyagesFiltres.filter(voyage => {
          const voyageDate = new Date(voyage.heure_depart).toDateString();
          return voyageDate === filterDate;
        });
      }
      
      console.log("Voyages après filtrage:", voyagesFiltres);
      setVoyages(voyagesFiltres);
      setFilteredVoyages(voyagesFiltres);
    } catch (err) {
      console.log(err.message);
      Alert.alert("Erreur", "Impossible de charger les voyages");
    } finally {
      setLoadingVoyages(false);
    }
  };

  const fetchSiegesByVoyage = async (voyageId) => {
    try {
      setLoadingSieges(true);
      console.log("Récupération des sièges pour voyage:", voyageId);
      
      const res = await API.get(`/trajets/voyages/${voyageId}/sieges`);
      
      console.log("Sièges reçus (brut):", res.data);
      
      const siegesAdaptes = res.data.map(siege => ({
        id: siege.id,
        siege_id: siege.siege_id,
        numero_siege: siege.numero_siege,
        type_siege: siege.type_siege,
        statut: siege.statut,
        est_occupe: siege.statut !== 'disponible'
      }));
      
      console.log("Sièges adaptés:", siegesAdaptes);
      setSieges(siegesAdaptes);
      
      if (res.data.length === 0) {
        Alert.alert("Info", "Aucun siège disponible pour ce voyage");
      }
    } catch (err) {
      console.log("Erreur détaillée:", err.response?.data || err.message);
      Alert.alert(
        "Erreur", 
        err.response?.data?.message || "Impossible de charger les sièges"
      );
    } finally {
      setLoadingSieges(false);
    }
  };

  const createReservationNotification = async (reservationData) => {
    try {
      await API.post("/notifications/create", {
        utilisateur_id: user.id,
        titre: "✅ Réservation confirmée",
        message: `Votre réservation pour ${selectedTrajet?.ville_depart} → ${selectedTrajet?.ville_arrivee} a été confirmée. Code: ${reservationData.code_reservation}`,
        type_notification: "succes"
      });
      
      fetchUnreadCount();
    } catch (err) {
      console.log("Erreur création notification:", err);
    }
  };

  const createRappelNotification = async (voyageData) => {
    try {
      const dateDepart = new Date(voyageData.heure_depart);
      const maintenant = new Date();
      const diffHeures = (dateDepart - maintenant) / (1000 * 60 * 60);
      
      if (diffHeures <= 24 && diffHeures > 0) {
        await API.post("/notifications/create", {
          utilisateur_id: user.id,
          titre: "⏰ Rappel de voyage",
          message: `Votre voyage pour ${selectedTrajet?.ville_depart} → ${selectedTrajet?.ville_arrivee} est dans moins de 24h.`,
          type_notification: "info"
        });
      }
      
      fetchUnreadCount();
    } catch (err) {
      console.log("Erreur création rappel:", err);
    }
  };

  // 🔍 Recherche par texte
  const handleSearch = (text) => {
    setSearch(text);
    const filtered = trajets.filter((t) =>
      t.ville_depart.toLowerCase().includes(text.toLowerCase()) ||
      t.ville_arrivee.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredTrajets(filtered);
  };

  // 📅 Gestionnaire de date
  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || dateFilter;
    setShowDatePicker(Platform.OS === 'ios');
    setDateFilter(currentDate);
    
    // Si un trajet est sélectionné, recharger les voyages avec le nouveau filtre
    if (selectedTrajet) {
      fetchVoyagesByTrajet(selectedTrajet.id);
    }
  };

  const clearDateFilter = () => {
    setDateFilter(null);
    if (selectedTrajet) {
      fetchVoyagesByTrajet(selectedTrajet.id);
    }
  };

  const formatDateForDisplay = (date) => {
    if (!date) return "";
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Étape 1: Sélection du trajet
  const openTrajetDetails = async (trajet) => {
    setSelectedTrajet(trajet);
    setSelectedVoyage(null);
    setSelectedSiege(null);
    setSelectedSiegeDetails(null);
    setDateFilter(null); // Reset date filter
    await fetchVoyagesByTrajet(trajet.id);
    setTrajetModal(true);
  };

  // Étape 2: Sélection du voyage
  const selectVoyage = (voyage) => {
    setSelectedVoyage(voyage);
    setTrajetModal(false);
    setVoyageModal(true);
  };

  // Étape 3: Voir les sièges du voyage
  const voirSieges = async () => {
    if (!selectedVoyage) return;
    await fetchSiegesByVoyage(selectedVoyage.id);
    setVoyageModal(false);
    setSiegeModal(true);
  };

  // Étape 4: Sélection du siège
  const selectSiege = (siege) => {
    setSelectedSiege(siege.siege_id);
    setSelectedSiegeDetails(siege);
    console.log("Siège sélectionné - ID pour réservation:", siege.siege_id);
  };

  // Étape 5: Ouvrir le modal de sélection du mode de paiement
  const openPaymentMethodModal = () => {
    if (!selectedSiege) {
      Alert.alert("Erreur", "Veuillez sélectionner un siège");
      return;
    }
    setSiegeModal(false);
    setPaymentMethodModal(true);
  };

  // Étape 6: Sélectionner le mode de paiement (avec vérification disponibilité)
  const selectPaymentMethod = (method) => {
    if (!method.disponible) {
      setUnavailableMethod(method);
      setUnavailableModal(true);
      return;
    }
    
    setSelectedPaymentMethod(method);
    setPaymentMethodModal(false);
    setPaymentModal(true);
  };

  // Étape 7: Confirmation de la réservation avec paiement
  const handleReservation = async () => {
    try {
      if (!user || !user.id) {
        Alert.alert("Erreur", "Vous devez être connecté pour réserver");
        return;
      }

      if (!selectedVoyage || !selectedSiege || !selectedPaymentMethod) {
        Alert.alert("Erreur", "Veuillez sélectionner un voyage, un siège et un mode de paiement");
        return;
      }

      console.log("Données de réservation envoyées:", {
        utilisateur_id: user.id,
        voyage_id: selectedVoyage.id,
        siege_id: selectedSiege,
        nom_passager: user.nom,
        telephone_passager: user.telephone,
        email_passager: user.email,
        methode_paiement: selectedPaymentMethod.id
      });

      const reservationData = {
        utilisateur_id: user.id,
        voyage_id: selectedVoyage.id,
        siege_id: selectedSiege,
        nom_passager: user.nom,
        telephone_passager: user.telephone,
        email_passager: user.email || "",
        methode_paiement: selectedPaymentMethod.id
      };

      const response = await API.post("/trajets/reserver", reservationData);

      console.log("✅ Réponse réservation:", response.data);
      
      setReservationCode(response.data.code_reservation);
      
      await createReservationNotification(response.data);
      await createRappelNotification(selectedVoyage);
      
      setPaymentModal(false);
      setConfirmationModal(true);

    } catch (err) {
      console.log("❌ Erreur réservation:", err.response?.data || err.message);
      
      if (err.response?.data?.message === "Siège non disponible") {
        Alert.alert("Erreur", "Ce siège n'est plus disponible");
        await fetchSiegesByVoyage(selectedVoyage.id);
      } else {
        Alert.alert("Erreur", err.response?.data?.message || "Impossible de réserver");
      }
    }
  };

  const resetAndClose = () => {
    setTrajetModal(false);
    setVoyageModal(false);
    setSiegeModal(false);
    setPaymentModal(false);
    setPaymentMethodModal(false);
    setConfirmationModal(false);
    setSelectedTrajet(null);
    setSelectedVoyage(null);
    setSelectedSiege(null);
    setSelectedSiegeDetails(null);
    setSelectedPaymentMethod(null);
    setDateFilter(null);
  };

  if (authLoading || loadingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E90FF" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  const renderTrajetItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => openTrajetDetails(item)} activeOpacity={0.7}>
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <View style={styles.routeIconContainer}>
            <Ionicons name="bus" size={24} color="#1E90FF" />
          </View>
          <View style={styles.routeContainer}>
            <Text style={styles.route}>
              {item.ville_depart} → {item.ville_arrivee}
            </Text>
          </View>
        </View>
        
        <View style={styles.cardFooter}>
          <View style={styles.priceContainer}>
            <Ionicons name="pricetag" size={16} color="#1E90FF" />
            <Text style={styles.price}>{item.prix_base} FCFA</Text>
          </View>
          
          <View style={styles.distanceContainer}>
            <Ionicons name="map" size={16} color="#666" />
            <Text style={styles.distance}>{item.distance_km} km</Text>
          </View>
        </View>
        
        <View style={styles.durationContainer}>
          <Ionicons name="time" size={16} color="#666" />
          <Text style={styles.duration}>
            Durée: {Math.floor(item.duree_estimee_minutes / 60)}h{item.duree_estimee_minutes % 60}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderVoyageItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.voyageCard} 
      onPress={() => selectVoyage(item)}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        style={styles.voyageGradient}
      >
        <View style={styles.voyageHeader}>
          <View style={styles.voyageDateContainer}>
            <Ionicons name="calendar" size={16} color="#1E90FF" />
            <Text style={styles.voyageDate}>
              {new Date(item.heure_depart).toLocaleDateString('fr-FR')}
            </Text>
          </View>
          <View style={styles.voyageTimeContainer}>
            <Ionicons name="time" size={16} color="#1E90FF" />
            <Text style={styles.voyageTime}>
              {new Date(item.heure_depart).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        <View style={styles.voyageRoute}>
          <View style={styles.voyagePoint}>
            <View style={styles.pointDepart} />
            <Text style={styles.voyageVille}>{item.ville_depart}</Text>
          </View>
          <View style={styles.voyageLine}>
            <View style={styles.line} />
            <Ionicons name="arrow-forward" size={16} color="#1E90FF" />
            <View style={styles.line} />
          </View>
          <View style={styles.voyagePoint}>
            <View style={styles.pointArrivee} />
            <Text style={styles.voyageVille}>{item.ville_arrivee}</Text>
          </View>
        </View>

        <View style={styles.voyageInfo}>
          <View style={styles.infoBadge}>
            <Ionicons name="bus" size={14} color="#1E90FF" />
            <Text style={styles.infoBadgeText}>{item.numero_bus}</Text>
          </View>
          <View style={styles.infoBadge}>
            <Ionicons name="star" size={14} color="#FF9800" />
            <Text style={styles.infoBadgeText}>{item.type}</Text>
          </View>
        </View>

        <View style={styles.voyageFooter}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Prix</Text>
            <Text style={styles.priceValue}>{item.prix} FCFA</Text>
          </View>
          
          <View style={styles.seatsContainer}>
            <Ionicons name="people" size={16} color={item.places_disponibles < 5 ? "#FF9800" : "green"} />
            <Text style={[
              styles.seatsText,
              item.places_disponibles < 5 && styles.limitedSeatsText
            ]}>
              {item.places_disponibles} places
            </Text>
            {item.places_disponibles < 5 && (
              <View style={styles.limitedBadge}>
                <Text style={styles.limitedBadgeText}>Dernières places !</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderSiegeItem = (siege) => (
    <TouchableOpacity
      key={siege.id}
      style={[
        styles.siege,
        selectedSiege === siege.siege_id && styles.siegeSelected,
        siege.statut !== 'disponible' && styles.siegeDisabled
      ]}
      disabled={siege.statut !== 'disponible'}
      onPress={() => selectSiege(siege)}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.siegeText,
        siege.statut !== 'disponible' && styles.siegeDisabledText,
        selectedSiege === siege.siege_id && styles.siegeSelectedText
      ]}>
        {siege.numero_siege}
      </Text>
      {siege.type_siege === 'vip' && (
        <View style={styles.vipBadge}>
          <Text style={styles.vipBadgeText}>VIP</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderPaymentMethodItem = (method) => (
    <TouchableOpacity
      key={method.id}
      style={[
        styles.paymentMethodCard,
        !method.disponible && styles.paymentMethodDisabled
      ]}
      onPress={() => selectPaymentMethod(method)}
      activeOpacity={0.7}
      disabled={!method.disponible}
    >
      <View style={styles.paymentMethodContent}>
        <View style={[styles.paymentMethodIcon, { backgroundColor: method.color }]}>
          <Ionicons name={method.icon} size={30} color="#fff" />
        </View>
        <View style={styles.paymentMethodInfo}>
          <Text style={[styles.paymentMethodLabel, { color: method.color }]}>{method.label}</Text>
          <Text style={styles.paymentMethodDescription}>{method.description}</Text>
          {!method.disponible && (
            <Text style={styles.paymentMethodUnavailable}>⏳ Bientôt disponible</Text>
          )}
        </View>
        <View style={[styles.paymentMethodArrow, { backgroundColor: method.color + '20' }]}>
          <Ionicons name="chevron-forward" size={24} color={method.disponible ? method.color : '#ccc'} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#1E90FF" barStyle="light-content" />
      
      {/* Header avec icône de notification */}
      <LinearGradient
        colors={['#1E90FF', '#1C86EE', '#1874CD']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Rechercher un trajet</Text>
          <NotificationIcon />
        </View>
        <Text style={styles.headerSubtitle}>
          {filteredTrajets.length} trajet{filteredTrajets.length !== 1 ? 's' : ''} disponible{filteredTrajets.length !== 1 ? 's' : ''}
        </Text>
      </LinearGradient>

      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher départ ou arrivée..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={handleSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtre par date - Visible seulement quand un trajet est sélectionné dans le modal */}
      {trajetModal && (
        <View style={styles.dateFilterContainer}>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar" size={20} color="#1E90FF" />
            <Text style={styles.dateButtonText}>
              {dateFilter ? formatDateForDisplay(dateFilter) : "Choisir une date"}
            </Text>
          </TouchableOpacity>
          
          {dateFilter && (
            <TouchableOpacity 
              style={styles.clearDateButton}
              onPress={clearDateFilter}
            >
              <Ionicons name="close-circle" size={20} color="#F44336" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {showDatePicker && (
        <DateTimePicker
          value={dateFilter || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}

      <View style={styles.container}>
        {filteredTrajets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bus-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>Aucun trajet disponible</Text>
            <Text style={styles.emptySubtext}>Les nouveaux trajets apparaîtront ici</Text>
          </View>
        ) : (
          <FlatList
            data={filteredTrajets}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderTrajetItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      <Navbar />

      {/* MODAL 1: DÉTAILS DU TRAJET */}
      <Modal visible={trajetModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setTrajetModal(false)} style={styles.modalBackButton}>
                <Ionicons name="arrow-back" size={24} color="#1E90FF" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {selectedTrajet?.ville_depart} → {selectedTrajet?.ville_arrivee}
              </Text>
              <TouchableOpacity onPress={() => setTrajetModal(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="red" />
              </TouchableOpacity>
            </View>
            
            {/* Filtre date dans le modal */}
            <View style={styles.modalDateFilter}>
              <TouchableOpacity 
                style={styles.modalDateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={20} color="#1E90FF" />
                <Text style={styles.modalDateButtonText}>
                  {dateFilter ? formatDateForDisplay(dateFilter) : "Filtrer par date"}
                </Text>
              </TouchableOpacity>
              
              {dateFilter && (
                <TouchableOpacity onPress={clearDateFilter}>
                  <Ionicons name="close-circle" size={20} color="#F44336" />
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.modalSubtitle}>
              {filteredVoyages.length} voyage{filteredVoyages.length !== 1 ? 's' : ''} disponible{filteredVoyages.length !== 1 ? 's' : ''}
            </Text>

            {loadingVoyages ? (
              <ActivityIndicator size="large" color="#1E90FF" />
            ) : filteredVoyages.length === 0 ? (
              <View style={styles.emptyVoyageContainer}>
                <Ionicons name="calendar-outline" size={50} color="#ccc" />
                <Text style={styles.emptyVoyageText}>
                  {dateFilter ? "Aucun voyage pour cette date" : "Aucun voyage disponible"}
                </Text>
                {dateFilter && (
                  <TouchableOpacity style={styles.resetDateButton} onPress={clearDateFilter}>
                    <Text style={styles.resetDateButtonText}>Voir tous les voyages</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <FlatList
                data={filteredVoyages}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderVoyageItem}
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 350 }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 2: CONFIRMATION VOYAGE */}
      <Modal visible={voyageModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setVoyageModal(false)} style={styles.modalBackButton}>
                <Ionicons name="arrow-back" size={24} color="#1E90FF" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Voyage sélectionné</Text>
              <TouchableOpacity onPress={() => setVoyageModal(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="red" />
              </TouchableOpacity>
            </View>
            
            {selectedVoyage && (
              <ScrollView>
                <View style={styles.voyageDetailCard}>
                  <View style={styles.voyageDetailHeader}>
                    <Ionicons name="bus" size={40} color="#1E90FF" />
                    <View style={styles.voyageDetailRoute}>
                      <Text style={styles.voyageDetailVilles}>
                        {selectedTrajet?.ville_depart} → {selectedTrajet?.ville_arrivee}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.voyageDetailInfo}>
                    <View style={styles.voyageDetailRow}>
                      <Ionicons name="calendar" size={20} color="#1E90FF" />
                      <Text style={styles.voyageDetailLabel}>Départ:</Text>
                      <Text style={styles.voyageDetailValue}>
                        {new Date(selectedVoyage.heure_depart).toLocaleString()}
                      </Text>
                    </View>
                    
                    <View style={styles.voyageDetailRow}>
                      <Ionicons name="calendar" size={20} color="#1E90FF" />
                      <Text style={styles.voyageDetailLabel}>Arrivée:</Text>
                      <Text style={styles.voyageDetailValue}>
                        {new Date(selectedVoyage.heure_arrivee).toLocaleString()}
                      </Text>
                    </View>
                    
                    <View style={styles.voyageDetailRow}>
                      <Ionicons name="bus" size={20} color="#1E90FF" />
                      <Text style={styles.voyageDetailLabel}>Bus:</Text>
                      <Text style={styles.voyageDetailValue}>
                        {selectedVoyage.numero_bus} ({selectedVoyage.type})
                      </Text>
                    </View>
                    
                    <View style={styles.voyageDetailRow}>
                      <Ionicons name="cash" size={20} color="#1E90FF" />
                      <Text style={styles.voyageDetailLabel}>Prix:</Text>
                      <Text style={styles.voyageDetailPrice}>{selectedVoyage.prix} FCFA</Text>
                    </View>

                    <View style={styles.voyageDetailRow}>
                      <Ionicons name="people" size={20} color={selectedVoyage.places_disponibles < 5 ? "#FF9800" : "green"} />
                      <Text style={styles.voyageDetailLabel}>Places:</Text>
                      <Text style={[
                        styles.voyageDetailValue,
                        selectedVoyage.places_disponibles < 5 && styles.limitedSeatsText
                      ]}>
                        {selectedVoyage.places_disponibles} disponibles
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.voyageDetailButton} onPress={voirSieges}>
                    <LinearGradient
                      colors={['#1E90FF', '#1874CD']}
                      style={styles.gradientButton}
                    >
                      <Text style={styles.buttonText}>Voir les sièges disponibles</Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 3: SÉLECTION DES SIÈGES */}
      <Modal visible={siegeModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, styles.siegeModalContent]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSiegeModal(false)} style={styles.modalBackButton}>
                <Ionicons name="arrow-back" size={24} color="#1E90FF" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Choisissez votre siège</Text>
              <TouchableOpacity onPress={() => setSiegeModal(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="red" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.siegeInfo}>
              <Ionicons name="bus" size={20} color="#1E90FF" />
              <Text style={styles.siegeInfoText}>
                {selectedTrajet?.ville_depart} → {selectedTrajet?.ville_arrivee}
              </Text>
            </View>
            <Text style={styles.siegeBusInfo}>Bus: {selectedVoyage?.numero_bus}</Text>

            {loadingSieges ? (
              <ActivityIndicator size="large" color="#1E90FF" />
            ) : (
              <>
                <ScrollView style={styles.siegeGrid}>
                  <View style={styles.siegeContainer}>
                    {sieges.map(renderSiegeItem)}
                  </View>
                </ScrollView>

                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: "#eee" }]} />
                    <Text style={styles.legendText}>Disponible</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: "#1E90FF" }]} />
                    <Text style={styles.legendText}>Sélectionné</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: "#ccc" }]} />
                    <Text style={styles.legendText}>Réservé</Text>
                  </View>
                </View>

                {selectedSiegeDetails && (
                  <View style={styles.selectedSiegeInfo}>
                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                    <Text style={styles.selectedSiegeText}>
                      Siège {selectedSiegeDetails.numero_siege} sélectionné
                    </Text>
                  </View>
                )}

                <TouchableOpacity 
                  style={[styles.reserveBtn, !selectedSiege && styles.btnDisabled]} 
                  onPress={openPaymentMethodModal}
                  disabled={!selectedSiege}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={selectedSiege ? ['#1E90FF', '#1874CD'] : ['#ccc', '#bbb']}
                    style={styles.gradientButton}
                  >
                    <Text style={styles.buttonText}>
                      {selectedSiege ? "Choisir le mode de paiement" : "Sélectionnez un siège"}
                    </Text>
                    {selectedSiege && <Ionicons name="arrow-forward" size={20} color="#fff" />}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 4: SÉLECTION DU MODE DE PAIEMENT */}
      <Modal visible={paymentMethodModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => {
                setPaymentMethodModal(false);
                setSiegeModal(true);
              }} style={styles.modalBackButton}>
                <Ionicons name="arrow-back" size={24} color="#1E90FF" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Mode de paiement</Text>
              <TouchableOpacity onPress={() => {
                setPaymentMethodModal(false);
                setSiegeModal(true);
              }} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="red" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.paymentInfo}>
              <View style={styles.paymentInfoRow}>
                <Ionicons name="bus" size={16} color="#666" />
                <Text style={styles.paymentInfoText}>
                  {selectedTrajet?.ville_depart} → {selectedTrajet?.ville_arrivee}
                </Text>
              </View>
              <View style={styles.paymentInfoRow}>
                <Ionicons name="grid-outline" size={16} color="#666" />
                <Text style={styles.paymentInfoText}>Siège: {selectedSiegeDetails?.numero_siege}</Text>
              </View>
              <View style={styles.paymentInfoRow}>
                <Ionicons name="cash" size={16} color="#1E90FF" />
                <Text style={styles.paymentInfoPrice}>Total: {selectedVoyage?.prix} FCFA</Text>
              </View>
            </View>

            <ScrollView style={styles.paymentMethodsList}>
              {paymentMethods.map(renderPaymentMethodItem)}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 5: MODE DE PAIEMENT INDISPONIBLE */}
      <Modal visible={unavailableModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, styles.unavailableModalContent]}>
            <View style={styles.unavailableIcon}>
              <Ionicons name="time" size={60} color="#FF9800" />
            </View>
            <Text style={styles.unavailableTitle}>Mode de paiement indisponible</Text>
            <Text style={styles.unavailableText}>
              {unavailableMethod?.label} est momentanément indisponible.
            </Text>
            <Text style={styles.unavailableSubtext}>
              Veuillez utiliser le paiement en espèces pour le moment.
            </Text>
            <TouchableOpacity
              style={styles.unavailableButton}
              onPress={() => {
                setUnavailableModal(false);
                setPaymentMethodModal(true);
              }}
            >
              <LinearGradient
                colors={['#1E90FF', '#1874CD']}
                style={styles.gradientButton}
              >
                <Text style={styles.buttonText}>Compris</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 6: CONFIRMATION PAIEMENT */}
      <Modal visible={paymentModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => {
                setPaymentModal(false);
                setPaymentMethodModal(true);
              }} style={styles.modalBackButton}>
                <Ionicons name="arrow-back" size={24} color="#1E90FF" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Confirmation</Text>
              <TouchableOpacity onPress={() => setPaymentModal(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="red" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.confirmationContainer}>
              <View style={styles.confirmationIcon}>
                <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
              </View>
              
              <Text style={styles.confirmationSubtitle}>Récapitulatif de votre réservation</Text>
              
              <View style={styles.confirmationDetails}>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>Trajet</Text>
                  <Text style={styles.confirmationValue}>
                    {selectedTrajet?.ville_depart} → {selectedTrajet?.ville_arrivee}
                  </Text>
                </View>
                
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>Date</Text>
                  <Text style={styles.confirmationValue}>
                    {new Date(selectedVoyage?.heure_depart).toLocaleString()}
                  </Text>
                </View>
                
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>Siège</Text>
                  <Text style={styles.confirmationValue}>{selectedSiegeDetails?.numero_siege}</Text>
                </View>
                
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>Paiement</Text>
                  <View style={styles.confirmationPaymentMethod}>
                    <View style={[styles.paymentDot, { backgroundColor: selectedPaymentMethod?.color }]} />
                    <Text style={[styles.confirmationValue, { color: selectedPaymentMethod?.color }]}>
                      {selectedPaymentMethod?.label}
                    </Text>
                  </View>
                </View>
                
                <View style={[styles.confirmationRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total à payer</Text>
                  <Text style={styles.totalPrice}>{selectedVoyage?.prix} FCFA</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.confirmPaymentBtn}
                onPress={handleReservation}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[selectedPaymentMethod?.color || '#1E90FF', '#1874CD']}
                  style={styles.gradientButton}
                >
                  <Text style={styles.buttonText}>Confirmer la réservation</Text>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setPaymentModal(false)}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 7: CONFIRMATION FINALE */}
      <Modal visible={confirmationModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ width: 24 }} />
              <Text style={[styles.modalTitle, { color: "green" }]}>✅ Réservation confirmée !</Text>
              <TouchableOpacity onPress={resetAndClose} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="red" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
              </View>
              
              <Text style={styles.successTitle}>
                Votre réservation a été enregistrée avec succès
              </Text>
              
              <View style={styles.successDetails}>
                <View style={styles.successRow}>
                  <Ionicons name="ticket" size={20} color="#1E90FF" />
                  <Text style={styles.successLabel}>Code de réservation</Text>
                </View>
                <View style={styles.successCodeContainer}>
                  <Text style={styles.successCode}>{reservationCode}</Text>
                </View>
              </View>
              
              <View style={styles.successInfo}>
                <View style={styles.successInfoRow}>
                  <Ionicons name="cash" size={16} color="#4CAF50" />
                  <Text style={styles.successInfoText}>
                    Paiement: {selectedPaymentMethod?.label}
                  </Text>
                </View>
                <View style={styles.successInfoRow}>
                  <Ionicons name="time" size={16} color="#FF9800" />
                  <Text style={styles.successInfoText}>
                    Veuillez présenter ce code au chauffeur
                  </Text>
                </View>
                <View style={styles.successInfoRow}>
                  <Ionicons name="notifications" size={16} color="#1E90FF" />
                  <Text style={styles.successInfoText}>
                    Une notification de confirmation a été envoyée
                  </Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.closeBtn}
                onPress={resetAndClose}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#1E90FF', '#1874CD']}
                  style={styles.gradientButton}
                >
                  <Text style={styles.buttonText}>Fermer</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  clearButton: {
    padding: 5,
  },
  dateFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E90FF',
    marginRight: 10,
  },
  dateButtonText: {
    marginLeft: 8,
    color: '#1E90FF',
    fontSize: 14,
  },
  clearDateButton: {
    padding: 5,
  },
  container: { 
    flex: 1, 
    padding: 15, 
    backgroundColor: "#f5f5f5",
  },
  listContent: {
    paddingBottom: 80,
  },
  card: { 
    marginBottom: 15, 
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardGradient: {
    padding: 15,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  routeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1E90FF20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  routeContainer: {
    flex: 1,
  },
  route: { 
    fontSize: 18, 
    fontWeight: "bold", 
    color: "#1E90FF",
  },
  cardFooter: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  price: { 
    fontSize: 16, 
    fontWeight: "bold", 
    color: "#1E90FF",
    marginLeft: 5,
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  distance: { 
    color: "#666",
    marginLeft: 5,
  },
  durationContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  duration: { 
    color: "#666", 
    fontSize: 12,
    marginLeft: 5,
  },
  
  // Styles pour les voyages
  voyageCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  voyageGradient: {
    padding: 15,
  },
  voyageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  voyageDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E90FF10",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  voyageDate: {
    marginLeft: 5,
    color: "#1E90FF",
    fontWeight: "500",
  },
  voyageTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E90FF10",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  voyageTime: {
    marginLeft: 5,
    color: "#1E90FF",
    fontWeight: "500",
  },
  voyageRoute: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  voyagePoint: {
    alignItems: "center",
    flex: 1,
  },
  pointDepart: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4CAF50",
    marginBottom: 5,
  },
  pointArrivee: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#F44336",
    marginBottom: 5,
  },
  voyageVille: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  voyageLine: {
    flexDirection: "row",
    alignItems: "center",
    flex: 2,
    paddingHorizontal: 10,
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: "#1E90FF30",
  },
  voyageInfo: {
    flexDirection: "row",
    marginBottom: 12,
  },
  infoBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 10,
  },
  infoBadgeText: {
    marginLeft: 5,
    color: "#666",
    fontSize: 12,
  },
  voyageFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  priceLabel: {
    fontSize: 12,
    color: "#999",
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E90FF",
  },
  seatsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  seatsText: {
    marginLeft: 5,
    color: "green",
    fontWeight: "500",
  },
  limitedSeatsText: {
    color: "#FF9800",
    fontWeight: "bold",
  },
  limitedBadge: {
    backgroundColor: "#FF9800",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  limitedBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  
  // Modals
  modalContainer: { 
    flex: 1, 
    justifyContent: "center", 
    backgroundColor: "rgba(0,0,0,0.5)", 
    padding: 20 
  },
  modalContent: { 
    backgroundColor: "#fff", 
    padding: 20, 
    borderRadius: 20, 
    maxHeight: "80%" 
  },
  siegeModalContent: { 
    maxHeight: "85%" 
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee"
  },
  modalBackButton: { 
    padding: 5,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseButton: { 
    padding: 5,
    backgroundColor: "#ffebee",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: "bold", 
    textAlign: "center", 
    flex: 1 
  },
  modalSubtitle: { 
    fontSize: 14, 
    color: "#666", 
    marginBottom: 15, 
    textAlign: "center" 
  },
  
  // Styles pour le filtre date dans le modal
  modalDateFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f8ff',
    padding: 10,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#1E90FF20',
  },
  modalDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalDateButtonText: {
    marginLeft: 8,
    color: '#1E90FF',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Voyage detail
  voyageDetailCard: {
    padding: 10,
  },
  voyageDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  voyageDetailRoute: {
    marginLeft: 15,
    flex: 1,
  },
  voyageDetailVilles: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E90FF",
  },
  voyageDetailInfo: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  voyageDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  voyageDetailLabel: {
    width: 70,
    fontSize: 14,
    color: "#666",
    marginLeft: 10,
  },
  voyageDetailValue: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  voyageDetailPrice: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E90FF",
  },
  voyageDetailButton: {
    marginTop: 10,
    borderRadius: 10,
    overflow: "hidden",
  },
  
  // Sièges
  siegeInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  siegeInfoText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 8,
    fontWeight: "500",
  },
  siegeBusInfo: {
    textAlign: "center",
    color: "#666",
    marginBottom: 15,
  },
  siegeContainer: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    justifyContent: "center", 
    marginTop: 10 
  },
  siege: { 
    width: 55, 
    height: 55, 
    margin: 6, 
    backgroundColor: "#f0f0f0", 
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  siegeText: { 
    fontWeight: "bold",
    fontSize: 14,
    color: "#333",
  },
  siegeSelected: { 
    backgroundColor: "#1E90FF",
    transform: [{ scale: 1.05 }],
  },
  siegeSelectedText: { 
    color: "#fff",
    fontWeight: "bold",
  },
  siegeDisabled: { 
    backgroundColor: "#e0e0e0", 
    opacity: 0.7,
  },
  siegeDisabledText: { 
    color: "#999",
    textDecorationLine: "line-through",
  },
  vipBadge: { 
    position: "absolute", 
    top: -8, 
    right: -8, 
    backgroundColor: "#FFD700", 
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fff",
  },
  vipBadgeText: {
    color: "#333",
    fontSize: 8,
    fontWeight: "bold",
  },
  siegeGrid: { 
    maxHeight: 350, 
    marginVertical: 10 
  },
  
  // Légende
  legend: { 
    flexDirection: "row", 
    justifyContent: "space-around", 
    marginVertical: 15, 
    flexWrap: "wrap",
    backgroundColor: "#f9f9f9",
    padding: 10,
    borderRadius: 10,
  },
  legendItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginHorizontal: 5 
  },
  legendColor: { 
    width: 20, 
    height: 20, 
    borderRadius: 6, 
    marginRight: 8,
    elevation: 1,
  },
  legendText: {
    fontSize: 12,
    color: "#666",
  },
  
  // Boutons
  reserveBtn: { 
    marginTop: 15,
    borderRadius: 10,
    overflow: "hidden",
  },
  confirmBtn: { 
    marginTop: 15,
    borderRadius: 10,
    overflow: "hidden",
  },
  btnDisabled: { 
    opacity: 0.6,
  },
  gradientButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 8,
  },
  
  // Info
  infoRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginVertical: 5 
  },
  infoValue: { 
    fontWeight: "bold" 
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  emptyVoyageContainer: {
    alignItems: "center",
    padding: 30,
  },
  emptyVoyageText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 15,
    fontWeight: "500",
    marginBottom: 15,
  },
  resetDateButton: {
    backgroundColor: "#1E90FF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  resetDateButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  emptyText: { 
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  selectedSiegeInfo: {
    marginTop: 10,
    padding: 12,
    backgroundColor: "#e8f5e8",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedSiegeText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "600",
  },
  
  // Styles pour les méthodes de paiement
  paymentMethodsList: {
    maxHeight: 400,
  },
  paymentMethodCard: {
    marginBottom: 12,
    borderRadius: 15,
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  paymentMethodDisabled: {
    opacity: 0.6,
  },
  paymentMethodContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
  },
  paymentMethodIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    elevation: 2,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodLabel: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  paymentMethodDescription: {
    fontSize: 13,
    color: "#999",
  },
  paymentMethodUnavailable: {
    fontSize: 12,
    color: "#FF9800",
    fontWeight: "500",
    marginTop: 4,
  },
  paymentMethodArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  paymentInfo: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  paymentInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  paymentInfoText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
  },
  paymentInfoPrice: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E90FF",
  },
  
  // Styles pour le modal indisponible
  unavailableModalContent: {
    alignItems: 'center',
    padding: 30,
  },
  unavailableIcon: {
    marginBottom: 20,
  },
  unavailableTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 10,
    textAlign: 'center',
  },
  unavailableText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  unavailableSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
  },
  unavailableButton: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
  },
  
  // Styles pour la confirmation
  confirmationContainer: {
    alignItems: "center",
  },
  confirmationIcon: {
    marginBottom: 15,
  },
  confirmationSubtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },
  confirmationDetails: {
    backgroundColor: "#f9f9f9",
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    width: "100%",
  },
  confirmationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  confirmationLabel: {
    fontSize: 14,
    color: "#666",
  },
  confirmationValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  confirmationPaymentMethod: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: "#1E90FF20",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E90FF",
  },
  confirmPaymentBtn: {
    width: "100%",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 10,
  },
  cancelBtn: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    width: "100%",
  },
  cancelBtnText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  
  // Styles pour la confirmation finale
  successContainer: {
    alignItems: "center",
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: { 
    fontSize: 18, 
    textAlign: "center", 
    marginBottom: 20,
    color: "#333",
    fontWeight: "500",
  },
  successDetails: {
    backgroundColor: "#f0f9f0",
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    width: "100%",
  },
  successRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  successLabel: {
    fontSize: 16,
    color: "#666",
    marginLeft: 10,
  },
  successCodeContainer: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1E90FF20",
  },
  successCode: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E90FF",
    letterSpacing: 1,
  },
  successInfo: {
    marginBottom: 20,
    width: "100%",
  },
  successInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: "#fff5f5",
    padding: 10,
    borderRadius: 8,
  },
  successInfoText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  closeBtn: { 
    width: "100%",
    borderRadius: 10,
    overflow: "hidden",
  },
});