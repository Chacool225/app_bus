// src/screens/Reservations.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Dimensions
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Navbar from "../components/Navbar";
import NotificationIcon from "../components/NotificationIcon";
import API from "../services/api";
import { useAuth } from "../hooks/useAuth";

const { width } = Dimensions.get('window');

export default function Reservations() {
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAuth();
  
  const [reservations, setReservations] = useState([]);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [filterStatus, setFilterStatus] = useState('tous');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchReservations();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    filterReservations();
  }, [filterStatus, reservations, searchQuery]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/reservations/user/${user.id}`);
      let reservationsData = res.data;
      
      const now = new Date();
      const updatedReservations = reservationsData.map(reservation => {
        if (reservation.date_depart && new Date(reservation.date_depart) < now) {
          if (reservation.statut !== 'annule' && reservation.statut !== 'termine') {
            reservation.statut = 'termine';
            // Mise à jour locale uniquement (pas d'appel API)
          }
        }
        return reservation;
      });
      
      setReservations(updatedReservations);
      setFilteredReservations(updatedReservations);
    } catch (err) {
      console.log("Erreur fetchReservations:", err);
      Alert.alert("Erreur", "Impossible de charger vos réservations");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Mise à jour locale du statut
  const updateReservationStatus = (reservationId, newStatus) => {
    setReservations(prev => 
      prev.map(res => 
        res.id === reservationId ? { ...res, statut: newStatus } : res
      )
    );
    console.log(`Statut mis à jour localement: ${reservationId} -> ${newStatus}`);
  };

  const filterReservations = () => {
    let filtered = reservations;
    
    if (filterStatus !== 'tous') {
      filtered = filtered.filter(item => item.statut === filterStatus);
    }
    
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => 
        (item.ville_depart && item.ville_depart.toLowerCase().includes(query)) ||
        (item.ville_arrivee && item.ville_arrivee.toLowerCase().includes(query)) ||
        (item.code_reservation && item.code_reservation.toLowerCase().includes(query)) ||
        (item.nom_passager && item.nom_passager.toLowerCase().includes(query)) ||
        (item.numero_bus && item.numero_bus.toLowerCase().includes(query)) ||
        (item.numero_siege && item.numero_siege.toLowerCase().includes(query))
      );
    }
    
    setFilteredReservations(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReservations();
  };

  const fetchReservationDetails = async (reservationId) => {
    try {
      setLoadingDetails(true);
      const res = await API.get(`/reservations/${reservationId}`);
      
      const reservation = res.data;
      const now = new Date();
      if (reservation.date_depart && new Date(reservation.date_depart) < now) {
        if (reservation.statut !== 'annule' && reservation.statut !== 'termine') {
          reservation.statut = 'termine';
          updateReservationStatus(reservation.id, 'termine');
        }
      }
      
      setSelectedReservation(reservation);
      setModalVisible(true);
    } catch (err) {
      console.log("Erreur fetchDetails:", err);
      Alert.alert("Erreur", "Impossible de charger les détails");
    } finally {
      setLoadingDetails(false);
    }
  };

  const getStatusColor = (statut) => {
    switch (statut) {
      case 'confirme': return '#4CAF50';
      case 'en_attente': return '#FF9800';
      case 'annule': return '#F44336';
      case 'termine': return '#9E9E9E';
      default: return '#666';
    }
  };

  const getStatusText = (statut) => {
    switch (statut) {
      case 'confirme': return 'Confirmé';
      case 'en_attente': return 'En attente';
      case 'annule': return 'Annulé';
      case 'termine': return 'Terminé';
      default: return statut;
    }
  };

  const getPaymentMethodText = (methode) => {
    switch (methode) {
      case 'especes': return '💵 Espèces';
      case 'mobile_money': return '📱 Mobile Money';
      case 'carte_credit': return '💳 Carte de crédit';
      case 'virement_bancaire': return '🏦 Virement bancaire';
      default: return '💵 Espèces';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTimeOnly = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const canCancel = (departDate) => {
    if (!departDate) return false;
    
    const now = new Date();
    const depart = new Date(departDate);
    const diffHours = (depart - now) / (1000 * 60 * 60);
    
    return diffHours > 24;
  };

  const handleCancelReservation = async (reservation) => {
    if (!canCancel(reservation.date_depart)) {
      Alert.alert(
        "Annulation impossible",
        "Les réservations ne peuvent être annulées que jusqu'à 24h avant le départ."
      );
      return;
    }

    Alert.alert(
      "Annuler la réservation",
      "Êtes-vous sûr de vouloir annuler cette réservation ?",
      [
        { text: "Non", style: "cancel" },
        { 
          text: "Oui", 
          onPress: async () => {
            try {
              // Appel API pour annuler la réservation
              await API.put(`/reservations/${reservation.id}/cancel`);
              
              // Mise à jour locale
              updateReservationStatus(reservation.id, 'annule');
              
              Alert.alert(
                "Succès", 
                "Réservation annulée avec succès",
                [
                  { 
                    text: "OK", 
                    onPress: () => {
                      setModalVisible(false);
                      fetchReservations();
                    }
                  }
                ]
              );
            } catch (err) {
              console.log("Erreur annulation:", err);
              Alert.alert("Erreur", "Impossible d'annuler la réservation");
            }
          }
        }
      ]
    );
  };

  const getCountByStatus = (status) => {
    if (status === 'tous') return reservations.length;
    return reservations.filter(r => r.statut === status).length;
  };

  const renderReservationItem = ({ item }) => (
    <TouchableOpacity
      style={styles.reservationCard}
      onPress={() => fetchReservationDetails(item.id)}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <View style={styles.routeContainer}>
            <Text style={styles.route} numberOfLines={1}>
              {item.ville_depart} → {item.ville_arrivee}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.statut) }]}>
            <Text style={styles.statusText}>{getStatusText(item.statut)}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              {formatDateOnly(item.date_depart)}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              {formatTimeOnly(item.date_depart)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="bus-outline" size={16} color="#666" />
            <Text style={styles.infoText}>Bus {item.numero_bus}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="grid-outline" size={16} color="#666" />
            <Text style={styles.infoText}>Siège {item.numero_siege}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color="#666" />
            <Text style={styles.infoText} numberOfLines={1}>{item.nom_passager}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.priceLabel}>Prix total</Text>
            <Text style={styles.priceValue}>{item.prix_total} FCFA</Text>
          </View>
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>Code</Text>
            <Text style={styles.codeValue} numberOfLines={1}>{item.code_reservation}</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header avec icône de notification (comme sur Trajets) */}
      <LinearGradient
        colors={['#1E90FF', '#1C86EE', '#1874CD']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Mes Réservations</Text>
            <Text style={styles.headerSubtitle}>
              {reservations.length} réservation{reservations.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <NotificationIcon />
        </View>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher (ville, code, nom, bus...)"
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContentContainer}
        >
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'tous' && styles.filterButtonActive]}
            onPress={() => setFilterStatus('tous')}
          >
            <Text style={[styles.filterText, filterStatus === 'tous' && styles.filterTextActive]}>
              Tous ({getCountByStatus('tous')})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'confirme' && styles.filterButtonActive]}
            onPress={() => setFilterStatus('confirme')}
          >
            <Text style={[styles.filterText, filterStatus === 'confirme' && styles.filterTextActive]}>
              Confirmé ({getCountByStatus('confirme')})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'en_attente' && styles.filterButtonActive]}
            onPress={() => setFilterStatus('en_attente')}
          >
            <Text style={[styles.filterText, filterStatus === 'en_attente' && styles.filterTextActive]}>
              En attente ({getCountByStatus('en_attente')})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'termine' && styles.filterButtonActive]}
            onPress={() => setFilterStatus('termine')}
          >
            <Text style={[styles.filterText, filterStatus === 'termine' && styles.filterTextActive]}>
              Historique ({getCountByStatus('termine')})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'annule' && styles.filterButtonActive]}
            onPress={() => setFilterStatus('annule')}
          >
            <Text style={[styles.filterText, filterStatus === 'annule' && styles.filterTextActive]}>
              Annulé ({getCountByStatus('annule')})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.contentContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E90FF" />
          </View>
        ) : filteredReservations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="ticket-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>Aucune réservation</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Aucun résultat pour votre recherche' : 
                filterStatus !== 'tous' 
                  ? `Aucune réservation ${filterStatus === 'confirme' ? 'confirmée' : 
                     filterStatus === 'en_attente' ? 'en attente' :
                     filterStatus === 'termine' ? 'terminée' : 'annulée'}`
                  : 'Vos réservations apparaîtront ici'}
            </Text>
            {!searchQuery && filterStatus === 'tous' && (
              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => navigation.navigate('Trajets')}
              >
                <Text style={styles.bookButtonText}>Réserver un trajet</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredReservations}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderReservationItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                colors={['#1E90FF']}
                tintColor="#1E90FF"
              />
            }
          />
        )}
      </View>

      {/* Modal de détails */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {loadingDetails ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#1E90FF" />
                <Text>Chargement des détails...</Text>
              </View>
            ) : selectedReservation && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Détails de la réservation</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color="red" />
                  </TouchableOpacity>
                </View>

                <View style={styles.codeSection}>
                  <Text style={styles.codeSectionLabel}>Code de réservation</Text>
                  <View style={styles.codeDisplay}>
                    <Text style={styles.codeDisplayText}>
                      {selectedReservation.code_reservation}
                    </Text>
                  </View>
                </View>

                <View style={styles.qrSection}>
                  <Text style={styles.qrLabel}>Code QR</Text>
                  <View style={[
                    styles.qrPlaceholder,
                    selectedReservation.statut === 'annule' && styles.qrPlaceholderAnnule,
                    selectedReservation.statut === 'termine' && styles.qrPlaceholderTermine
                  ]}>
                    <Ionicons 
                      name="qr-code" 
                      size={80} 
                      color={
                        selectedReservation.statut === 'annule' ? "#F44336" :
                        selectedReservation.statut === 'termine' ? "#9E9E9E" : "#1E90FF"
                      } 
                    />
                    <Text style={[
                      styles.qrText,
                      selectedReservation.statut === 'annule' && styles.qrTextAnnule,
                      selectedReservation.statut === 'termine' && styles.qrTextTermine
                    ]}>
                      {selectedReservation.statut === 'annule' ? 'QR Code (Annulé)' : 
                       selectedReservation.statut === 'termine' ? 'QR Code (Terminé)' : 'QR Code'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.sectionTitle}>Informations du voyage</Text>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="location" size={20} color="#1E90FF" />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Trajet</Text>
                      <Text style={styles.detailValue}>
                        {selectedReservation.ville_depart} → {selectedReservation.ville_arrivee}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="calendar" size={20} color="#1E90FF" />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Date de départ</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(selectedReservation.date_depart)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="bus" size={20} color="#1E90FF" />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Bus</Text>
                      <Text style={styles.detailValue}>
                        {selectedReservation.numero_bus} ({selectedReservation.type_bus || 'Standard'})
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.sectionTitle}>Informations du passager</Text>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="person" size={20} color="#1E90FF" />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Nom</Text>
                      <Text style={styles.detailValue}>
                        {selectedReservation.nom_passager}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="call" size={20} color="#1E90FF" />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Téléphone</Text>
                      <Text style={styles.detailValue}>
                        {selectedReservation.telephone_passager}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="mail" size={20} color="#1E90FF" />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Email</Text>
                      <Text style={styles.detailValue}>
                        {selectedReservation.email_passager || 'Non renseigné'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="grid-outline" size={20} color="#1E90FF" />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Siège</Text>
                      <Text style={styles.detailValue}>
                        {selectedReservation.numero_siege} ({selectedReservation.type_siege || 'Standard'})
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.sectionTitle}>Paiement</Text>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="cash" size={20} color="#1E90FF" />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Mode de paiement</Text>
                      <Text style={styles.detailValue}>
                        {getPaymentMethodText(selectedReservation.methode_paiement)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="cash" size={20} color="#1E90FF" />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Montant total</Text>
                      <Text style={styles.priceDetail}>
                        {selectedReservation.prix_total} FCFA
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="time" size={20} color="#1E90FF" />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Réservé le</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(selectedReservation.date_creation)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Statut</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedReservation.statut) }]}>
                      <Text style={styles.statusText}>{getStatusText(selectedReservation.statut)}</Text>
                    </View>
                  </View>
                </View>

                {selectedReservation.statut === 'confirme' && canCancel(selectedReservation.date_depart) && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleCancelReservation(selectedReservation)}
                  >
                    <Text style={styles.cancelButtonText}>Annuler la réservation</Text>
                  </TouchableOpacity>
                )}

                {selectedReservation.statut === 'annule' && (
                  <View style={styles.cancelInfoContainer}>
                    <Ionicons name="information-circle" size={24} color="#F44336" />
                    <Text style={styles.cancelInfoText}>
                      Cette réservation a été annulée.
                    </Text>
                  </View>
                )}

                {selectedReservation.statut === 'termine' && (
                  <View style={styles.termineInfoContainer}>
                    <Ionicons name="checkmark-done-circle" size={24} color="#9E9E9E" />
                    <Text style={styles.termineInfoText}>
                      Ce voyage est terminé
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeModalButtonText}>Fermer</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Navbar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
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
  filterWrapper: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 5,
  },
  filterContentContainer: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    gap: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    minWidth: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonActive: {
    backgroundColor: "#1E90FF",
  },
  filterText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
    textAlign: "center",
  },
  filterTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    padding: 15,
    paddingBottom: 80,
  },
  reservationCard: {
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  routeContainer: {
    flex: 1,
    marginRight: 10,
  },
  route: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E90FF",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  cardBody: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  infoText: {
    marginLeft: 8,
    color: "#666",
    fontSize: 14,
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 12,
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
  codeContainer: {
    alignItems: "flex-end",
    flex: 1,
    marginLeft: 10,
  },
  codeLabel: {
    fontSize: 12,
    color: "#999",
  },
  codeValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#666",
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  bookButton: {
    backgroundColor: "#1E90FF",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  bookButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  
  // Styles du modal
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
    maxHeight: "90%",
  },
  modalLoading: {
    padding: 40,
    alignItems: "center",
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
    fontSize: 22,
    fontWeight: "bold",
    color: "#1E90FF",
    flex: 1,
  },
  codeSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  codeSectionLabel: {
    fontSize: 14,
    color: "#999",
    marginBottom: 5,
  },
  codeDisplay: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
  },
  codeDisplayText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E90FF",
  },
  qrSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  qrLabel: {
    fontSize: 14,
    color: "#999",
    marginBottom: 10,
  },
  qrPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  qrPlaceholderAnnule: {
    backgroundColor: "#ffebee",
    borderWidth: 1,
    borderColor: "#F44336",
  },
  qrPlaceholderTermine: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#9E9E9E",
  },
  qrText: {
    marginTop: 5,
    color: "#666",
    fontSize: 10,
  },
  qrTextAnnule: {
    color: "#F44336",
    fontWeight: "bold",
  },
  qrTextTermine: {
    color: "#9E9E9E",
    fontWeight: "bold",
  },
  detailsSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E90FF",
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  detailContent: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: "#999",
  },
  detailValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  priceDetail: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E90FF",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  statusLabel: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  cancelButton: {
    backgroundColor: "#F44336",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffebee",
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  cancelInfoText: {
    marginLeft: 10,
    color: "#F44336",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  termineInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  termineInfoText: {
    marginLeft: 10,
    color: "#9E9E9E",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  closeModalButton: {
    backgroundColor: "#f0f0f0",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  closeModalButtonText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "bold",
  },
});