import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";

import { ScreenContainer } from "@/components/screen-container";
import { saveConferenceResult } from "@/lib/conference-history";
import { getPendingConference, setConferenceResult } from "@/lib/conference-session";
import { trpc } from "@/lib/trpc";

const STEPS = ["Localizando as duas regiões", "Lendo as sequências", "Comparando caractere a caractere"];

function ResponseTime() {
  const startedAt = useRef(Date.now());
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(Math.round(((Date.now() - startedAt.current) / 1000) * 10) / 10);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return <Text style={styles.responseTime}>Tempo de resposta: {seconds.toFixed(1)} segundos</Text>;
}

async function createFocusedCrops(imageUri: string, imageWidth: number, imageHeight: number, targetWidth = 1200) {
  const splitY = Math.floor(imageHeight * 0.42);
  const [sheetCrop, plateCrop] = await Promise.all([
    ImageManipulator.manipulateAsync(
      imageUri,
      [{ crop: { originX: 0, originY: 0, width: imageWidth, height: splitY } }, { resize: { width: targetWidth } }],
      { base64: true, compress: 0.78, format: ImageManipulator.SaveFormat.JPEG },
    ),
    ImageManipulator.manipulateAsync(
      imageUri,
      [{ crop: { originX: 0, originY: splitY, width: imageWidth, height: imageHeight - splitY } }, { resize: { width: targetWidth } }],
      { base64: true, compress: 0.78, format: ImageManipulator.SaveFormat.JPEG },
    ),
  ]);
  if (!sheetCrop.base64 || !plateCrop.base64) throw new Error("Não foi possível preparar os recortes da conferência.");
  return { sheetCropBase64: sheetCrop.base64, plateCropBase64: plateCrop.base64 };
}

export default function ProcessingScreen() {
  const router = useRouter();
  const pending = useMemo(() => getPendingConference(), []);
  const [started, setStarted] = useState(false);
  const fallbackRequested = useRef(false);
  const analysis = trpc.conference.analyze.useMutation({
    onSuccess: async (result) => {
      const containsCriticalWh = /[WH]/.test(`${result.sheet ?? ""}${result.plate ?? ""}`);
      const canVerifyOnlyWh = containsCriticalWh && Boolean(result.sheet && result.plate);
      const needsWhVerification = canVerifyOnlyWh && (result.status === "approved" || result.status === "inconclusive");
      const needsFocusedVerification = result.status === "inconclusive" && !needsWhVerification;
      if (!fallbackRequested.current && (needsWhVerification || needsFocusedVerification) && pending) {
        try {
          fallbackRequested.current = true;
          const crops = await createFocusedCrops(
            pending.imageUri,
            pending.imageWidth,
            pending.imageHeight,
            needsWhVerification ? 800 : 1200,
          );
          analysis.mutate(
            needsWhVerification
              ? {
                  imageBase64: pending.imageBase64,
                  ...crops,
                  knownSheet: result.sheet ?? undefined,
                  knownPlate: result.plate ?? undefined,
                  verifyWh: true,
                }
              : { imageBase64: pending.imageBase64, ...crops },
          );
          return;
        } catch {
          // Se os recortes falharem, mantém o resultado inconclusivo original.
        }
      }
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
        {pending ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: pending.imageUri }} style={styles.preview} resizeMode="cover" />
            <View style={styles.photoCaption}>
              <MaterialIcons name="lock" size={15} color="#FFFFFF" />
              <Text style={styles.photoCaptionText}>Foto única capturada</Text>
            </View>
          </View>
        ) : null}
        <View style={styles.list}>
          {STEPS.map((step, index) => {
            const active = index === 1;
            const complete = index === 0;
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
              onPress={() => {
                fallbackRequested.current = false;
                pending && analysis.mutate({ imageBase64: pending.imageBase64 });
              }}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
            >
              <Text style={styles.retryText}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.loadingWrap}>
              <ResponseTime />
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
  title: { color: "#142033", fontSize: 28, fontWeight: "800", letterSpacing: -0.5, marginTop: 22 },
  subtitle: { color: "#627089", fontSize: 16, lineHeight: 23, marginTop: 8, maxWidth: 290, textAlign: "center" },
  previewWrap: {
    alignSelf: "stretch",
    borderRadius: 20,
    height: 220,
    marginTop: 22,
    overflow: "hidden",
  },
  preview: { height: "100%", width: "100%" },
  photoCaption: {
    alignItems: "center",
    backgroundColor: "rgba(12, 32, 54, 0.78)",
    bottom: 0,
    flexDirection: "row",
    gap: 7,
    left: 0,
    paddingHorizontal: 16,
    paddingVertical: 11,
    position: "absolute",
    right: 0,
  },
  photoCaptionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  list: { alignSelf: "stretch", gap: 12, marginTop: 22 },
  stepRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  stepIcon: { alignItems: "center", backgroundColor: "#EDF1F7", borderRadius: 14, height: 28, justifyContent: "center", width: 28 },
  stepDone: { backgroundColor: "#178A4B" },
  stepActive: { backgroundColor: "#EAF2FF" },
  stepNumber: { color: "#627089", fontSize: 12, fontWeight: "800" },
  stepText: { color: "#627089", fontSize: 15, fontWeight: "600" },
  stepTextActive: { color: "#142033", fontWeight: "700" },
  footer: { alignItems: "center", paddingBottom: 8 },
  loadingWrap: { alignItems: "center", justifyContent: "center", minHeight: 24 },
  responseTime: { color: "#627089", fontSize: 13, fontVariant: ["tabular-nums"], textAlign: "center" },
  hint: { color: "#8994A8", fontSize: 11, marginTop: 9, textAlign: "center" },
  errorCard: { backgroundColor: "#FFF0EF", borderRadius: 16, padding: 15 },
  errorText: { color: "#A62A2A", fontSize: 13, lineHeight: 19, textAlign: "center" },
  retryButton: { alignSelf: "center", marginTop: 10, padding: 8 },
  retryText: { color: "#0056D2", fontSize: 14, fontWeight: "800" },
  pressed: { opacity: 0.72 },
});
