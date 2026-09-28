import Mapbox, { Camera, MapView, PointAnnotation } from "@rnmapbox/maps";
import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../constants/colors";

const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? "";
if (mapboxToken) {
  Mapbox.setAccessToken(mapboxToken);
}

type EventLocationMapProps = {
  latitude: number;
  longitude: number;
  title: string;
};

/**
 * Petite carte interactive (Mapbox) centrée sur le point de rendez-vous
 * d'un événement, avec un repère à sa position. Complète le bouton "Ouvrir
 * dans Plans" (qui reste le moyen d'obtenir un itinéraire) plutôt que de le
 * remplacer.
 *
 * Nécessite un development build (voir PROGRESS.md) — le module natif
 * @rnmapbox/maps n'existe pas dans Expo Go.
 */
export function EventLocationMap({ latitude, longitude, title }: EventLocationMapProps) {
  if (!mapboxToken) {
    return (
      <View style={[styles.container, styles.fallback]}>
        <Text style={styles.fallbackText}>
          Carte indisponible (EXPO_PUBLIC_MAPBOX_TOKEN manquant dans .env)
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView style={styles.map} scaleBarEnabled={false} logoEnabled={false} attributionEnabled={false}>
        <Camera zoomLevel={14} centerCoordinate={[longitude, latitude]} />
        <PointAnnotation id="meeting-point" coordinate={[longitude, latitude]}>
          <View style={styles.marker}>
            <View style={styles.markerDot} />
          </View>
        </PointAnnotation>
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 160,
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 12,
    marginBottom: 4,
  },
  map: {
    flex: 1,
  },
  fallback: {
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  fallbackText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
  },
  marker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  markerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
});
