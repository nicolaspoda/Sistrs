import { Tabs } from "expo-router";

import { TabBarIcon } from "../../components/TabBarIcon";
import { Colors } from "../../constants/colors";
import { useTabBadges } from "../../lib/useTabBadges";

export default function TabsLayout() {
  const { hasPendingFriendRequests, hasUnreadMessages, hasNewChannelContent } = useTabBadges();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon name="home" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "Amies",
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon
              name="people"
              color={color}
              size={size}
              focused={focused}
              showDot={hasPendingFriendRequests}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="channels"
        options={{
          title: "Canaux",
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon
              name="megaphone"
              color={color}
              size={size}
              focused={focused}
              showDot={hasNewChannelContent}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon
              name="chatbubble"
              color={color}
              size={size}
              focused={focused}
              showDot={hasUnreadMessages}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon name="person" color={color} size={size} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
