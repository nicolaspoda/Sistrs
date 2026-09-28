import { Image, StyleSheet, Text, View } from "react-native";

import { Colors } from "../constants/colors";

type AvatarProps = {
  url?: string | null;
  name: string;
  size?: number;
};

export function Avatar({ url, name, size = 44 }: AvatarProps) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const dimensionStyle = { width: size, height: size, borderRadius: size / 2 };

  if (url) {
    return <Image source={{ uri: url }} style={[styles.image, dimensionStyle]} />;
  }

  return (
    <View style={[styles.fallback, dimensionStyle]}>
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials || "?"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: Colors.border,
  },
  fallback: {
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: Colors.primaryDark,
    fontWeight: "700",
  },
});
