import type { PropsWithChildren } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PatternBackground } from "./PatternBackground";

type ScreenContainerProps = PropsWithChildren<{
  style?: ViewStyle;
}>;

export function ScreenContainer({ children, style }: ScreenContainerProps) {
  return (
    <PatternBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, style]}>{children}</View>
      </SafeAreaView>
    </PatternBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
