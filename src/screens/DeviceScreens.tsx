// Device Screens — Redesigned with groups, smooth UI, long-press actions

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, TextInput, ScrollView, Linking, Modal, Animated,
  SectionList,
} from 'react-native';
import { useDeviceStore } from '../stores';
import type { Device, ConnectionProtocol, DeviceVendor, DeviceGroup } from '../types';

const PROTO: Record<ConnectionProtocol, { label: string; icon: string; color: string }> = {
  ssh: { label: 'SSH', icon: '⌨️', color: '#a6e3a1' },
  telnet: { label: 'Telnet', icon: '📟', color: '#f9e2af' },
  'mikrotik-api': { label: 'MikroTik', icon: '🔧', color: '#89b4fa' },
  http: { label: 'HTTP', icon: '🌐', color: '#74c7ec' },
  https: { label: 'HTTPS', icon: '🔒', color: '#94e2d5' },
};

const VENDORS: Record<DeviceVendor, string> = {
  mikrotik: 'MikroTik', fortigate: 'FortiGate', juniper: 'Juniper',
  huawei: 'Huawei', cisco: 'Cisco', tplink: 'TP-Link', linksys: 'Linksys',
  dlink: 'D-Link', ubiquiti: 'Ubiquiti', generic: 'Generic', unknown: 'Unknown',
};

const GROUP_COLORS = ['#74c7ec', '#a6e3a1', '#f9e2af', '#f38ba8', '#cba6f7', '#fab387', '#94e2d5', '#89b4fa'];
const GROUP_ICONS = ['📁', '🏢', '🏠', '🌐', '🖥', '📡', '🔧', '⭐'];

// ============================================
// Device Card — clean, modern, tap to connect
// ============================================

const DeviceCard = ({ device, onPress, onLongPress }: {
  device: Device; onPress: () => void; onLongPress: () => void;
}) => {
  const p = PROTO[device.protocol];
  const isOnline = device.lastConnected && (Date.now() - device.lastConnected) < 86400000;

  return (
    <TouchableOpacity
      style={s.card}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.6}
      delayLongPress={400}
    >
      {/* Status indicator line */}
      <View style={[s.cardAccent, { backgroundColor: p.color }]} />

      <View style={s.cardBody}>
        <View style={s.cardTop}>
          <View style={s.cardInfo}>
            <Text style={s.cardName} numberOfLines={1}>{device.name}</Text>
            <Text style={s.cardHost}>{device.host}:{device.port}</Text>
          </View>
          <View style={s.cardBadge}>
            <Text style={[s.cardProto, { color: p.color }]}>{p.label}</Text>
          </View>
        </View>

        <View style={s.cardBottom}>
          <View style={[s.vendorChip, { borderColor: p.color + '40' }]}>
            <Text style={s.vendorChipText}>{VENDORS[device.vendor]}</Text>
          </View>
          {isOnline && (
            <View style={s.onlineDot} />
          )}
          <Text style={s.cardTime}>
            {device.lastConnected
              ? new Date(device.lastConnected).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
              : '—'
            }
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ============================================
// Long Press Action Sheet
// ============================================

const ActionSheet = ({ device, groups, visible, onClose, onEdit, onDelete, onMove, onConnect }: {
  device: Device | null; groups: DeviceGroup[]; visible: boolean;
  onClose: () => void; onEdit: () => void; onDelete: () => void;
  onMove: (groupId: string | undefined) => void; onConnect: () => void;
}) => {
  if (!device) return null;
  const p = PROTO[device.protocol];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.sheetOverlay} activeOpacity={1} onPress={onClose}>
        <View style={s.sheetContainer}>
          {/* Device info header */}
          <View style={s.sheetHeader}>
            <Text style={s.sheetName}>{device.name}</Text>
            <Text style={s.sheetHost}>{device.host}:{device.port} • {p.label}</Text>
          </View>

          {/* Actions */}
          <TouchableOpacity style={s.sheetAction} onPress={() => { onClose(); onConnect(); }}>
            <Text style={s.sheetActionIcon}>▶️</Text>
            <Text style={[s.sheetActionText, { color: '#a6e3a1' }]}>Connect</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.sheetAction} onPress={() => { onClose(); onEdit(); }}>
            <Text style={s.sheetActionIcon}>✏️</Text>
            <Text style={s.sheetActionText}>Edit Perangkat</Text>
          </TouchableOpacity>

          {/* Move to group */}
          <View style={s.sheetDivider} />
          <Text style={s.sheetSectionTitle}>Pindah ke Group</Text>

          <TouchableOpacity style={s.sheetAction} onPress={() => { onClose(); onMove(undefined); }}>
            <Text style={s.sheetActionIcon}>📋</Text>
            <Text style={[s.sheetActionText, !device.groupId ? { color: '#74c7ec' } : {}]}>
              Tanpa Group {!device.groupId ? '(aktif)' : ''}
            </Text>
          </TouchableOpacity>

          {groups.map(g => (
            <TouchableOpacity key={g.id} style={s.sheetAction} onPress={() => { onClose(); onMove(g.id); }}>
              <Text style={s.sheetActionIcon}>{g.icon}</Text>
              <Text style={[s.sheetActionText, device.groupId === g.id ? { color: '#74c7ec' } : {}]}>
                {g.name} {device.groupId === g.id ? '(aktif)' : ''}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Delete */}
          <View style={s.sheetDivider} />
          <TouchableOpacity style={s.sheetAction} onPress={() => { onClose(); onDelete(); }}>
            <Text style={s.sheetActionIcon}>🗑</Text>
            <Text style={[s.sheetActionText, { color: '#f38ba8' }]}>Hapus Perangkat</Text>
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity style={s.sheetCancel} onPress={onClose}>
            <Text style={s.sheetCancelText}>Batal</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// ============================================
// Add Group Modal
// ============================================

const AddGroupModal = ({ visible, onClose, onSave }: {
  visible: boolean; onClose: () => void; onSave: (name: string, icon: string, color: string) => void;
}) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📁');
  const [color, setColor] = useState('#74c7ec');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim(), icon, color);
    setName('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.sheetOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[s.sheetContainer, { paddingBottom: 20 }]}>
          <Text style={s.sheetName}>Buat Group Baru</Text>

          <TextInput style={[s.formInput, { marginTop: 16 }]} value={name} onChangeText={setName}
            placeholder="Nama group..." placeholderTextColor="#6c7086" autoFocus />

          <Text style={[s.formLabel, { marginTop: 14 }]}>Icon</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {GROUP_ICONS.map(i => (
              <TouchableOpacity key={i} onPress={() => setIcon(i)}
                style={[s.iconPick, icon === i && s.iconPickActive]}>
                <Text style={{ fontSize: 22 }}>{i}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[s.formLabel, { marginTop: 14 }]}>Warna</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {GROUP_COLORS.map(c => (
              <TouchableOpacity key={c} onPress={() => setColor(c)}
                style={[s.colorPick, { backgroundColor: c }, color === c && s.colorPickActive]} />
            ))}
          </View>

          <TouchableOpacity style={[s.saveBtn, { marginTop: 20 }]} onPress={handleSave}>
            <Text style={s.saveBtnText}>Buat Group</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// ============================================
// Device List Screen (main)
// ============================================

export const DeviceListScreen = ({ navigation }: any) => {
  const { devices, groups, removeDevice, updateDevice, addGroup, removeGroup } = useDeviceStore();
  const [search, setSearch] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Device | null>(null);

  const filtered = devices.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) || d.host.includes(search)
  );

  // Group devices into sections
  const sections = useMemo(() => {
    const grouped: { title: string; icon: string; color: string; groupId?: string; data: Device[] }[] = [];

    // Devices with groups
    for (const group of groups) {
      const devs = filtered.filter(d => d.groupId === group.id);
      if (devs.length > 0) {
        grouped.push({ title: group.name, icon: group.icon, color: group.color, groupId: group.id, data: devs });
      }
    }

    // Ungrouped devices
    const ungrouped = filtered.filter(d => !d.groupId || !groups.find(g => g.id === d.groupId));
    if (ungrouped.length > 0) {
      grouped.push({ title: groups.length > 0 ? 'Lainnya' : 'Semua Perangkat', icon: '📋', color: '#6c7086', data: ungrouped });
    }

    return grouped;
  }, [filtered, groups]);

  const handleConnect = useCallback((device: Device) => {
    switch (device.protocol) {
      case 'mikrotik-api':
        navigation.navigate('MikroTik', { deviceId: device.id });
        break;
      case 'http':
      case 'https':
        Linking.openURL(`${device.protocol}://${device.host}:${device.port}`).catch(() => {
          Alert.alert('Error', 'Tidak bisa membuka browser');
        });
        break;
      default:
        navigation.navigate('Terminal', { deviceId: device.id });
    }
  }, [navigation]);

  const handleLongPress = useCallback((device: Device) => {
    setSelectedDevice(device);
    setShowActionSheet(true);
  }, []);

  const handleDelete = useCallback((device: Device) => {
    setDeleteTarget(device);
  }, []);

  const confirmDelete = useCallback(() => {
    if (deleteTarget) {
      removeDevice(deleteTarget.id);
      setDeleteTarget(null);
    }
  }, [deleteTarget, removeDevice]);

  const handleMove = useCallback((groupId: string | undefined) => {
    if (selectedDevice) {
      updateDevice(selectedDevice.id, { groupId });
    }
  }, [selectedDevice, updateDevice]);

  return (
    <View style={s.container}>
      {/* Search + group buttons */}
      <View style={s.topBar}>
        <TextInput style={s.searchInput} placeholder="🔍 Cari perangkat..."
          placeholderTextColor="#6c7086" value={search} onChangeText={setSearch} />

        {/* Group chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingVertical: 8 }}>
          <TouchableOpacity style={s.groupChipAdd} onPress={() => setShowAddGroup(true)}>
            <Text style={s.groupChipAddText}>+ Group</Text>
          </TouchableOpacity>
          {groups.map(g => (
            <TouchableOpacity key={g.id} style={[s.groupChip, { borderColor: g.color + '60' }]}
              onLongPress={() => {
                Alert.alert(g.name, 'Hapus group ini?', [
                  { text: 'Batal', style: 'cancel' },
                  { text: 'Hapus', style: 'destructive', onPress: () => removeGroup(g.id) },
                ]);
              }}>
              <Text style={{ fontSize: 14 }}>{g.icon}</Text>
              <Text style={[s.groupChipText, { color: g.color }]}>{g.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Device count */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
        <Text style={{ color: '#585b70', fontSize: 11 }}>
          {devices.length} perangkat • Tekan lama untuk edit/hapus
        </Text>
      </View>

      {/* Device list grouped by sections */}
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderSectionHeader={({ section }) => (
          <View style={s.sectionHeader}>
            <Text style={{ fontSize: 14 }}>{section.icon}</Text>
            <Text style={[s.sectionTitle, { color: section.color }]}>{section.title}</Text>
            <Text style={s.sectionCount}>{section.data.length}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <DeviceCard
            device={item}
            onPress={() => handleConnect(item)}
            onLongPress={() => handleLongPress(item)}
          />
        )}
        contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
        stickySectionHeadersEnabled={false}
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

      {/* FAB */}
      {devices.length > 0 && (
        <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('AddDevice')} activeOpacity={0.8}>
          <Text style={s.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {/* Action Sheet (long press) */}
      <ActionSheet
        device={selectedDevice}
        groups={groups}
        visible={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        onConnect={() => selectedDevice && handleConnect(selectedDevice)}
        onEdit={() => selectedDevice && navigation.navigate('EditDevice', { deviceId: selectedDevice.id })}
        onDelete={() => selectedDevice && handleDelete(selectedDevice)}
        onMove={handleMove}
      />

      {/* Add Group Modal */}
      <AddGroupModal
        visible={showAddGroup}
        onClose={() => setShowAddGroup(false)}
        onSave={(name, icon, color) => addGroup({ name, icon, color })}
      />

      {/* Delete Confirmation */}
      {deleteTarget && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity style={s.sheetOverlay} activeOpacity={1} onPress={() => setDeleteTarget(null)}>
            <View style={s.deleteModal}>
              <Text style={s.deleteTitle}>🗑 Hapus Perangkat?</Text>
              <Text style={s.deleteMsg}>"{deleteTarget.name}" ({deleteTarget.host})</Text>
              <View style={s.deleteButtons}>
                <TouchableOpacity style={s.deleteCancelBtn} onPress={() => setDeleteTarget(null)}>
                  <Text style={s.deleteCancelText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.deleteConfirmBtn} onPress={confirmDelete}>
                  <Text style={s.deleteConfirmText}>Ya, Hapus</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

// ============================================
// Add/Edit Device Screen
// ============================================

export const AddDeviceScreen = ({ navigation, route }: any) => {
  const { addDevice, updateDevice, devices } = useDeviceStore();
  const editId = route?.params?.deviceId;
  const existing = editId ? devices.find(d => d.id === editId) : null;
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name || '');
  const [host, setHost] = useState(existing?.host || '');
  const [port, setPort] = useState(String(existing?.port || '22'));
  const [protocol, setProtocol] = useState<ConnectionProtocol>(existing?.protocol || 'ssh');
  const [vendor, setVendor] = useState<DeviceVendor>(existing?.vendor || 'generic');

  const protos: { key: ConnectionProtocol; defaultPort: string }[] = [
    { key: 'ssh', defaultPort: '22' }, { key: 'telnet', defaultPort: '23' },
    { key: 'mikrotik-api', defaultPort: '8728' }, { key: 'http', defaultPort: '80' },
    { key: 'https', defaultPort: '443' },
  ];

  const vendorList: DeviceVendor[] = [
    'generic', 'mikrotik', 'fortigate', 'juniper', 'huawei',
    'cisco', 'tplink', 'dlink', 'linksys', 'ubiquiti',
  ];

  const handleSave = () => {
    if (!name.trim() || !host.trim()) { Alert.alert('Error', 'Nama dan host harus diisi'); return; }
    if (isEdit && editId) {
      updateDevice(editId, { name: name.trim(), host: host.trim(), port: parseInt(port, 10) || 22, protocol, vendor });
    } else {
      addDevice({ name: name.trim(), host: host.trim(), port: parseInt(port, 10) || 22, protocol, vendor, deviceType: 'other' });
    }
    navigation.goBack();
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={s.formLabel}>Nama Perangkat</Text>
      <TextInput style={s.formInput} value={name} onChangeText={setName} placeholder="Router Core 1" placeholderTextColor="#6c7086" />
      <Text style={s.formLabel}>Host / IP</Text>
      <TextInput style={s.formInput} value={host} onChangeText={setHost} placeholder="192.168.1.1" placeholderTextColor="#6c7086" autoCapitalize="none" keyboardType="url" />
      <Text style={s.formLabel}>Port</Text>
      <TextInput style={s.formInput} value={port} onChangeText={setPort} placeholder="22" placeholderTextColor="#6c7086" keyboardType="numeric" />
      <Text style={s.formLabel}>Protocol</Text>
      <View style={s.protoRow}>
        {protos.map(p => {
          const info = PROTO[p.key]; const active = protocol === p.key;
          return (
            <TouchableOpacity key={p.key} style={[s.protoBtn, active && s.protoBtnActive]}
              onPress={() => { setProtocol(p.key); if (!isEdit) setPort(p.defaultPort); }}>
              <Text style={[s.protoBtnText, active && s.protoBtnTextActive]}>{info.icon} {info.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={s.formLabel}>Vendor</Text>
      <View style={s.protoRow}>
        {vendorList.map(v => (
          <TouchableOpacity key={v} style={[s.protoBtn, vendor === v && s.vendorBtnActive]} onPress={() => setVendor(v)}>
            <Text style={[s.protoBtnText, vendor === v && s.vendorBtnTextActive]}>{VENDORS[v]}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={[s.saveBtn, { marginTop: 30 }]} onPress={handleSave}>
        <Text style={s.saveBtnText}>{isEdit ? '💾 Update' : '💾 Simpan'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// ============================================
// Styles
// ============================================

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e2e' },

  // Top bar
  topBar: { paddingHorizontal: 12, paddingTop: 8, backgroundColor: '#181825', borderBottomWidth: 1, borderBottomColor: '#31324440' },
  searchInput: { backgroundColor: '#313244', borderRadius: 12, padding: 11, paddingHorizontal: 16, color: '#cdd6f4', fontSize: 15, borderWidth: 1, borderColor: '#45475a' },

  // Group chips
  groupChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#313244', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#45475a' },
  groupChipText: { fontSize: 12, fontWeight: '500' },
  groupChipAdd: { backgroundColor: '#45475a', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  groupChipAddText: { color: '#a6adc8', fontSize: 12, fontWeight: '600' },

  // Section headers
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 4, marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', flex: 1 },
  sectionCount: { color: '#585b70', fontSize: 11, backgroundColor: '#313244', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },

  // Card — modern design
  card: { flexDirection: 'row', backgroundColor: '#313244', borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: '#3b3d54', overflow: 'hidden' },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardInfo: { flex: 1, marginRight: 8 },
  cardName: { color: '#cdd6f4', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  cardHost: { color: '#a6adc8', fontSize: 12, fontFamily: 'monospace' },
  cardBadge: { backgroundColor: '#1e1e2e', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  cardProto: { fontSize: 11, fontWeight: '700' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vendorChip: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 1, borderRadius: 6 },
  vendorChipText: { color: '#6c7086', fontSize: 10, fontWeight: '500' },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#a6e3a1' },
  cardTime: { color: '#585b70', fontSize: 10, marginLeft: 'auto' },

  // Action sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheetContainer: { backgroundColor: '#313244', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 34, maxHeight: '80%' },
  sheetHeader: { alignItems: 'center', marginBottom: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#45475a' },
  sheetName: { color: '#cdd6f4', fontSize: 17, fontWeight: '700' },
  sheetHost: { color: '#6c7086', fontSize: 12, fontFamily: 'monospace', marginTop: 3 },
  sheetAction: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 4 },
  sheetActionIcon: { fontSize: 18, width: 28, textAlign: 'center' },
  sheetActionText: { color: '#cdd6f4', fontSize: 15 },
  sheetDivider: { height: 1, backgroundColor: '#45475a', marginVertical: 6 },
  sheetSectionTitle: { color: '#6c7086', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, marginTop: 4 },
  sheetCancel: { marginTop: 12, padding: 14, backgroundColor: '#45475a', borderRadius: 12, alignItems: 'center' },
  sheetCancelText: { color: '#a6adc8', fontSize: 15, fontWeight: '600' },

  // Delete modal
  deleteModal: { backgroundColor: '#313244', borderRadius: 16, padding: 24, width: '85%', maxWidth: 340, alignSelf: 'center', borderWidth: 1, borderColor: '#45475a' },
  deleteTitle: { color: '#f38ba8', fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  deleteMsg: { color: '#a6adc8', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  deleteButtons: { flexDirection: 'row', gap: 10 },
  deleteCancelBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#45475a', alignItems: 'center' },
  deleteCancelText: { color: '#cdd6f4', fontSize: 14, fontWeight: '600' },
  deleteConfirmBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#f38ba8', alignItems: 'center' },
  deleteConfirmText: { color: '#1e1e2e', fontSize: 14, fontWeight: '700' },

  // Add group modal extras
  iconPick: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#45475a', alignItems: 'center', justifyContent: 'center' },
  iconPickActive: { backgroundColor: '#74c7ec30', borderWidth: 2, borderColor: '#74c7ec' },
  colorPick: { width: 32, height: 32, borderRadius: 16 },
  colorPickActive: { borderWidth: 3, borderColor: '#fff' },

  // Empty & FAB
  empty: { alignItems: 'center', paddingTop: 100, paddingHorizontal: 40 },
  emptyTitle: { color: '#cdd6f4', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { color: '#6c7086', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  addBtn: { backgroundColor: '#74c7ec', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  addBtnText: { color: '#1e1e2e', fontSize: 16, fontWeight: '700' },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#74c7ec', alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4 },
  fabText: { color: '#1e1e2e', fontSize: 28, fontWeight: '600', lineHeight: 30 },

  // Form
  formLabel: { color: '#a6adc8', fontSize: 12, fontWeight: '600', marginBottom: 5, marginTop: 14 },
  formInput: { backgroundColor: '#313244', borderRadius: 10, padding: 12, paddingHorizontal: 16, color: '#cdd6f4', fontSize: 15, borderWidth: 1, borderColor: '#45475a' },
  protoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  protoBtn: { backgroundColor: '#313244', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#45475a' },
  protoBtnActive: { backgroundColor: '#74c7ec20', borderColor: '#74c7ec' },
  protoBtnText: { color: '#6c7086', fontSize: 12, fontWeight: '500' },
  protoBtnTextActive: { color: '#74c7ec' },
  vendorBtnActive: { backgroundColor: '#a6e3a120', borderColor: '#a6e3a1' },
  vendorBtnTextActive: { color: '#a6e3a1' },
  saveBtn: { backgroundColor: '#a6e3a1', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#1e1e2e', fontSize: 16, fontWeight: '700' },
});
