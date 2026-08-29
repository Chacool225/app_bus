import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from "@react-navigation/native";
import API from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function NotificationIcon() {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'

  // Icônes locales
  const iconNoNotif = require("../images/icons/pnotif.png");
  const iconWithNotif = require("../images/icons/notif.png");

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadCount();
      
      // Rafraîchir les notifications toutes les 30 secondes
      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    // Filtrer les notifications quand le filtre change
    filterNotifications();
  }, [filter, notifications]);

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const res = await API.get(`/notifications/user/${user.id}`);
      setNotifications(res.data);
    } catch (err) {
      console.log("Erreur fetchNotifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!user) return;
    
    try {
      const res = await API.get(`/notifications/user/${user.id}/count`);
      setUnreadCount(res.data.count);
    } catch (err) {
      console.log("Erreur fetchUnreadCount:", err);
    }
  };

  const filterNotifications = () => {
    if (filter === 'all') {
      setFilteredNotifications(notifications);
    } else if (filter === 'unread') {
      setFilteredNotifications(notifications.filter(n => !n.lu));
    } else if (filter === 'read') {
      setFilteredNotifications(notifications.filter(n => n.lu));
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await API.put(`/notifications/${notificationId}/read`);
      
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, lu: 1 } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.log("Erreur markAsRead:", err);
    }
  };

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    
    try {
      await API.put(`/notifications/user/${user.id}/read-all`);
      
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, lu: 1 }))
      );
      setUnreadCount(0);
      Alert.alert("Succès", "Toutes les notifications ont été marquées comme lues");
    } catch (err) {
      console.log("Erreur markAllAsRead:", err);
    }
  };

  const deleteNotification = async (notificationId) => {
    Alert.alert(
      "Supprimer",
      "Voulez-vous supprimer cette notification ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          onPress: async () => {
            try {
              await API.delete(`/notifications/${notificationId}`);
              
              const deletedNotif = notifications.find(n => n.id === notificationId);
              setNotifications(prev => prev.filter(n => n.id !== notificationId));
              
              if (deletedNotif && !deletedNotif.lu) {
                setUnreadCount(prev => Math.max(0, prev - 1));
              }

              // Fermer le modal de détails si la notification supprimée était sélectionnée
              if (selectedNotification && selectedNotification.id === notificationId) {
                setDetailModalVisible(false);
                setSelectedNotification(null);
              }
            } catch (err) {
              console.log("Erreur deleteNotification:", err);
              Alert.alert("Erreur", "Impossible de supprimer la notification");
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const clearReadNotifications = async () => {
    if (!user) return;
    
    Alert.alert(
      "Nettoyer",
      "Voulez-vous supprimer toutes les notifications lues ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Nettoyer",
          onPress: async () => {
            try {
              await API.delete(`/notifications/user/${user.id}/clear-read`);
              setNotifications(prev => prev.filter(n => !n.lu));
              
              // Fermer le modal de détails si la notification affichée a été supprimée
              if (selectedNotification && selectedNotification.lu) {
                setDetailModalVisible(false);
                setSelectedNotification(null);
              }
            } catch (err) {
              console.log("Erreur clearReadNotifications:", err);
              Alert.alert("Erreur", "Impossible de nettoyer les notifications");
            }
          }
        }
      ]
    );
  };

  const openModal = () => {
    setModalVisible(true);
    fetchNotifications(); // Rafraîchir à l'ouverture
  };

  const handleNotificationPress = async (item) => {
    // Marquer comme lu si ce n'est pas déjà fait
    if (!item.lu) {
      await markAsRead(item.id);
    }
    
    // Ouvrir le modal de détails
    setSelectedNotification(item);
    setDetailModalVisible(true);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'succes': return 'checkmark-circle';
      case 'avertissement': return 'warning';
      case 'erreur': return 'alert-circle';
      default: return 'information-circle';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'succes': return '#4CAF50';
      case 'avertissement': return '#FF9800';
      case 'erreur': return '#F44336';
      default: return '#1E90FF';
    }
  };

  const getTypeText = (type) => {
    switch (type) {
      case 'succes': return 'Succès';
      case 'avertissement': return 'Avertissement';
      case 'erreur': return 'Erreur';
      default: return 'Information';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: fr });
  };

  const formatFullDate = (dateString) => {
    const date = new Date(dateString);
    return format(date, 'dd MMMM yyyy à HH:mm', { locale: fr });
  };

  const getCountByFilter = () => {
    if (filter === 'all') return notifications.length;
    if (filter === 'unread') return notifications.filter(n => !n.lu).length;
    return notifications.filter(n => n.lu).length;
  };

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.lu && styles.unreadItem]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.notificationIcon, { backgroundColor: getTypeColor(item.type_notification) + '20' }]}>
        <Ionicons 
          name={getTypeIcon(item.type_notification)} 
          size={24} 
          color={getTypeColor(item.type_notification)} 
        />
      </View>
      
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle} numberOfLines={1}>
            {item.titre}
          </Text>
          <Text style={styles.notificationTime}>
            {formatDate(item.date_creation)}
          </Text>
        </View>
        
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.message}
        </Text>
        
        {!item.lu && (
          <View style={styles.unreadDot} />
        )}
      </View>
      
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteNotification(item.id)}
      >
        <Ionicons name="close" size={18} color="#999" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <>
      {/* Icône de notification */}
      <TouchableOpacity onPress={openModal} style={styles.iconContainer}>
        <Image 
          source={unreadCount > 0 ? iconWithNotif : iconNoNotif} 
          style={styles.icon}
        />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Modal principal des notifications */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header du modal */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="arrow-back" size={24} color="#1E90FF" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Notifications</Text>
              </View>
              
              <View style={styles.modalHeaderRight}>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={markAllAsRead} style={styles.headerButton}>
                    <Ionicons name="checkmark-done" size={22} color="#1E90FF" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={clearReadNotifications} style={styles.headerButton}>
                  <Ionicons name="trash-outline" size={22} color="#F44336" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.headerButton}>
                  <Ionicons name="close" size={24} color="red" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Filtres */}
            <View style={styles.filterContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
                  onPress={() => setFilter('all')}
                >
                  <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                    Toutes ({notifications.length})
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.filterButton, filter === 'unread' && styles.filterButtonActive]}
                  onPress={() => setFilter('unread')}
                >
                  <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
                    Non lues ({notifications.filter(n => !n.lu).length})
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.filterButton, filter === 'read' && styles.filterButtonActive]}
                  onPress={() => setFilter('read')}
                >
                  <Text style={[styles.filterText, filter === 'read' && styles.filterTextActive]}>
                    Lues ({notifications.filter(n => n.lu).length})
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* En-tête avec compteur */}
            <View style={styles.counterHeader}>
              <Text style={styles.counterText}>
                {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
                {filter !== 'all' && ` (${filter === 'unread' ? 'non lues' : 'lues'})`}
              </Text>
            </View>

            {/* Liste des notifications */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1E90FF" />
                <Text style={styles.loadingText}>Chargement...</Text>
              </View>
            ) : filteredNotifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Image source={iconNoNotif} style={styles.emptyIcon} />
                <Text style={styles.emptyText}>
                  {filter === 'all' && 'Aucune notification'}
                  {filter === 'unread' && 'Aucune notification non lue'}
                  {filter === 'read' && 'Aucune notification lue'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {filter === 'all' && "Vous n'avez pas encore de notifications"}
                  {filter === 'unread' && 'Toutes vos notifications sont lues'}
                  {filter === 'read' && "Vous n'avez pas encore de notifications lues"}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredNotifications}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderNotificationItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL DE DÉTAILS - POUR LIRE LE MESSAGE COMPLET */}
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setDetailModalVisible(false);
          setSelectedNotification(null);
        }}
      >
        <View style={styles.detailModalOverlay}>
          <View style={styles.detailModalContent}>
            {selectedNotification ? (
              <>
                {/* Header avec type de notification */}
                <View style={styles.detailModalHeader}>
                  <View style={[styles.detailTypeBadge, { backgroundColor: getTypeColor(selectedNotification.type_notification) + '20' }]}>
                    <Ionicons 
                      name={getTypeIcon(selectedNotification.type_notification)} 
                      size={28} 
                      color={getTypeColor(selectedNotification.type_notification)} 
                    />
                    <Text style={[styles.detailTypeText, { color: getTypeColor(selectedNotification.type_notification) }]}>
                      {getTypeText(selectedNotification.type_notification)}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => {
                      setDetailModalVisible(false);
                      setSelectedNotification(null);
                    }}
                    style={styles.detailCloseButton}
                  >
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Titre */}
                  <View style={styles.detailTitleContainer}>
                    <Text style={styles.detailTitle}>
                      {selectedNotification.titre}
                    </Text>
                  </View>

                  {/* Date complète */}
                  <View style={styles.detailDateContainer}>
                    <Ionicons name="time-outline" size={18} color="#999" />
                    <Text style={styles.detailDate}>
                      {formatFullDate(selectedNotification.date_creation)}
                    </Text>
                  </View>

                  {/* Message complet */}
                  <View style={styles.detailMessageContainer}>
                    <Text style={styles.detailMessageLabel}>Message :</Text>
                    <Text style={styles.detailMessage}>
                      {selectedNotification.message}
                    </Text>
                  </View>

                  {/* Statut de lecture */}
                  <View style={styles.detailStatusContainer}>
                    <Ionicons 
                      name={selectedNotification.lu ? "eye-outline" : "eye-off-outline"} 
                      size={18} 
                      color={selectedNotification.lu ? "#4CAF50" : "#FF9800"} 
                    />
                    <Text style={[styles.detailStatusText, { color: selectedNotification.lu ? "#4CAF50" : "#FF9800" }]}>
                      {selectedNotification.lu ? "Déjà lu" : "Non lu"}
                    </Text>
                  </View>
                </ScrollView>

                {/* Boutons d'action */}
                <View style={styles.detailActions}>
                  <TouchableOpacity
                    style={[styles.detailActionButton, styles.detailDeleteButton]}
                    onPress={() => deleteNotification(selectedNotification.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#fff" />
                    <Text style={styles.detailActionButtonText}>Supprimer</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.detailActionButton, styles.detailCloseActionButton]}
                    onPress={() => {
                      setDetailModalVisible(false);
                      setSelectedNotification(null);
                    }}
                  >
                    <Text style={styles.detailCloseActionButtonText}>Fermer</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.detailErrorContainer}>
                <ActivityIndicator size="large" color="#1E90FF" />
                <Text style={styles.detailErrorText}>Chargement...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
    padding: 5,
  },
  icon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    height: '85%',
    paddingTop: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  
  // Styles pour les filtres
  filterContainer: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 10,
  },
  filterButtonActive: {
    backgroundColor: '#1E90FF',
  },
  filterText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  
  // Styles pour le compteur
  counterHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f9f9f9',
  },
  counterText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
    opacity: 0.5,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 5,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  listContent: {
    padding: 15,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  unreadItem: {
    backgroundColor: '#f0f9ff',
    borderColor: '#1E90FF30',
  },
  notificationIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
    position: 'relative',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  notificationTime: {
    fontSize: 11,
    color: '#999',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: -8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1E90FF',
    borderWidth: 2,
    borderColor: '#fff',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 10,
  },

  // Styles pour le modal de détails
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailModalContent: {
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 25,
  },
  detailTypeText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  detailCloseButton: {
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  detailTitleContainer: {
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  detailDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailDate: {
    fontSize: 14,
    color: '#999',
    marginLeft: 8,
  },
  detailMessageContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 15,
  },
  detailMessageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  detailMessage: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  detailStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  detailStatusText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  detailErrorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  detailErrorText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  detailActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  detailActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 25,
    marginHorizontal: 6,
  },
  detailDeleteButton: {
    backgroundColor: '#F44336',
  },
  detailCloseActionButton: {
    backgroundColor: '#f0f0f0',
  },
  detailActionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  detailCloseActionButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },
});