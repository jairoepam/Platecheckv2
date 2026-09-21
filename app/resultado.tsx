import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import type { ConferenceStatus } from "@/lib/conference-logic";
import { clearConferenceSession, getConferenceResult } from "@/lib/conference-session";

const STATUS_UI: Record<ConferenceStatus, { color: string; pale: string; icon: "check-circle" | "warning" | "error-outline"; eyebrow: string; title: string }> = {
  approved: { color: "#178A4B", pale: "#EAF8F0", icon: "check-circle", eyebrow: "SEQUÊNCIAS IDÊNTICAS", title: "Aprovado" },
  divergent: { color: "#C93737", pale: "#FFF0EF", icon: "error-outline", eyebrow: "ATENÇÃO À DIVERGÊNCIA", title: "Divergente" },
  inconclusive: { color: "#C97800", pale: "#FFF7E8", icon: "warning", eyebrow: "LEITURA INCONCLUSIVA", title: "Revisão necessária" },
};

export default function ResultScreen() {
  const router = useRouter();
  const result = useMemo(() => getConferenceResult(), []);

  useEffect(() => {
    if (!result) router.replace("/");
  }, [result, router]);

  if (!result) return null;
  const ui = STATUS_UI[result.status];
  const retake = result.status === "inconclusive";
  const goHome = () => {
    clearConferenceSession();
    router.replace("/");
  };

  return (
    <ScreenContainer className="px-5" edges={["top", "bottom", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable onPress={goHome} accessibilityLabel="Voltar ao início" style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}><MaterialIcons name="close" size={22} color="#142033" /></Pressable>
          <Text style={styles.topTitle}>Resultado da conferência</Text>
          <View style={styles.backButton} />
        </View>
        <View style={[styles.resultBanner, { backgroundColor: ui.pale }]}>
          <MaterialIcons name={ui.icon} size={40} color={ui.color} />
          <Text style={[styles.eyebrow, { color: ui.color }]}>{ui.eyebrow}</Text>
          <Text style={styles.statusTitle}>{ui.title}</Text>
          <Text style={styles.statusText}>{result.message}</Text>
        </View>
        <View style={styles.sequenceSection}>
          <Text style={styles.sectionTitle}>Comparação caractere a caractere</Text>
          <View style={styles.comparisonCard}>
            <View style={styles.sequenceRow}><View style={styles.sequenceHeader}><MaterialIcons name="description" size={18} color="#0056D2" /><Text style={styles.sequenceLabel}>Folha impressa</Text></View><Text style={styles.sequenceValueInline}>{result.sheet ?? "Não identificada"}</Text></View>
            <View style={styles.sequenceDivider} />
            <View style={styles.sequenceRow}><View style={styles.sequenceHeader}><MaterialIcons name="directions-car" size={18} color="#0056D2" /><Text style={styles.sequenceLabel}>Placa Mercosul</Text></View><Text style={[styles.sequenceValueInline, result.status === "divergent" && { color: ui.color }]}>{result.plate ?? "Não identificada"}</Text></View>
          </View>
        </View>
        <View style={styles.gridSection}>
          <View style={styles.gridHeader}><Text style={styles.sectionTitle}>Posição por posição</Text><Text style={[styles.gridHint, { color: ui.color }]}>{result.status === "approved" ? "Tudo confere" : result.status === "divergent" ? "Veja as diferenças" : "Leitura insuficiente"}</Text></View>
          <View style={styles.grid}>
            {result.characters.map((character) => {
              const state = character.state;
              const background = state === "match" ? "#EAF8F0" : state === "different" ? "#FFF0EF" : "#F0F3F7";
              const color = state === "match" ? "#178A4B" : state === "different" ? "#C93737" : "#C97800";
              const visibleCharacter = state === "unknown" && character.plate === "–"
                ? result.plate?.[character.position - 1] ?? "–"
                : character.plate;
              return <View key={character.position} style={[styles.characterBox, { backgroundColor: state === "unknown" ? "#FFF7E8" : background }]}><Text style={styles.position}>{character.position}</Text><Text style={[styles.character, { color }]}>{visibleCharacter}</Text></View>;
            })}
          </View>
        </View>
        <View style={styles.metrics}>
          <View style={styles.metric}><Text style={styles.metricValue}>{result.sheet && result.plate ? "7" : "–"}</Text><Text style={styles.metricLabel}>posições{`\n`}conferidas</Text></View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}><Text style={styles.metricValue}>{result.differences}</Text><Text style={styles.metricLabel}>{result.differences === 1 ? "divergência" : "divergências"}</Text></View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}><Text style={styles.metricValue}>{result.confidence}%</Text><Text style={styles.metricLabel}>confiança{`\n`}mínima</Text></View>
        </View>
      </ScrollView>
      <View style={styles.actions}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); clearConferenceSession(); router.replace("/captura"); }} style={({ pressed }) => [styles.primaryAction, { backgroundColor: retake ? "#C97800" : "#0056D2" }, pressed && styles.primaryPressed]}>
          <MaterialIcons name="photo-camera" size={21} color="#FFFFFF" /><Text style={styles.primaryActionText}>{retake ? "Fotografar novamente" : "Nova conferência"}</Text>
        </Pressable>
        <Pressable onPress={goHome} style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}><Text style={styles.secondaryActionText}>Voltar ao início</Text></Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 20, paddingBottom: 130, paddingTop: 10 },
  topRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  topTitle: { color: "#142033", fontSize: 15, fontWeight: "700" },
  backButton: { alignItems: "center", height: 40, justifyContent: "center", width: 40 },
  resultBanner: { alignItems: "center", borderRadius: 24, paddingHorizontal: 22, paddingVertical: 24 },
  eyebrow: { fontSize: 12, fontWeight: "800", letterSpacing: 0.7, marginTop: 12 },
  statusTitle: { color: "#142033", fontSize: 28, fontWeight: "800", marginTop: 4 },
  statusText: { color: "#627089", fontSize: 14, lineHeight: 20, marginTop: 7, textAlign: "center" },
  sequenceSection: { gap: 10 },
  sectionTitle: { color: "#142033", fontSize: 16, fontWeight: "800" },
  comparisonCard: { backgroundColor: "#FFFFFF", borderColor: "#E4E9F2", borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  sequenceRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 15 },
  sequenceHeader: { alignItems: "center", flexDirection: "row", gap: 7 },
  sequenceLabel: { color: "#627089", fontSize: 13, fontWeight: "600" },
  sequenceValueInline: { color: "#142033", fontSize: 20, fontWeight: "800", letterSpacing: 1.1, marginLeft: 10, textAlign: "right" },
  sequenceDivider: { backgroundColor: "#E4E9F2", height: 1, marginHorizontal: 16 },
  gridSection: { gap: 12 },
  gridHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  gridHint: { fontSize: 12, fontWeight: "700" },
  grid: { flexDirection: "row", gap: 6 },
  characterBox: { alignItems: "center", borderRadius: 12, flex: 1, minHeight: 74, paddingTop: 6 },
  position: { color: "#8994A8", fontSize: 10, fontWeight: "700" },
  character: { fontSize: 18, fontWeight: "800", marginTop: 5 },
  metrics: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E4E9F2", borderRadius: 18, borderWidth: 1, flexDirection: "row", justifyContent: "space-evenly", paddingVertical: 17 },
  metric: { alignItems: "center", flex: 1 },
  metricValue: { color: "#142033", fontSize: 21, fontWeight: "800" },
  metricLabel: { color: "#627089", fontSize: 11, lineHeight: 14, marginTop: 4, textAlign: "center" },
  metricDivider: { backgroundColor: "#E4E9F2", height: 36, width: 1 },
  actions: { backgroundColor: "#F7F9FC", bottom: 0, left: 0, paddingBottom: 14, paddingHorizontal: 20, paddingTop: 8, position: "absolute", right: 0 },
  primaryAction: { alignItems: "center", borderRadius: 16, flexDirection: "row", gap: 9, height: 52, justifyContent: "center" },
  primaryActionText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  secondaryAction: { alignItems: "center", padding: 12 },
  secondaryActionText: { color: "#0056D2", fontSize: 14, fontWeight: "700" },
  primaryPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  pressed: { opacity: 0.7 },
});
