import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Animated,
  Linking
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Navbar from "../components/Navbar";
import NotificationIcon from "../components/NotificationIcon";
import API from "../services/api";
import { useAuth } from "../hooks/useAuth";

const { width } = Dimensions.get('window');

export default function Accueil() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  // Utiliser useRef pour garder les données en cache
  const cachedData = useRef({
    stats: {
      trajetsDisponibles: 0,
      reservationsActives: 0,
      reservationsTotal: 0,
      prochainVoyage: null
    },
    dernieresReservations: [],
    trajetsPopulaires: [],
    trajetsAleatoires: []
  });

  const [data, setData] = useState(cachedData.current);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef(null);

  // Redirection si non connecté
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/AuthScreen');
    }
  }, [isAuthenticated, authLoading]);

  // Chargement initial - une seule fois
  useEffect(() => {
    if (isAuthenticated && user && !initialLoadDone) {
      loadInitialData();
    }
  }, [isAuthenticated, user]);

  const loadInitialData = async () => {
    try {
      // Charger les données sans écran de chargement
      await Promise.all([
        fetchDashboardData(false),
        fetchUnreadCount()
      ]);
      setInitialLoadDone(true);
    } catch (err) {
      console.log("Erreur chargement initial:", err);
    }
  };

  const fetchUnreadCount = async () => {
    // Cette fonction est appelée mais on ne bloque pas l'UI
    try {
      await API.get(`/notifications/user/${user.id}/count`);
    } catch (err) {
      console.log("Erreur fetchUnreadCount:", err);
    }
  };

  const fetchDashboardData = async (showRefreshing = true) => {
    try {
      if (showRefreshing) setRefreshing(true);
      
      // Récupérer les statistiques
      const statsRes = await API.get("/trajets/dashboard/stats");
      
      // Récupérer les dernières réservations
      const reservationsRes = await API.get(`/trajets/user/${user.id}/dernieres-reservations?limit=3`);
      
      // Récupérer les trajets populaires
      const trajetsRes = await API.get("/trajets/populaires?limit=5");
      
      // Récupérer des trajets aléatoires
      const aleatoiresRes = await API.get("/trajets/aleatoires?limit=5");
      
      // Mettre à jour le cache et l'état
      const newData = {
        stats: statsRes.data,
        dernieresReservations: reservationsRes.data,
        trajetsPopulaires: trajetsRes.data,
        trajetsAleatoires: aleatoiresRes.data
      };
      
      cachedData.current = newData;
      setData(newData);
      
    } catch (err) {
      console.log("Erreur fetchDashboard:", err);
    } finally {
      if (showRefreshing) setRefreshing(false);
    }
  };

  const onRefresh = () => {
    fetchDashboardData(true);
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

  const formatHeure = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
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

  const viewableItemsChanged = useRef(({ viewableItems }) => {
    setCurrentSlideIndex(viewableItems[0]?.index || 0);
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderSlideItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.slideCard}
      onPress={() => router.push('/Trajets')}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={['#1E90FF', '#1874CD']}
        style={styles.slideGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.slideHeader}>
          <View style={styles.slideIcon}>
            <Ionicons name="bus" size={30} color="#fff" />
          </View>
          <View style={styles.slidePrice}>
            <Text style={styles.slidePriceText}>{item.prix_base} FCFA</Text>
          </View>
        </View>
        
        <View style={styles.slideRoute}>
          <Text style={styles.slideVilleDepart}>{item.ville_depart}</Text>
          <View style={styles.slideArrow}>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </View>
          <Text style={styles.slideVilleArrivee}>{item.ville_arrivee}</Text>
        </View>

        <View style={styles.slideFooter}>
          <View style={styles.slideInfo}>
            <Ionicons name="time" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.slideInfoText}>
              {Math.floor(item.duree_estimee_minutes / 60)}h{item.duree_estimee_minutes % 60}
            </Text>
          </View>
          <View style={styles.slideInfo}>
            <Ionicons name="people" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.slideInfoText}>
              {item.nombre_reservations || 0} résa
            </Text>
          </View>
        </View>

        <View style={styles.slideBadge}>
          <Text style={styles.slideBadgeText}>#{index + 1}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  // Plus besoin de l'écran de chargement - on affiche directement le contenu
  // même si les données ne sont pas encore chargées (elles le seront en arrière-plan)

  if (!isAuthenticated) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header avec effet de vague */}
      <LinearGradient
        colors={['#1E90FF', '#1C86EE', '#1874CD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>👋 Bonjour,</Text>
            <View style={styles.userNameContainer}>
              <Text style={styles.userName}>{user?.nom || 'Utilisateur'}</Text>
              {data.stats.prochainVoyage && (
                <View style={styles.voyageIndicator}>
                  <Ionicons name="airplane" size={14} color="#FFD700" />
                </View>
              )}
            </View>
          </View>
          <NotificationIcon />
        </View>
        
        {/* Décoration vague */}
        <View style={styles.waveContainer}>
          <View style={styles.wave} />
          <View style={[styles.wave, styles.wave2]} />
          <View style={[styles.wave, styles.wave3]} />
        </View>
      </LinearGradient>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor="#1E90FF"
            colors={['#1E90FF']}
          />
        }
      >
        {/* Bannière de bienvenue animée */}
        <TouchableOpacity 
          style={styles.welcomeBanner}
          onPress={() => router.push('/Trajets')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#FF6B6B', '#FF8E53', '#FF6B6B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.welcomeGradient}
          >
            <View style={styles.welcomeContent}>
              <View>
                <Text style={styles.welcomeTitle}>🚍 Prêt pour laventure ?</Text>
                <Text style={styles.welcomeSubtitle}>
                  Découvrez nos destinations
                </Text>
              </View>
              <View style={styles.welcomeButton}>
                <Text style={styles.welcomeButtonText}>Explorer</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </View>
            </View>
            <View style={styles.welcomeBadge}>
              <Text style={styles.welcomeBadgeText}>🔥 Nouveau</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* CARROUSEL DE TRAJETS ALÉATOIRES */}
        {data.trajetsAleatoires.length > 0 && (
          <View style={styles.carouselSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <LinearGradient
                  colors={['#1E90FF', '#1874CD']}
                  style={styles.sectionIcon}
                >
                  <Ionicons name="shuffle" size={18} color="#fff" />
                </LinearGradient>
                <Text style={styles.sectionTitle}>Inspirations du moment</Text>
              </View>
              <TouchableOpacity 
                onPress={() => router.push('/Trajets')}
                style={styles.seeAllButton}
              >
                <Text style={styles.seeAllLink}>Voir plus</Text>
                <Ionicons name="arrow-forward" size={16} color="#1E90FF" />
              </TouchableOpacity>
            </View>

            <FlatList
              ref={slidesRef}
              data={data.trajetsAleatoires}
              renderItem={renderSlideItem}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              pagingEnabled
              bounces={false}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: false }
              )}
              scrollEventThrottle={32}
              onViewableItemsChanged={viewableItemsChanged}
              viewabilityConfig={viewConfig}
              contentContainerStyle={styles.carouselContent}
            />

            {/* Indicateurs de pagination */}
            <View style={styles.paginationContainer}>
              {data.trajetsAleatoires.map((_, i) => {
                const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                const dotWidth = scrollX.interpolate({
                  inputRange,
                  outputRange: [8, 20, 8],
                  extrapolate: 'clamp',
                });
                const opacity = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.3, 1, 0.3],
                  extrapolate: 'clamp',
                });
                return (
                  <Animated.View
                    key={i.toString()}
                    style={[
                      styles.dot,
                      { width: dotWidth, opacity },
                      i === currentSlideIndex && styles.activeDot,
                    ]}
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* Cartes de statistiques avec effet 3D */}
        <View style={styles.statsContainer}>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => router.push('/Trajets')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#1E90FF', '#1874CD']}
              style={styles.statCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.statIconContainer}>
                <Ionicons name="bus" size={28} color="#fff" />
              </View>
              <Text style={styles.statNumber}>
                {data.stats.trajetsDisponibles === 0 ? (
                  <Text style={styles.statNumberZero}>0</Text>
                ) : (
                  data.stats.trajetsDisponibles
                )}
              </Text>
              <Text style={styles.statLabel}>Trajets disponibles</Text>
              {data.stats.trajetsDisponibles === 0 && (
                <View style={styles.statBadge}>
                  <Text style={styles.statBadgeText}>Bientôt</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => router.push('/Reservations')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#4CAF50', '#45a049']}
              style={styles.statCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.statIconContainer}>
                <Ionicons name="ticket" size={28} color="#fff" />
              </View>
              <Text style={styles.statNumber}>{data.stats.reservationsActives}</Text>
              <Text style={styles.statLabel}>Réservations actives</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Prochain voyage avec design carte de fidélité */}
        {data.stats.prochainVoyage && (
          <View style={styles.nextTripSection}>
            <View style={styles.sectionTitleContainer}>
              <LinearGradient
                colors={['#4CAF50', '#45a049']}
                style={styles.sectionIcon}
              >
                <Ionicons name="calendar" size={18} color="#fff" />
              </LinearGradient>
              <Text style={styles.sectionTitle}>Votre prochain voyage</Text>
            </View>
            <TouchableOpacity 
              style={styles.nextTripCard}
              onPress={() => router.push('/Reservations')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#ffffff', '#f8f9fa']}
                style={styles.nextTripGradient}
              >
                <View style={styles.nextTripHeader}>
                  <View style={styles.nextTripRoute}>
                    <View style={styles.routeIcon}>
                      <Ionicons name="location" size={24} color="#1E90FF" />
                    </View>
                    <View>
                      <Text style={styles.nextTripLabel}>Trajet</Text>
                      <Text style={styles.nextTripText}>
                        {data.stats.prochainVoyage.ville_depart} → {data.stats.prochainVoyage.ville_arrivee}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.nextTripBadge}>
                    <Text style={styles.nextTripBadgeText}>À VENIR</Text>
                  </View>
                </View>

                <View style={styles.nextTripDivider} />

                <View style={styles.nextTripTimeline}>
                  <View style={styles.timelineItem}>
                    <Ionicons name="calendar" size={18} color="#1E90FF" />
                    <Text style={styles.timelineDate}>
                      {new Date(data.stats.prochainVoyage.date_depart).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                  <View style={styles.timelineItem}>
                    <Ionicons name="time" size={18} color="#1E90FF" />
                    <Text style={styles.timelineTime}>
                      {formatHeure(data.stats.prochainVoyage.date_depart)}
                    </Text>
                  </View>
                </View>

                <View style={styles.nextTripDetails}>
                  <View style={styles.nextTripDetailItem}>
                    <Ionicons name="bus" size={16} color="#666" />
                    <Text style={styles.nextTripDetailText}>
                      {data.stats.prochainVoyage.numero_bus}
                    </Text>
                  </View>
                  <View style={styles.nextTripDetailItem}>
                    <Ionicons name="chair" size={16} color="#666" />
                    <Text style={styles.nextTripDetailText}>
                      Siège {data.stats.prochainVoyage.numero_siege}
                    </Text>
                  </View>
                  <View style={styles.nextTripDetailItem}>
                    <Ionicons name="time" size={16} color="#666" />
                    <Text style={styles.nextTripDetailText}>
                      {Math.ceil((new Date(data.stats.prochainVoyage.date_depart) - new Date()) / (1000 * 60 * 60))}h
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Trajets populaires avec design premium */}
        <View style={styles.popularSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <LinearGradient
                colors={['#FF9800', '#F57C00']}
                style={styles.sectionIcon}
              >
                <Ionicons name="trending-up" size={18} color="#fff" />
              </LinearGradient>
              <Text style={styles.sectionTitle}>Tendances 🔥</Text>
            </View>
            <TouchableOpacity 
              onPress={() => router.push('/Trajets')}
              style={styles.seeAllButton}
            >
              <Text style={styles.seeAllLink}>Tous les trajets</Text>
              <Ionicons name="arrow-forward" size={16} color="#FF9800" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.popularScroll}
          >
            {data.trajetsPopulaires.map((trajet, index) => (
              <TouchableOpacity 
                key={index}
                style={styles.popularCard}
                onPress={() => router.push('/Trajets')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#ffffff', '#f8f9fa']}
                  style={styles.popularCardGradient}
                >
                  <View style={styles.popularCardHeader}>
                    <View style={styles.popularIcon}>
                      <Ionicons name="bus" size={24} color="#FF9800" />
                    </View>
                    <View style={styles.popularPriceBadge}>
                      <Text style={styles.popularPrice}>{trajet.prix_base} FCFA</Text>
                    </View>
                  </View>
                  <Text style={styles.popularRoute}>
                    {trajet.ville_depart}
                  </Text>
                  <Text style={styles.popularRouteArrivee}>
                    {trajet.ville_arrivee}
                  </Text>
                  <View style={styles.popularStats}>
                    <View style={styles.popularStat}>
                      <Ionicons name="time" size={14} color="#999" />
                      <Text style={styles.popularStatText}>
                        {Math.floor(trajet.duree_estimee_minutes / 60)}h{trajet.duree_estimee_minutes % 60}
                      </Text>
                    </View>
                    <View style={styles.popularStat}>
                      <Ionicons name="people" size={14} color="#999" />
                      <Text style={styles.popularStatText}>
                        {trajet.nombre_reservations || 0} résa
                      </Text>
                    </View>
                  </View>
                  {index === 0 && (
                    <View style={styles.trendingBadge}>
                      <Text style={styles.trendingBadgeText}>#1</Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Dernières réservations avec design épuré */}
        {data.dernieresReservations.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <LinearGradient
                  colors={['#9C27B0', '#7B1FA2']}
                  style={styles.sectionIcon}
                >
                  <Ionicons name="time" size={18} color="#fff" />
                </LinearGradient>
                <Text style={styles.sectionTitle}>Vos dernières réservations</Text>
              </View>
              <TouchableOpacity 
                onPress={() => router.push('/Reservations')}
                style={styles.seeAllButton}
              >
                <Text style={styles.seeAllLink}>Historique</Text>
                <Ionicons name="arrow-forward" size={16} color="#9C27B0" />
              </TouchableOpacity>
            </View>

            {data.dernieresReservations.map((reservation, index) => (
              <TouchableOpacity 
                key={index}
                style={styles.recentCard}
                onPress={() => router.push('/Reservations')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#ffffff', '#f8f9fa']}
                  style={styles.recentCardGradient}
                >
                  <View style={styles.recentCardHeader}>
                    <View style={styles.recentRoute}>
                      <Ionicons name="location" size={18} color="#9C27B0" />
                      <Text style={styles.recentRouteText} numberOfLines={1}>
                        {reservation.ville_depart} → {reservation.ville_arrivee}
                      </Text>
                    </View>
                    <View style={[styles.recentStatus, { backgroundColor: getStatusColor(reservation.statut) + '20' }]}>
                      <Text style={[styles.recentStatusText, { color: getStatusColor(reservation.statut) }]}>
                        {getStatusText(reservation.statut)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.recentDetails}>
                    <View style={styles.recentInfo}>
                      <Ionicons name="calendar" size={14} color="#666" />
                      <Text style={styles.recentInfoText}>
                        {new Date(reservation.date_depart).toLocaleDateString('fr-FR')}
                      </Text>
                    </View>
                    <View style={styles.recentInfo}>
                      <Ionicons name="time" size={14} color="#666" />
                      <Text style={styles.recentInfoText}>
                        {formatHeure(reservation.date_depart)}
                      </Text>
                    </View>
                    <View style={styles.recentInfo}>
                      <Ionicons name="cash" size={14} color="#666" />
                      <Text style={styles.recentInfoText}>
                        {reservation.prix_total} FCFA
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Aide & Contact */}
        <View style={styles.helpSection}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.helpGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.helpHeader}>
              <View style={styles.helpIcon}>
                <Ionicons name="headset" size={32} color="#fff" />
              </View>
              <Text style={styles.helpTitle}>Besoin daide ?</Text>
            </View>
            
            <Text style={styles.helpSubtitle}>
              Notre équipe est disponible 24h/24 pour vous assister
            </Text>

            <View style={styles.helpButtons}>
              <TouchableOpacity 
                style={styles.helpButton}
                onPress={() => {
                  Alert.alert(
                    "📞 Appeler le service client",
                    "Voulez-vous appeler le +225 07 87 81 96 33 ?",
                    [
                      { text: "Annuler", style: "cancel" },
                      { 
                        text: "Appeler", 
                        onPress: () => {
                          Linking.openURL('tel:+2250787819633');
                        }
                      }
                    ]
                  );
                }}
              >
                <LinearGradient
                  colors={['#4CAF50', '#45a049']}
                  style={styles.helpButtonGradient}
                >
                  <Ionicons name="call" size={20} color="#fff" />
                  <Text style={styles.helpButtonText}>Appeler</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.helpButton}
                onPress={() => {
                  Alert.alert(
                    "📧 Envoyer un email",
                    "Voulez-vous envoyer un email à Yannicksaiyen86@gmail. com ?",
                    [
                      { text: "Annuler", style: "cancel" },
                      { 
                        text: "Envoyer", 
                        onPress: () => {
                          Linking.openURL('mailto:Yannicksaiyen86@gmail. com');
                        }
                      }
                    ]
                  );
                }}
              >
                <LinearGradient
                  colors={['#FF9800', '#F57C00']}
                  style={styles.helpButtonGradient}
                >
                  <Ionicons name="mail" size={20} color="#fff" />
                  <Text style={styles.helpButtonText}>Email</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.helpHours}>
              <Ionicons name="time" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.helpHoursText}>Disponible 7j/7 - 24h/24</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Bannière promotionnelle */}
        <TouchableOpacity 
          style={styles.promoBanner}
          onPress={() => router.push('/Trajets')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#FF6B6B', '#FF8E53', '#FF6B6B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.promoGradient}
          >
            <View style={styles.promoContent}>
              <View>
                <Text style={styles.promoTitle}>🎉 -20% sur votre premier trajet</Text>
                <Text style={styles.promoSubtitle}>Nouveaux clients seulement</Text>
              </View>
              <View style={styles.promoCode}>
                <Text style={styles.promoCodeText}>BIENVENUE20</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

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
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  greeting: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
  },
  userNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginRight: 8,
  },
  voyageIndicator: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 4,
  },
  waveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    flexDirection: 'row',
  },
  wave: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    height: 20,
    transform: [{ skewY: '-2deg' }],
    marginHorizontal: -5,
  },
  wave2: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    transform: [{ skewY: '2deg' }],
  },
  wave3: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    transform: [{ skewY: '-1deg' }],
  },
  welcomeBanner: {
    margin: 15,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  welcomeGradient: {
    padding: 20,
    position: 'relative',
  },
  welcomeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  welcomeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  welcomeButtonText: {
    color: '#fff',
    marginRight: 5,
    fontWeight: '600',
  },
  welcomeBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
  },
  welcomeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  carouselSection: {
    marginBottom: 20,
  },
  carouselContent: {
    paddingHorizontal: 0,
  },
  slideCard: {
    width: width - 40,
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  slideGradient: {
    padding: 20,
  },
  slideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  slideIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slidePrice: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  slidePriceText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  slideRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  slideVilleDepart: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'left',
  },
  slideArrow: {
    marginHorizontal: 10,
  },
  slideVilleArrivee: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'right',
  },
  slideFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 15,
  },
  slideInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slideInfoText: {
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 5,
    fontSize: 14,
  },
  slideBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1E90FF',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#1874CD',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllLink: {
    color: '#1E90FF',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 3,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  statCardGradient: {
    padding: 15,
    alignItems: 'center',
    position: 'relative',
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  statNumberZero: {
    fontSize: 24,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  statBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  nextTripSection: {
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  nextTripCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  nextTripGradient: {
    padding: 15,
  },
  nextTripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  nextTripRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  routeIcon: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#1E90FF20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  nextTripLabel: {
    fontSize: 12,
    color: '#999',
  },
  nextTripText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E90FF',
  },
  nextTripBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  nextTripBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  nextTripDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 10,
  },
  nextTripTimeline: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineDate: {
    marginLeft: 5,
    color: '#333',
    fontWeight: '500',
    fontSize: 13,
  },
  timelineTime: {
    marginLeft: 5,
    color: '#333',
    fontWeight: '500',
    fontSize: 13,
  },
  nextTripDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 10,
  },
  nextTripDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextTripDetailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  popularSection: {
    marginBottom: 20,
  },
  popularScroll: {
    paddingLeft: 15,
  },
  popularCard: {
    width: 200,
    marginRight: 10,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  popularCardGradient: {
    padding: 15,
  },
  popularCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  popularIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF980020',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popularPriceBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 15,
  },
  popularPrice: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  popularRoute: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  popularRouteArrivee: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  popularStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  popularStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  popularStatText: {
    fontSize: 11,
    color: '#999',
    marginLeft: 3,
  },
  trendingBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#FF9800',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  recentSection: {
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  recentCard: {
    marginBottom: 10,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  recentCardGradient: {
    padding: 12,
  },
  recentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recentRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recentRouteText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9C27B0',
    marginLeft: 5,
    flex: 1,
  },
  recentStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recentStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  recentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentInfoText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 3,
  },
  helpSection: {
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  helpGradient: {
    padding: 20,
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  helpIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  helpTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  helpSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 15,
  },
  helpButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  helpButton: {
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 15,
    overflow: 'hidden',
  },
  helpButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  helpButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 5,
  },
  helpHours: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
  helpHoursText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginLeft: 5,
  },
  promoBanner: {
    margin: 15,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  promoGradient: {
    padding: 20,
  },
  promoContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  promoSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  promoCode: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  promoCodeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});