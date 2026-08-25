import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { setPendingConference } from "@/lib/conference-session";

async function prepareImage(uri: string) {
  const prepared = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1600 } }],
    { base64: true, compress: 0.72, format: ImageManipulator.SaveFormat.JPEG },
  );
  if (!prepared.base64) throw new Error("Não foi possível preparar a imagem para análise.");
  return { imageUri: prepared.uri, imageBase64: prepared.base64 };
}

export default function CaptureScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [torch, setTorch] = useState(false);
  const [working, setWorking] = useState(false);

  const beginAnalysis = async (uri: string) => {
    setWorking(true);
    try {
      const pending = await prepareImage(uri);
      setPendingConference(pending);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.replace("/processando");
    } catch {
      Alert.alert("Não foi possível usar esta foto", "Tente novamente com uma imagem nítida da folha e da placa.");
    } finally {
      setWorking(false);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current || !cameraReady || working) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.82, base64: false, skipProcessing: false });
    if (photo?.uri) await beginAnalysis(photo.uri);
  };

  const pickImage = async () => {
    if (working) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
      base64: false,
    });
    if (!result.canceled && result.assets[0]?.uri) await beginAnalysis(result.assets[0].uri);
  };

  if (!permission) return <View style={styles.loading} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style="dark" />
        <View style={styles.permissionIcon}><MaterialIcons name="photo-camera" size={32} color="#0056D2" /></View>
        <Text style={styles.permissionTitle}>Precisamos da câmera</Text>
        <Text style={styles.permissionBody}>
          A câmera é usada apenas para fotografar juntos a folha impressa e a placa Mercosul.
        </Text>
        <Pressable onPress={requestPermission} style={({ pressed }) => [styles.permissionButton, pressed && styles.pressed]}>
          <Text style={styles.permissionButtonText}>Permitir câmera</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.cancelTextButton, pressed && styles.pressed]}>
          <Text style={styles.cancelText}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} onCameraReady={() => setCameraReady(true)} />
      <View style={styles.scrim} />
      <View style={styles.topBar}>
        <Pressable accessibilityLabel="Cancelar captura" onPress={() => router.back()} style={({ pressed }) => [styles.roundButton, pressed && styles.pressed]}>
          <MaterialIcons name="close" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={styles.captureTitle}><Text style={styles.captureTitleText}>Nova conferência</Text></View>
        <Pressable accessibilityLabel="Ativar ou desativar lanterna" onPress={() => setTorch((value) => !value)} style={({ pressed }) => [styles.roundButton, torch && styles.roundButtonActive, pressed && styles.pressed]}>
          <MaterialIcons name={torch ? "flash-on" : "flash-off"} size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      <View pointerEvents="none" style={styles.guideWrap}>
        <View style={styles.guide}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
          <View style={styles.divider}>
            <View style={styles.guideLabel}><MaterialIcons name="description" size={14} color="#FFFFFF" /><Text style={styles.guideText}>Folha impressa</Text></View>
            <View style={styles.guideLabel}><MaterialIcons name="directions-car" size={14} color="#FFFFFF" /><Text style={styles.guideText}>Placa Mercosul</Text></View>
          </View>
        </View>
      </View>

      <View style={styles.bottomPanel}>
        <Text style={styles.instruction}>Mantenha os dois itens visíveis na mesma imagem.</Text>
        <View style={styles.controls}>
          <Pressable onPress={pickImage} style={({ pressed }) => [styles.galleryButton, pressed && styles.pressed]}>
            <MaterialIcons name="photo-library" size={23} color="#FFFFFF" />
            <Text style={styles.galleryText}>Galeria</Text>
          </Pressable>
          <Pressable accessibilityLabel="Capturar foto" disabled={!cameraReady || working} onPress={takePicture} style={({ pressed }) => [styles.shutterOuter, (!cameraReady || working) && styles.disabled, pressed && styles.shutterPressed]}>
            <View style={styles.shutterInner}>{working ? <MaterialIcons name="hourglass-top" size={29} color="#0056D2" /> : <MaterialIcons name="photo-camera" size={29} color="#0056D2" />}</View>
          </Pressable>
          <View style={styles.galleryButton} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#142033", flex: 1 },
  loading: { backgroundColor: "#F7F9FC", flex: 1 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(8, 17, 32, 0.28)" },
  topBar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 62 },
  roundButton: { alignItems: "center", backgroundColor: "rgba(20,32,51,0.64)", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  roundButtonActive: { backgroundColor: "#0056D2" },
  captureTitle: { backgroundColor: "rgba(20,32,51,0.64)", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  captureTitleText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  guideWrap: { alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: 28 },
  guide: { height: "64%", maxHeight: 460, position: "relative", width: "100%" },
  corner: { borderColor: "#FFFFFF", height: 34, position: "absolute", width: 34 },
  topLeft: { borderLeftWidth: 3, borderTopWidth: 3, left: 0, top: 0 },
  topRight: { borderRightWidth: 3, borderTopWidth: 3, right: 0, top: 0 },
  bottomLeft: { borderBottomWidth: 3, borderLeftWidth: 3, bottom: 0, left: 0 },
  bottomRight: { borderBottomWidth: 3, borderRightWidth: 3, bottom: 0, right: 0 },
  divider: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.8)", height: 1, justifyContent: "space-between", left: 14, position: "absolute", right: 14, top: "50%" },
  guideLabel: { alignItems: "center", backgroundColor: "rgba(8,17,32,0.72)", borderRadius: 14, flexDirection: "row", gap: 5, paddingHorizontal: 10, paddingVertical: 6, transform: [{ translateY: -16 }] },
  guideText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  bottomPanel: { backgroundColor: "rgba(20,32,51,0.84)", paddingBottom: 34, paddingHorizontal: 22, paddingTop: 18 },
  instruction: { color: "#FFFFFF", fontSize: 14, lineHeight: 20, textAlign: "center" },
  controls: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
  galleryButton: { alignItems: "center", justifyContent: "center", minWidth: 64 },
  galleryText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700", marginTop: 4 },
  shutterOuter: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "rgba(255,255,255,0.45)", borderRadius: 38, borderWidth: 5, height: 76, justifyContent: "center", width: 76 },
  shutterInner: { alignItems: "center", backgroundColor: "#EAF2FF", borderRadius: 28, height: 56, justifyContent: "center", width: 56 },
  shutterPressed: { transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.55 },
  permissionContainer: { alignItems: "center", backgroundColor: "#F7F9FC", flex: 1, justifyContent: "center", padding: 28 },
  permissionIcon: { alignItems: "center", backgroundColor: "#EAF2FF", borderRadius: 24, height: 72, justifyContent: "center", width: 72 },
  permissionTitle: { color: "#142033", fontSize: 25, fontWeight: "800", marginTop: 20 },
  permissionBody: { color: "#627089", fontSize: 16, lineHeight: 23, marginTop: 9, textAlign: "center" },
  permissionButton: { backgroundColor: "#0056D2", borderRadius: 15, marginTop: 26, paddingHorizontal: 22, paddingVertical: 16 },
  permissionButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  cancelTextButton: { marginTop: 16, padding: 10 },
  cancelText: { color: "#0056D2", fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.75 },
});
