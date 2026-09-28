import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { supabase } from "./supabase";

// Comportement d'affichage quand une notification push arrive alors que
// l'app est ouverte au premier plan : on l'affiche quand même (bannière +
// son), comme n'importe quelle app de messagerie/social.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Demande la permission notifications, récupère le push token Expo de
 * l'appareil et l'enregistre sur le profil connecté (colonne
 * `profiles.push_token`). Le trigger SQL `push_new_notification` s'en sert
 * ensuite pour envoyer une vraie notification push via l'API Expo (gratuite,
 * pas de backend à déployer) à chaque notification in-app créée.
 *
 * Échoue silencieusement (log seulement) si l'utilisatrice refuse la
 * permission, si l'appareil ne supporte pas le push (simulateur), ou si le
 * projet n'a pas encore d'identifiant EAS configuré (`eas init`) — dans ce
 * dernier cas, les notifications in-app continuent de fonctionner
 * normalement, seul le push est indisponible.
 */
export async function registerForPushNotificationsAsync(profileId: string): Promise<void> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }

    if (status !== "granted") {
      return;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    await supabase.from("profiles").update({ push_token: token }).eq("id", profileId);
  } catch (error) {
    console.warn("[push-notifications] registration failed:", error);
  }
}
