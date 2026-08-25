import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { saveConferenceResult } from "@/lib/conference-history";
import { getPendingConference, setConferenceResult } from "@/lib/conference-session";
import { trpc } from "@/lib/trpc";

const STEPS = ["Localizando as duas regiões", "Lendo as sequências", "Comparando caractere a caractere"];

export default function ProcessingScreen() {
  const router = useRouter();
  const pending = useMemo(() => getPendingConference(), []);
  const [elapsed, setElapsed] = useState(0);
  const [started, setStarted] = useState(false);
  const analysis = trpc.conference.analyze.useMutation({
    onSuccess: async (result) => {
      setConferenceResult(result);
      await saveConferenceResult(result);
      await Haptics.notificationAsync(
        result.status === "approved"
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );
      router.replace("/resultado");
    },
  });

  useEffect(() => {
    if (!pending) {
      router.replace("/");
      return;
    }
    if (!started) {
      setStarted(true);
      analysis.mutate({ imageBase64: pending.imageBase64 });
    }
  }, [analysis, pending, router, started]);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((value) => value + 0.1), 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <ScreenContainer className="p-5" edges={["top", "bottom", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.lock}>
          <MaterialIcons name="lock" size={18} color="#0056D2" />
        </View>
        <Text style={styles.secureText}>ANÁLISE PROTEGIDA</Text>
      </View>
      <View style={styles.main}>
        <Text style={styles.title}>Conferindo sua foto</Text>
        <Text style={styles.subtitle}>Estamos lendo as duas sequências da mesma imagem.</Text>
        {pending ? <Image source={{ uri: pending.imageUri }} style={styles.preview} /> : null}
        <View style={styles.photoCaption}>
          <MaterialIcons name="lock" size={14} color="#627089" />
          <Text style={styles.photoCaptionText}>Foto única capturada</Text>
        </View>
        <View style={styles.list}>
          {STEPS.map((step, index) => {
            const active = Math.min(2, Math.floor(elapsed / 1.7)) === index;
            const complete = Math.floor(elapsed / 1.7) > index;
            return (
              <View key={step} style={styles.stepRow}>
                <View style={[styles.stepIcon, complete && styles.stepDone, active && styles.stepActive]}>
                  {complete ? (
                    <MaterialIcons name="check" size={16} color="#FFFFFF" />
                  ) : active ? (
                    <ActivityIndicator size="small" color="#0056D2" />
                  ) : (
                    <Text style={styles.stepNumber}>{index + 1}</Text>
                  )}
                </View>
                <Text style={[styles.stepText, active && styles.stepTextActive]}>{step}</Text>
              </View>
            );
          })}
        </View>
      </View>
      <View style={styles.footer}>
        {analysis.isError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>A análise não foi concluída. Verifique a conexão e tente novamente.</Text>
            <Pressable
              onPress={() => pending && analysis.mutate({ imageBase64: pending.imageBase64 })}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
            >
              <Text style={styles.retryText}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>Tempo de resposta</Text>
              <Text style={styles.timeValue}>{elapsed.toFixed(1)}s</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(92, 18 + elapsed * 13)}%` }]} />
            </View>
            <Text style={styles.hint}>A leitura depende da nitidez, iluminação e conexão.</Text>
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", flexDirection: "row", gap: 7, justifyContent: "center", paddingTop: 10 },
  lock: { alignItems: "center", backgroundColor: "#EAF2FF", borderRadius: 12, height: 28, justifyContent: "center", width: 28 },
  secureText: { color: "#0056D2", fontSize: 11, fontWeight: "800", letterSpacing: 0.9 },
  main: { alignItems: "center", flex: 1, justifyContent: "center" },
  title: { color: "#142033", fontSize: 28, fontWeight: "800", letterSpacing: -0.5, marginTop: 32 },
  subtitle: { color: "#627089", fontSize: 16, lineHeight: 23, marginTop: 8, maxWidth: 290, textAlign: "center" },
  preview: { borderRadius: 18, height: 184, marginTop: 28, width: 142 },
  photoCaption: { alignItems: "center", flexDirection: "row", gap: 5, marginTop: 9 },
  photoCaptionText: { color: "#627089", fontSize: 12, fontWeight: "600" },
  list: { alignSelf: "stretch", gap: 14, marginTop: 32 },
  stepRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  stepIcon: { alignItems: "center", backgroundColor: "#EDF1F7", borderRadius: 14, height: 28, justifyContent: "center", width: 28 },
  stepDone: { backgroundColor: "#178A4B" },
  stepActive: { backgroundColor: "#EAF2FF" },
  stepNumber: { color: "#627089", fontSize: 12, fontWeight: "800" },
  stepText: { color: "#627089", fontSize: 15, fontWeight: "600" },
  stepTextActive: { color: "#142033", fontWeight: "700" },
  footer: { paddingBottom: 8 },
  timeRow: { flexDirection: "row", justifyContent: "space-between" },
  timeLabel: { color: "#627089", fontSize: 13 },
  timeValue: { color: "#142033", fontSize: 13, fontWeight: "800" },
  progressTrack: { backgroundColor: "#E4E9F2", borderRadius: 5, height: 8, marginTop: 9, overflow: "hidden" },
  progressFill: { backgroundColor: "#0056D2", borderRadius: 5, height: "100%" },
  hint: { color: "#8994A8", fontSize: 11, marginTop: 11, textAlign: "center" },
  errorCard: { backgroundColor: "#FFF0EF", borderRadius: 16, padding: 15 },
  errorText: { color: "#A62A2A", fontSize: 13, lineHeight: 19, textAlign: "center" },
  retryButton: { alignSelf: "center", marginTop: 10, padding: 8 },
  retryText: { color: "#0056D2", fontSize: 14, fontWeight: "800" },
  pressed: { opacity: 0.72 },
});
