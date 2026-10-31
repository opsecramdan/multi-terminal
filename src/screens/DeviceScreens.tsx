// Device List Screen + Add Device Screen — Expo compatible
// Mock data included for immediate testing

import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, TextInput, RefreshControl,
} from 'react-native';
import { useDeviceStore } from '../stores';
import type { Device, ConnectionProtocol, DeviceVendor } from '../types';

// ============================================
// Protocol & Vendor Info
// ============================================

const PROTO: Record<ConnectionProtocol, { label: string; icon: string; color: string }> = {
  ssh: { label: 'SSH', icon: '⌨️', color: '#a6e3a1' },
  telnet: { label: 'Telnet', icon: '📟', color: '#f9e2af' },
  'mikrotik-api': { label: 'MikroTik API', icon: '🔧', color: '#89b4fa' },
  http: { label: 'HTTP', icon: '🌐', color: '#74c7ec' },
  https: { label: 'HTTPS', icon: '🔒', color: '#94e2d5' },
};

const VENDORS: Record<DeviceVendor, string> = {
  mikrotik: 'MikroTik', fortigate: 'FortiGate', juniper: 'Juniper',
  huawei: 'Huawei', cisco: 'Cisco', tplink: 'TP-Link', linksys: 'Linksys',
  dlink: 'D-Link', ubiquiti: 'Ubiquiti', generic: 'Generic', unknown: 'Unknown',
};

// ============================================
// Device Card
// ============================================

const DeviceCard = ({ device, onPress, onLongPress }: {
  device: Device; onPress: (d: Device) => void; onLongPress: (d: Device) => void;
}) => {
  const p = PROTO[device.protocol];
  const last = device.lastConnected
    ? new Date(device.lastConnected).toLocaleDateString('id-ID', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })
    : 'Belum pernah';

  return (
    <TouchableOpacity style={s.card} onPress={() => onPress(device)} onLongPress={() => onLongPress(device)} activeOpacity={0.7}>
      <Text style={s.cardIcon}>{p.icon}</Text>
      <View style={s.cardCenter}>
        <Text style={s.cardName}>{device.name}</Text>
        <Text style={s.cardHost}>{device.host}:{device.port}</Text>
        <View style={s.tagRow}>
          <View style={[s.tag, { backgroundColor: p.color + '20' }]}>
            <Text style={[s.tagText, { color: p.color }]}>{p.label}</Text>
          </View>
          <View style={[s.tag, { backgroundColor: '#585b7040' }]}>
            <Text style={s.tagText}>{VENDORS[device.vendor]}</Text>
          </View>
        </View>
      </View>
      <View style={s.cardRight}>
        <Text style={s.cardTime}>{last}</Text>
        <Text style={s.cardArrow}>→</Text>
      </View>
    </TouchableOpacity>
  );
};

// ============================================
// Device List Screen
// ============================================

export const DeviceListScreen = ({ navigation }: any) => {
  const { devices, removeDevice } = useDeviceStore();
  const [search, setSearch] = useState('');

  const filtered = devices.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) || d.host.includes(search)
  );

  const handleConnect = useCallback((device: Device) => {
    switch (device.protocol) {
      case 'mikrotik-api':
        navigation.navigate('MikroTik', { deviceId: device.id });
        break;
      case 'http':
      case 'https':
        navigation.navigate('WebTerminal', {
          deviceId: device.id,
          url: `${device.protocol}://${device.host}:${device.port}`,
        });
        break;
      default:
        navigation.navigate('Terminal', { deviceId: device.id });
    }
  }, [navigation]);

  const handleLongPress = useCallback((device: Device) => {
    Alert.alert(device.name, `${device.host}:${device.port}`, [
      {
        text: 'Hapus', style: 'destructive',
        onPress: () => Alert.alert('Konfirmasi', `Hapus ${device.name}?`, [
          { text: 'Batal', style: 'cancel' },
          { text: 'Hapus', style: 'destructive', onPress: () => removeDevice(device.id) },
        ]),
      },
      { text: 'Batal', style: 'cancel' },
    ]);
  }, [removeDevice]);

  return (
    <View style={s.container}>
      <View style={s.searchWrap}>
        <TextInput style={s.searchInput} placeholder="🔍 Cari perangkat..." placeholderTextColor="#6c7086" value={search} onChangeText={setSearch} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <DeviceCard device={item} onPress={handleConnect} onLongPress={handleLongPress} />}
        contentContainerStyle={s.listContent}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 60, marginBottom: 16 }}>📡</Text>
            <Text style={s.emptyTitle}>Belum ada perangkat</Text>
            <Text style={s.emptySubtitle}>Tambah perangkat manual atau gunakan Scanner</Text>
            <TouchableOpacity style={s.addBtn} onPress={() => navigation.navigate('AddDevice')}>
              <Text style={s.addBtnText}>+ Tambah Perangkat</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {devices.length > 0 && (
        <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('AddDevice')} activeOpacity={0.8}>
          <Text style={s.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ============================================
// Add Device Screen
// ============================================

export const AddDeviceScreen = ({ navigation }: any) => {
  const { addDevice } = useDeviceStore();
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('22');
  const [protocol, setProtocol] = useState<ConnectionProtocol>('ssh');
  const [username, setUsername] = useState('');

  const protos: { key: ConnectionProtocol; defaultPort: string }[] = [
    { key: 'ssh', defaultPort: '22' },
    { key: 'telnet', defaultPort: '23' },
    { key: 'mikrotik-api', defaultPort: '8728' },
    { key: 'http', defaultPort: '80' },
    { key: 'https', defaultPort: '443' },
  ];

  const handleSave = () => {
    if (!name.trim() || !host.trim()) {
      Alert.alert('Error', 'Nama dan host harus diisi');
      return;
    }
    addDevice({
      name: name.trim(),
      host: host.trim(),
      port: parseInt(port, 10) || 22,
      protocol,
      vendor: 'generic',
      deviceType: 'other',
    });
    navigation.goBack();
  };

  return (
    <View style={s.container}>
      <View style={{ padding: 16 }}>
        <Text style={s.formLabel}>Nama Perangkat</Text>
        <TextInput style={s.formInput} value={name} onChangeText={setName} placeholder="Router Core 1" placeholderTextColor="#6c7086" />

        <Text style={s.formLabel}>Host / IP</Text>
        <TextInput style={s.formInput} value={host} onChangeText={setHost} placeholder="192.168.1.1" placeholderTextColor="#6c7086" autoCapitalize="none" keyboardType="url" />

        <Text style={s.formLabel}>Port</Text>
        <TextInput style={s.formInput} value={port} onChangeText={setPort} placeholder="22" placeholderTextColor="#6c7086" keyboardType="numeric" />

        <Text style={s.formLabel}>Protocol</Text>
        <View style={s.protoRow}>
          {protos.map(p => {
            const info = PROTO[p.key];
            const active = protocol === p.key;
            return (
              <TouchableOpacity
                key={p.key}
                style={[s.protoBtn, active && s.protoBtnActive]}
                onPress={() => { setProtocol(p.key); setPort(p.defaultPort); }}
              >
                <Text style={[s.protoBtnText, active && s.protoBtnTextActive]}>
                  {info.icon} {info.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={s.formLabel}>Username (opsional)</Text>
        <TextInput style={s.formInput} value={username} onChangeText={setUsername} placeholder="admin" placeholderTextColor="#6c7086" autoCapitalize="none" />

        <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
          <Text style={s.saveBtnText}>Simpan Perangkat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ============================================
// Styles
// ============================================

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e2e' },
  searchWrap: { padding: 12, paddingBottom: 0 },
  searchInput: { backgroundColor: '#313244', borderRadius: 10, padding: 12, paddingHorizontal: 16, color: '#cdd6f4', fontSize: 15, borderWidth: 1, borderColor: '#45475a' },
  listContent: { padding: 12, paddingBottom: 80 },
  card: { flexDirection: 'row', backgroundColor: '#313244', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#45475a', alignItems: 'center' },
  cardIcon: { fontSize: 26, marginRight: 12 },
  cardCenter: { flex: 1 },
  cardName: { color: '#cdd6f4', fontSize: 15, fontWeight: '600' },
  cardHost: { color: '#a6adc8', fontSize: 12, fontFamily: 'monospace', marginVertical: 2 },
  tagRow: { flexDirection: 'row', gap: 5 },
  tag: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 5 },
  tagText: { color: '#bac2de', fontSize: 10, fontWeight: '500' },
  cardRight: { alignItems: 'flex-end' },
  cardTime: { color: '#6c7086', fontSize: 9, marginBottom: 4 },
  cardArrow: { color: '#74c7ec', fontSize: 18, fontWeight: '600' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 100, paddingHorizontal: 40 },
  emptyTitle: { color: '#cdd6f4', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { color: '#6c7086', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  addBtn: { backgroundColor: '#74c7ec', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  addBtnText: { color: '#1e1e2e', fontSize: 16, fontWeight: '700' },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#74c7ec', alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4 },
  fabText: { color: '#1e1e2e', fontSize: 28, fontWeight: '600', lineHeight: 30 },
  formLabel: { color: '#a6adc8', fontSize: 12, fontWeight: '600', marginBottom: 5, marginTop: 14 },
  formInput: { backgroundColor: '#313244', borderRadius: 10, padding: 12, paddingHorizontal: 16, color: '#cdd6f4', fontSize: 15, borderWidth: 1, borderColor: '#45475a' },
  protoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  protoBtn: { backgroundColor: '#313244', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#45475a' },
  protoBtnActive: { backgroundColor: '#74c7ec20', borderColor: '#74c7ec' },
  protoBtnText: { color: '#6c7086', fontSize: 12, fontWeight: '500' },
  protoBtnTextActive: { color: '#74c7ec' },
  saveBtn: { backgroundColor: '#a6e3a1', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 30 },
  saveBtnText: { color: '#1e1e2e', fontSize: 16, fontWeight: '700' },
});
