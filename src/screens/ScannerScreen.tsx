// Scanner Screen — Network discovery with simulated scan for Expo Go

import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Alert,
} from 'react-native';
import { useDeviceStore } from '../stores';
import type { DeviceVendor } from '../types';

const VENDOR_COLORS: Record<string, string> = {
  mikrotik: '#89b4fa', fortigate: '#f38ba8', juniper: '#a6e3a1',
  huawei: '#f9e2af', cisco: '#74c7ec', tplink: '#94e2d5',
  linksys: '#cba6f7', dlink: '#fab387', ubiquiti: '#74c7ec',
  generic: '#6c7086', unknown: '#585b70',
};
const VENDOR_LABELS: Record<string, string> = {
  mikrotik: 'MikroTik', fortigate: 'FortiGate', juniper: 'Juniper',
  huawei: 'Huawei', cisco: 'Cisco', tplink: 'TP-Link', linksys: 'Linksys',
  dlink: 'D-Link', ubiquiti: 'Ubiquiti', generic: 'Generic', unknown: 'Unknown',
};

interface SimDevice {
  ip: string; mac: string; vendor: string; type: string; ports: string;
}

const MOCK_DEVICES: SimDevice[] = [
  { ip: '192.168.88.1', mac: 'E4:8D:8C:AB:12:34', vendor: 'mikrotik', type: 'router', ports: '22, 80, 8291, 8728' },
  { ip: '192.168.88.10', mac: '70:4C:A5:11:22:33', vendor: 'fortigate', type: 'firewall', ports: '22, 443, 541' },
  { ip: '192.168.88.20', mac: '00:05:85:AA:BB:CC', vendor: 'juniper', type: 'router', ports: '22, 443, 830' },
  { ip: '192.168.88.50', mac: '14:CC:20:DE:F0:01', vendor: 'tplink', type: 'access-point', ports: '80, 443' },
  { ip: '192.168.88.51', mac: '1C:7E:E5:12:34:56', vendor: 'dlink', type: 'access-point', ports: '80, 23' },
  { ip: '192.168.88.100', mac: 'FC:EC:DA:99:88:77', vendor: 'ubiquiti', type: 'access-point', ports: '22, 80, 443' },
  { ip: '192.168.88.200', mac: '00:1E:10:AB:CD:EF', vendor: 'huawei', type: 'router', ports: '22, 23, 80, 443' },
];

export const ScannerScreen = ({ navigation }: any) => {
  const [subnet, setSubnet] = useState('192.168.88.0/24');
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scanned, setScanned] = useState(0);
  const [results, setResults] = useState<SimDevice[]>([]);
  const { addDevice } = useDeviceStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startScan = useCallback(() => {
    if (scanning) {
      // Stop
      if (timerRef.current) clearInterval(timerRef.current);
      setScanning(false);
      return;
    }

    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    if (!cidrRegex.test(subnet)) {
      Alert.alert('Error', 'Format subnet tidak valid.\nContoh: 192.168.1.0/24');
      return;
    }

    setScanning(true);
    setResults([]);
    setScanned(0);
    setProgress(0);

    let count = 0;
    let devIdx = 0;

    timerRef.current = setInterval(() => {
      count += Math.floor(Math.random() * 8) + 3;
      if (count > 254) count = 254;
      setScanned(count);
      setProgress(Math.round(count / 254 * 100));

      if (devIdx < MOCK_DEVICES.length && Math.random() > 0.3) {
        setResults(prev => [...prev, MOCK_DEVICES[devIdx]]);
        devIdx++;
      }

      if (count >= 254) {
        if (timerRef.current) clearInterval(timerRef.current);
        setScanning(false);
        // Add remaining
        while (devIdx < MOCK_DEVICES.length) {
          setResults(prev => [...prev, MOCK_DEVICES[devIdx]]);
          devIdx++;
        }
      }
    }, 350);
  }, [subnet, scanning]);

  const handleAdd = useCallback((dev: SimDevice) => {
    const portList = dev.ports.split(',').map(p => parseInt(p.trim()));
    let protocol: any = 'ssh';
    let port = 22;
    if (portList.includes(8728)) { protocol = 'mikrotik-api'; port = 8728; }
    else if (portList.includes(443)) { protocol = 'https'; port = 443; }
    else if (portList.includes(80)) { protocol = 'http'; port = 80; }
    else if (portList.includes(23)) { protocol = 'telnet'; port = 23; }

    addDevice({
      name: `${VENDOR_LABELS[dev.vendor]} - ${dev.ip}`,
      host: dev.ip,
      port,
      protocol,
      vendor: dev.vendor as DeviceVendor,
      deviceType: dev.type as any,
      macAddress: dev.mac,
    });
    Alert.alert('✓ Ditambahkan', `${dev.ip} berhasil ditambahkan`);
  }, [addDevice]);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>🔍 Network Scanner</Text>
        <Text style={s.subtitle}>Temukan perangkat di jaringan lokal</Text>
        <View style={s.inputRow}>
          <TextInput style={s.subnetInput} value={subnet} onChangeText={setSubnet}
            placeholder="192.168.1.0/24" placeholderTextColor="#6c7086"
            autoCapitalize="none" keyboardType="url" editable={!scanning} />
          <TouchableOpacity
            style={[s.scanBtn, scanning && { backgroundColor: '#f38ba8' }]}
            onPress={startScan}
          >
            <Text style={s.scanBtnText}>{scanning ? '■ Stop' : '▶ Scan'}</Text>
          </TouchableOpacity>
        </View>
        <View style={s.shortcuts}>
          {['192.168.1.0/24', '192.168.88.0/24', '10.0.0.0/24', '172.16.0.0/24'].map(sn => (
            <TouchableOpacity key={sn}
              style={[s.shortcut, subnet === sn && s.shortcutActive]}
              onPress={() => setSubnet(sn)}>
              <Text style={[s.shortcutText, subnet === sn && s.shortcutTextActive]}>{sn}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Progress */}
      {(scanning || scanned > 0) && (
        <View style={s.progressWrap}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={s.progressText}>
            {scanned}/254 host • {results.length} ditemukan • {scanned >= 254 ? 'Selesai ✓' : `${progress}%`}
          </Text>
        </View>
      )}

      {/* Results */}
      <FlatList
        data={results}
        keyExtractor={item => item.ip}
        renderItem={({ item }) => {
          const vc = VENDOR_COLORS[item.vendor] || '#585b70';
          return (
            <View style={s.resultCard}>
              <View style={[s.vendorDot, { backgroundColor: vc }]} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.resultIP}>{item.ip}</Text>
                <Text style={s.resultMAC}>{item.mac}</Text>
                <View style={{ flexDirection: 'row', gap: 5, marginVertical: 3 }}>
                  <View style={[s.tag, { backgroundColor: vc + '20' }]}>
                    <Text style={[s.tagText, { color: vc }]}>{VENDOR_LABELS[item.vendor]}</Text>
                  </View>
                  <View style={[s.tag, { backgroundColor: '#45475a' }]}>
                    <Text style={s.tagText}>{item.type}</Text>
                  </View>
                </View>
                <Text style={s.resultPorts}>Ports: {item.ports}</Text>
              </View>
              <TouchableOpacity style={s.addBtn} onPress={() => handleAdd(item)}>
                <Text style={s.addBtnText}>+ Tambah</Text>
              </TouchableOpacity>
            </View>
          );
        }}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 }}>
            <Text style={{ fontSize: 50, marginBottom: 16 }}>📡</Text>
            <Text style={{ color: '#6c7086', fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
              {scanning ? 'Sedang memindai...' : 'Masukkan subnet dan tekan Scan'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e2e' },
  header: { padding: 16, backgroundColor: '#181825', borderBottomWidth: 1, borderBottomColor: '#313244' },
  title: { color: '#cdd6f4', fontSize: 18, fontWeight: '700', marginBottom: 2 },
  subtitle: { color: '#6c7086', fontSize: 12, marginBottom: 14 },
  inputRow: { flexDirection: 'row', gap: 8 },
  subnetInput: { flex: 1, backgroundColor: '#313244', borderRadius: 10, padding: 10, paddingHorizontal: 14, color: '#cdd6f4', fontSize: 14, fontFamily: 'monospace', borderWidth: 1, borderColor: '#45475a' },
  scanBtn: { backgroundColor: '#a6e3a1', paddingHorizontal: 18, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  scanBtnText: { color: '#1e1e2e', fontSize: 14, fontWeight: '700' },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10 },
  shortcut: { backgroundColor: '#313244', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 5, borderWidth: 1, borderColor: '#45475a' },
  shortcutActive: { borderColor: '#74c7ec', backgroundColor: 'rgba(116,199,236,0.08)' },
  shortcutText: { color: '#6c7086', fontSize: 10, fontFamily: 'monospace' },
  shortcutTextActive: { color: '#74c7ec' },
  progressWrap: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#181825' },
  progressTrack: { height: 4, backgroundColor: '#313244', borderRadius: 2, overflow: 'hidden', marginBottom: 5 },
  progressFill: { height: '100%', backgroundColor: '#74c7ec', borderRadius: 2 },
  progressText: { color: '#6c7086', fontSize: 11 },
  resultCard: { flexDirection: 'row', backgroundColor: '#313244', borderRadius: 12, padding: 12, marginBottom: 7, borderWidth: 1, borderColor: '#45475a', alignItems: 'center' },
  vendorDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  resultIP: { color: '#cdd6f4', fontSize: 15, fontWeight: '600', fontFamily: 'monospace' },
  resultMAC: { color: '#6c7086', fontSize: 10, fontFamily: 'monospace' },
  resultPorts: { color: '#a6adc8', fontSize: 10, fontFamily: 'monospace' },
  tag: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 5 },
  tagText: { color: '#bac2de', fontSize: 10, fontWeight: '500' },
  addBtn: { backgroundColor: 'rgba(116,199,236,0.12)', borderWidth: 1, borderColor: 'rgba(116,199,236,0.3)', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 7 },
  addBtnText: { color: '#74c7ec', fontSize: 11, fontWeight: '600' },
});
