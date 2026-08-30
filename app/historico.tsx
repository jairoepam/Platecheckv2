import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { clearConferenceHistory, loadConferenceHistory, type ConferenceHistoryItem } from "@/lib/conference-history";

const STATUS = {
  approved: { color: "#178A4B", label: "Aprovada", icon: "check-circle" as const },
  divergent: { color: "#C93737", label: "Divergente", icon: "error-outline" as const },
  inconclusive: { color: "#C97800", label: "Revisão", icon: "warning" as const },
};

export default function HistoryScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ConferenceHistoryItem[]>([]);
  const refresh = useCallback(() => {
    loadConferenceHistory().then(setItems).catch(() => setItems([]));
  }, []);
  useFocusEffect(refresh);

  const approved = items.filter((item) => item.status === "approved").length;
  const attention = items.length - approved;
  const askClear = () =>
    Alert.alert("Limpar histórico?", "Os resultados armazenados neste dispositivo serão removidos.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Limpar", style: "destructive", onPress: async () => { await clearConferenceHistory(); setItems([]); } },
    ]);

  return (
    <ScreenContainer className="px-5" edges={["top", "bottom", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <MaterialIcons name="arrow-back" size={23} color="#142033" />
        </Pressable>
        <Text style={styles.title}>Histórico</Text>
        <Pressable disabled={!items.length} onPress={askClear} style={({ pressed }) => [styles.iconButton, !items.length && styles.disabled, pressed && styles.pressed]}>
          <MaterialIcons name="delete-outline" size={23} color="#C93737" />
        </Pressable>
      </View>
      <View style={styles.summary}>
        <View style={styles.summaryMetric}><Text style={styles.summaryNumber}>{items.length}</Text><Text style={styles.summaryLabel}>placas{`\n`}registradas</Text></View>
        <View style={styles.summaryMetric}><Text style={[styles.summaryNumber, { color: "#178A4B" }]}>{approved}</Text><Text style={styles.summaryLabel}>aprovadas</Text></View>
        <View style={styles.summaryMetric}><Text style={[styles.summaryNumber, { color: attention ? "#C97800" : "#142033" }]}>{attention}</Text><Text style={styles.summaryLabel}>para{`\n`}atenção</Text></View>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={items.length ? styles.list : styles.emptyList}
        ListHeaderComponent={items.length ? <Text style={styles.listTitle}>Conferências recentes</Text> : null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><MaterialIcons name="history" size={30} color="#0056D2" /></View>
            <Text style={styles.emptyTitle}>Nenhuma conferência ainda</Text>
            <Text style={styles.emptyText}>As análises realizadas neste dispositivo aparecerão aqui.</Text>
            <Pressable onPress={() => router.replace("/captura")} style={({ pressed }) => [styles.emptyButton, pressed && styles.pressed]}>
              <Text style={styles.emptyButtonText}>Fazer primeira conferência</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const status = STATUS[item.status];
          const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(item.createdAt));
          return (
            <View style={styles.item}>
              <View style={[styles.statusIcon, { backgroundColor: `${status.color}18` }]}><MaterialIcons name={status.icon} size={20} color={status.color} /></View>
              <View style={styles.itemCopy}><Text style={styles.plate}>{item.plate ?? item.sheet ?? "Não identificada"}</Text><Text style={styles.itemMeta}>{date} · {item.confidence}% confiança</Text></View>
              <View style={[styles.statusPill, { backgroundColor: `${status.color}18` }]}><Text style={[styles.statusPillText, { color: status.color }]}>{status.label}</Text></View>
            </View>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingTop: 8 },
  iconButton: { alignItems: "center", height: 42, justifyContent: "center", width: 42 },
  title: { color: "#142033", fontSize: 18, fontWeight: "800" },
  disabled: { opacity: 0.28 },
  summary: { backgroundColor: "#EAF2FF", borderRadius: 20, flexDirection: "row", marginTop: 18, paddingVertical: 18 },
  summaryMetric: { alignItems: "center", flex: 1 },
  summaryNumber: { color: "#142033", fontSize: 24, fontWeight: "800" },
  summaryLabel: { color: "#627089", fontSize: 11, lineHeight: 14, marginTop: 4, textAlign: "center" },
  list: { gap: 10, paddingBottom: 20, paddingTop: 22 },
  listTitle: { color: "#142033", fontSize: 15, fontWeight: "800", marginBottom: 4 },
  item: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E4E9F2", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 11, padding: 13 },
  statusIcon: { alignItems: "center", borderRadius: 14, height: 38, justifyContent: "center", width: 38 },
  itemCopy: { flex: 1 },
  plate: { color: "#142033", fontSize: 16, fontWeight: "800", letterSpacing: 0.9 },
  itemMeta: { color: "#627089", fontSize: 11, marginTop: 3 },
  statusPill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  statusPillText: { fontSize: 10, fontWeight: "800" },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  empty: { alignItems: "center", paddingHorizontal: 30 },
  emptyIcon: { alignItems: "center", backgroundColor: "#EAF2FF", borderRadius: 26, height: 78, justifyContent: "center", width: 78 },
  emptyTitle: { color: "#142033", fontSize: 20, fontWeight: "800", marginTop: 18 },
  emptyText: { color: "#627089", fontSize: 14, lineHeight: 20, marginTop: 7, textAlign: "center" },
  emptyButton: { backgroundColor: "#0056D2", borderRadius: 14, marginTop: 20, paddingHorizontal: 16, paddingVertical: 13 },
  emptyButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  pressed: { opacity: 0.7 },
});
