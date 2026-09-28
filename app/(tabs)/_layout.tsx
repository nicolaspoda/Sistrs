import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { TabIconWithDot } from "../../components/TabIconWithDot";
import { Colors } from "../../constants/colors";
import { useTabBadges } from "../../lib/useTabBadges";

export default function TabsLayout() {
  const { hasPendingFriendRequests, hasUnreadMessages, hasNewChannelContent } = useTabBadges();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "Amis",
          tabBarIcon: ({ color, size }) => (
            <TabIconWithDot name="people" color={color} size={size} showDot={hasPendingFriendRequests} />
          ),
        }}
      />
      <Tabs.Screen
        name="channels"
        options={{
          title: "Canaux",
          tabBarIcon: ({ color, size }) => (
            <TabIconWithDot name="megaphone" color={color} size={size} showDot={hasNewChannelContent} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, size }) => (
            <TabIconWithDot name="chatbubble" color={color} size={size} showDot={hasUnreadMessages} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
