import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { loadConferenceHistory, type ConferenceHistoryItem } from "@/lib/conference-history";

export default function HomeScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<ConferenceHistoryItem[]>([]);

  useEffect(() => {
    loadConferenceHistory().then(setHistory).catch(() => setHistory([]));
  }, []);

  const approved = history.filter((item) => item.status === "approved").length;
  const attention = history.filter((item) => item.status !== "approved").length;

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <MaterialIcons name="verified" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.brand}>Conferência Expressa</Text>
          <Pressable
            accessibilityLabel="Abrir histórico"
            onPress={() => router.push("/historico")}
            style={({ pressed }) => [styles.historyButton, pressed && styles.pressed]}
          >
            <MaterialIcons name="history" size={22} color="#0056D2" />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.eyebrow}>
            <MaterialIcons name="bolt" size={16} color="#0056D2" />
            <Text style={styles.eyebrowText}>CONFERÊNCIA EM FOTO ÚNICA</Text>
          </View>
          <Text style={styles.title}>Uma foto. Duas sequências. Uma decisão.</Text>
          <Text style={styles.subtitle}>
            Compare a folha impressa do sistema com a placa Mercosul em poucos segundos.
          </Text>
        </View>

        <View style={styles.cameraIllustration}>
          <View style={styles.paperPreview}>
            <View style={styles.paperLineWide} />
            <View style={styles.paperLine} />
            <View style={styles.paperLineShort} />
            <Text style={styles.paperPlate}>ABC1D23</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.platePreview}>
            <View style={styles.plateStripe} />
            <Text style={styles.plateText}>ABC1D23</Text>
          </View>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <MaterialIcons name="photo-camera" size={20} color="#0056D2" />
          </View>
          <View style={styles.infoCopy}>
            <Text style={styles.cardTitle}>Fluxo de foto única</Text>
            <Text style={styles.cardBody}>
              Posicione a folha na parte superior e a placa na inferior da mesma fotografia.
            </Text>
          </View>
        </View>

        <View style={styles.steps}>
          {[
            ["01", "Enquadre", "Folha e placa"],
            ["02", "Capture", "Uma única foto"],
            ["03", "Confira", "Resultado imediato"],
          ].map(([number, title, description]) => (
            <View style={styles.step} key={number}>
              <Text style={styles.stepNumber}>{number}</Text>
              <Text style={styles.stepTitle}>{title}</Text>
              <Text style={styles.stepBody}>{description}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => router.push("/historico")}
          style={({ pressed }) => [styles.historyCard, pressed && styles.pressed]}
        >
          <View>
            <Text style={styles.cardTitle}>Histórico de conferências</Text>
            <Text style={styles.cardBody}>
              {history.length === 0
                ? "As placas conferidas aparecerão aqui."
                : `${history.length} registros · ${approved} aprovadas · ${attention} para atenção`}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#627089" />
        </Pressable>
      </ScrollView>

      <View style={styles.bottomAction}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/captura")}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}
        >
          <MaterialIcons name="photo-camera" size={22} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Fotografar conferência</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 112, gap: 20 },
  brandRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  brandIcon: { alignItems: "center", backgroundColor: "#0056D2", borderRadius: 10, height: 34, justifyContent: "center", width: 34 },
  brand: { color: "#142033", flex: 1, fontSize: 16, fontWeight: "700" },
  historyButton: { alignItems: "center", backgroundColor: "#EAF2FF", borderRadius: 18, height: 40, justifyContent: "center", width: 40 },
  hero: { gap: 10, paddingTop: 12 },
  eyebrow: { alignItems: "center", flexDirection: "row", gap: 6 },
  eyebrowText: { color: "#0056D2", fontSize: 12, fontWeight: "800", letterSpacing: 0.8 },
  title: { color: "#142033", fontSize: 32, fontWeight: "800", letterSpacing: -0.8, lineHeight: 38 },
  subtitle: { color: "#627089", fontSize: 16, lineHeight: 23 },
  cameraIllustration: { backgroundColor: "#142033", borderRadius: 24, height: 248, justifyContent: "space-between", overflow: "hidden", padding: 25 },
  paperPreview: { alignSelf: "center", backgroundColor: "#FFFFFF", borderRadius: 8, gap: 7, height: 88, padding: 12, width: "68%" },
  paperLineWide: { backgroundColor: "#B8C3D6", borderRadius: 4, height: 7, width: "68%" },
  paperLine: { backgroundColor: "#D5DDE9", borderRadius: 4, height: 5, width: "88%" },
  paperLineShort: { backgroundColor: "#D5DDE9", borderRadius: 4, height: 5, width: "58%" },
  paperPlate: { alignSelf: "flex-end", color: "#142033", fontSize: 12, fontWeight: "800", marginTop: -4 },
  divider: { alignSelf: "center", backgroundColor: "#6F83A1", height: 1, opacity: 0.7, width: "84%" },
  platePreview: { alignItems: "center", alignSelf: "center", backgroundColor: "#F7F7F1", borderColor: "#D7D7C3", borderRadius: 7, borderWidth: 2, height: 56, justifyContent: "center", overflow: "hidden", width: "58%" },
  plateStripe: { backgroundColor: "#1B5EA7", height: 8, left: 0, position: "absolute", right: 0, top: 0 },
  plateText: { color: "#142033", fontSize: 24, fontWeight: "900", letterSpacing: 1.5 },
  corner: { borderColor: "#FFFFFF", height: 24, position: "absolute", width: 24 },
  topLeft: { borderLeftWidth: 3, borderTopWidth: 3, left: 15, top: 15 },
  topRight: { borderRightWidth: 3, borderTopWidth: 3, right: 15, top: 15 },
  bottomLeft: { borderBottomWidth: 3, borderLeftWidth: 3, bottom: 15, left: 15 },
  bottomRight: { borderBottomWidth: 3, borderRightWidth: 3, bottom: 15, right: 15 },
  infoCard: { alignItems: "flex-start", backgroundColor: "#EAF2FF", borderRadius: 18, flexDirection: "row", gap: 12, padding: 16 },
  infoIcon: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 12, height: 42, justifyContent: "center", width: 42 },
  infoCopy: { flex: 1, gap: 4 },
  cardTitle: { color: "#142033", fontSize: 15, fontWeight: "700" },
  cardBody: { color: "#627089", fontSize: 13, lineHeight: 19, marginTop: 4 },
  steps: { flexDirection: "row", gap: 8 },
  step: { backgroundColor: "#FFFFFF", borderColor: "#E4E9F2", borderRadius: 16, borderWidth: 1, flex: 1, minHeight: 114, padding: 12 },
  stepNumber: { color: "#0056D2", fontSize: 12, fontWeight: "800" },
  stepTitle: { color: "#142033", fontSize: 14, fontWeight: "700", marginTop: 12 },
  stepBody: { color: "#627089", fontSize: 11, lineHeight: 15, marginTop: 3 },
  historyCard: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E4E9F2", borderRadius: 18, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: 16 },
  bottomAction: { backgroundColor: "#F7F9FC", bottom: 0, left: 0, paddingBottom: 14, paddingHorizontal: 20, paddingTop: 10, position: "absolute", right: 0 },
  primaryButton: { alignItems: "center", backgroundColor: "#0056D2", borderRadius: 16, flexDirection: "row", height: 54, justifyContent: "space-between", paddingHorizontal: 18 },
  primaryPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  pressed: { opacity: 0.7 },
});
