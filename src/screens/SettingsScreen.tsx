// Settings Screen — Expo compatible

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { useSettingsStore } from '../stores';

export const SettingsScreen = () => {
  const { settings, updateSettings } = useSettingsStore();

  const Row = ({ label, sub, right }: { label: string; sub?: string; right?: React.ReactNode }) => (
    <View style={s.row}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel}>{label}</Text>
        {sub && <Text style={s.rowSub}>{sub}</Text>}
      </View>
      {right}
    </View>
  );

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={s.appHeader}>
        <Text style={s.appName}>⌨ Multi Terminal</Text>
        <Text style={s.appVer}>v0.1.0</Text>
        <Text style={s.appDesc}>Multi-protocol network device manager</Text>
      </View>

      <Text style={s.section}>TERMINAL</Text>
      <View style={s.sectionBox}>
        <Row label="Ukuran Font" sub={`${settings.fontSize}px`} right={
          <View style={s.stepper}>
            <TouchableOpacity style={s.stepBtn} onPress={() => updateSettings({ fontSize: Math.max(10, settings.fontSize - 1) })}>
              <Text style={s.stepText}>−</Text>
            </TouchableOpacity>
            <Text style={s.stepVal}>{settings.fontSize}</Text>
            <TouchableOpacity style={s.stepBtn} onPress={() => updateSettings({ fontSize: Math.min(24, settings.fontSize + 1) })}>
              <Text style={s.stepText}>+</Text>
            </TouchableOpacity>
          </View>
        } />
        <Row label="Font Family" sub={settings.fontFamily} />
        <Row label="Theme" sub="Dark (Catppuccin Mocha)" />
      </View>

      <Text style={s.section}>PORT DEFAULT</Text>
      <View style={s.sectionBox}>
        <Row label="SSH" sub={`Port ${settings.defaultSSHPort}`} />
        <Row label="Telnet" sub={`Port ${settings.defaultTelnetPort}`} />
        <Row label="MikroTik API" sub={`Port ${settings.defaultMikroTikPort}`} />
      </View>

      <Text style={s.section}>SCANNER</Text>
      <View style={s.sectionBox}>
        <Row label="Concurrency" sub={`${settings.scanConcurrency} koneksi paralel`} />
        <Row label="Timeout" sub={`${settings.scanTimeout / 1000} detik`} />
      </View>

      <Text style={s.section}>KEAMANAN</Text>
      <View style={s.sectionBox}>
        <Row label="Biometric Auth" sub="FaceID / Fingerprint untuk buka app" right={
          <Switch
            value={settings.biometricAuth}
            onValueChange={val => updateSettings({ biometricAuth: val })}
            trackColor={{ false: '#45475a', true: '#74c7ec50' }}
            thumbColor={settings.biometricAuth ? '#74c7ec' : '#6c7086'}
          />
        } />
      </View>

      <Text style={s.section}>TENTANG</Text>
      <View style={s.sectionBox}>
        <Row label="Build" sub="React Native + Expo + TypeScript" />
        <Row label="Protokol" sub="SSH, Telnet, MikroTik API, HTTP/S" />
        <Row label="Developer" sub="Fibernet Networks Indonesia" />
      </View>
    </ScrollView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e2e' },
  appHeader: { alignItems: 'center', paddingVertical: 32, borderBottomWidth: 1, borderBottomColor: '#313244' },
  appName: { color: '#cdd6f4', fontSize: 22, fontWeight: '700' },
  appVer: { color: '#6c7086', fontSize: 12, marginVertical: 3 },
  appDesc: { color: '#a6adc8', fontSize: 12 },
  section: { color: '#89b4fa', fontSize: 11, fontWeight: '600', letterSpacing: 1, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 6 },
  sectionBox: { backgroundColor: '#313244', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#45475a' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#45475a' },
  rowLabel: { color: '#cdd6f4', fontSize: 14 },
  rowSub: { color: '#6c7086', fontSize: 11, marginTop: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#45475a', alignItems: 'center', justifyContent: 'center' },
  stepText: { color: '#cdd6f4', fontSize: 16, fontWeight: '600' },
  stepVal: { color: '#cdd6f4', fontSize: 14, fontWeight: '600', minWidth: 20, textAlign: 'center' },
});
