// MikroTik Screen — RouterOS API terminal with quick action buttons
// Simulated responses for Expo Go testing

import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useDeviceStore } from '../stores';

// Simulated MikroTik responses
const MT_RESPONSES: Record<string, { header: string; rows: string[][] }> = {
  '/interface/print': {
    header: '#   NAME            TYPE    MTU   STATUS',
    rows: [
      ['0', 'ether1-wan', 'ether', '1500', 'R'],
      ['1', 'ether2-lan', 'ether', '1500', 'R'],
      ['2', 'ether3-mgmt', 'ether', '1500', 'R'],
      ['3', 'wlan1', 'wlan', '1500', 'R'],
      ['4', 'bridge-lan', 'bridge', '1500', 'R'],
      ['5', 'pppoe-out1', 'pppoe', '1480', 'R'],
    ],
  },
  '/ip/address/print': {
    header: '#   ADDRESS          NETWORK        INTERFACE',
    rows: [
      ['0', '192.168.88.1/24', '192.168.88.0', 'bridge-lan'],
      ['1', '10.0.0.1/30', '10.0.0.0', 'pppoe-out1'],
      ['2', '172.16.1.1/24', '172.16.1.0', 'ether3-mgmt'],
    ],
  },
  '/ip/route/print': {
    header: 'DST-ADDRESS       GATEWAY        DISTANCE',
    rows: [
      ['', '0.0.0.0/0', 'pppoe-out1', '1'],
      ['', '192.168.88.0/24', 'bridge-lan', '0'],
      ['', '10.0.0.0/30', 'pppoe-out1', '0'],
    ],
  },
  '/ip/dhcp-server/lease/print': {
    header: 'ADDRESS          MAC               HOST          STATUS',
    rows: [
      ['', '192.168.88.10', '70:4C:A5:11:22:33', 'FortiGate', 'bound'],
      ['', '192.168.88.50', '14:CC:20:DE:F0:01', 'AP-Lobby', 'bound'],
      ['', '192.168.88.100', 'FC:EC:DA:99:88:77', 'UAP-AC-Pro', 'bound'],
      ['', '192.168.88.150', 'AA:BB:CC:DD:EE:FF', 'Laptop-Admin', 'waiting'],
    ],
  },
  '/ip/firewall/filter/print': {
    header: '#   CHAIN      ACTION   PROTO  SRC             DST-PORT',
    rows: [
      ['0', 'input', 'accept', 'icmp', '', ''],
      ['1', 'input', 'accept', 'tcp', '', '22,8291'],
      ['2', 'input', 'drop', '', '', ''],
      ['3', 'forward', 'accept', '', '192.168.88.0/24', ''],
      ['4', 'forward', 'drop', '', '', ''],
    ],
  },
  '/ip/arp/print': {
    header: 'ADDRESS          MAC               INTERFACE',
    rows: [
      ['', '192.168.88.1', 'E4:8D:8C:AB:12:34', 'bridge-lan'],
      ['', '192.168.88.10', '70:4C:A5:11:22:33', 'bridge-lan'],
      ['', '192.168.88.50', '14:CC:20:DE:F0:01', 'bridge-lan'],
      ['', '192.168.88.100', 'FC:EC:DA:99:88:77', 'bridge-lan'],
    ],
  },
  '/system/resource/print': {
    header: '',
    rows: [
      ['', 'board-name: hAP ac³'],
      ['', 'version: 7.16 (stable)'],
      ['', 'cpu: ARM 88F6820 (4 cores)'],
      ['', 'cpu-load: 12%'],
      ['', 'memory: 256 MB (used: 78 MB)'],
      ['', 'hdd: 128 MB (used: 32 MB)'],
      ['', 'uptime: 42d 7h 23m 15s'],
      ['', 'architecture: arm'],
    ],
  },
};

const QUICK_BUTTONS = [
  { label: 'Interfaces', cmd: '/interface/print' },
  { label: 'IP Addr', cmd: '/ip/address/print' },
  { label: 'Routes', cmd: '/ip/route/print' },
  { label: 'DHCP', cmd: '/ip/dhcp-server/lease/print' },
  { label: 'Firewall', cmd: '/ip/firewall/filter/print' },
  { label: 'ARP', cmd: '/ip/arp/print' },
  { label: 'System', cmd: '/system/resource/print' },
];

export const MikroTikScreen = ({ route, navigation }: any) => {
  const { deviceId } = route.params;
  const device = useDeviceStore(s => s.devices.find(d => d.id === deviceId));
  const [output, setOutput] = useState<{ text: string; color?: string }[]>([
    { text: '✓ Connected via RouterOS API (port 8728)', color: '#a6e3a1' },
    { text: 'RouterOS v7.16 — hAP ac³', color: '#74c7ec' },
    { text: '' },
  ]);
  const [command, setCommand] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const executeCommand = useCallback((cmd: string) => {
    const resp = MT_RESPONSES[cmd];
    const newLines: { text: string; color?: string }[] = [
      { text: `> ${cmd}`, color: '#a6e3a1' },
    ];

    if (resp) {
      if (resp.header) {
        newLines.push({ text: resp.header, color: '#89b4fa' });
      }
      resp.rows.forEach(row => {
        const isAction = row.includes('accept') || row.includes('bound');
        const isDrop = row.includes('drop') || row.includes('waiting');
        newLines.push({
          text: ' ' + row.filter(Boolean).join('  '),
          color: isAction ? '#a6e3a1' : isDrop ? '#f38ba8' : '#cdd6f4',
        });
      });
    } else {
      newLines.push({ text: `bad command name ${cmd} (line 1 column 1)`, color: '#f38ba8' });
    }

    newLines.push({ text: '' });
    setOutput(prev => [...prev, ...newLines]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!command.trim()) return;
    executeCommand(command.trim());
    setCommand('');
  }, [command, executeCommand]);

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Status */}
      <View style={s.statusBar}>
        <View style={s.statusLeft}>
          <View style={[s.dot, { backgroundColor: '#a6e3a1' }]} />
          <Text style={s.statusText}>{device?.name || 'MikroTik'} — RouterOS API</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.disconnectBtn}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={s.quickActions}>
        {QUICK_BUTTONS.map(btn => (
          <TouchableOpacity key={btn.cmd} style={s.quickBtn} onPress={() => executeCommand(btn.cmd)}>
            <Text style={s.quickBtnText}>{btn.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Output */}
      <ScrollView ref={scrollRef} style={s.outputArea} contentContainerStyle={{ paddingBottom: 20 }}>
        {output.map((line, i) => (
          <Text key={i} style={{ color: line.color || '#cdd6f4', fontFamily: 'monospace', fontSize: 12, lineHeight: 18 }}>
            {line.text}
          </Text>
        ))}
      </ScrollView>

      {/* Command Input */}
      <View style={s.cmdBar}>
        <Text style={s.prompt}>[admin@{device?.name || 'MikroTik'}] &gt;</Text>
        <TextInput
          style={s.cmdInput}
          value={command}
          onChangeText={setCommand}
          placeholder="/interface/print"
          placeholderTextColor="#585b70"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e2e' },
  statusBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#313244', paddingHorizontal: 12, paddingVertical: 8, paddingTop: 52, borderBottomWidth: 1, borderBottomColor: '#45475a' },
  statusLeft: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 8 },
  statusText: { color: '#a6adc8', fontSize: 12, fontFamily: 'monospace' },
  disconnectBtn: { color: '#f38ba8', fontSize: 18, fontWeight: '700', paddingHorizontal: 8 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 5, backgroundColor: '#181825', borderBottomWidth: 1, borderBottomColor: '#313244' },
  quickBtn: { backgroundColor: '#313244', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 5, borderWidth: 1, borderColor: '#45475a' },
  quickBtnText: { color: '#89b4fa', fontSize: 11, fontWeight: '500' },
  outputArea: { flex: 1, padding: 10 },
  cmdBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#313244', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#45475a', paddingBottom: 30 },
  prompt: { color: '#a6e3a1', fontSize: 11, fontFamily: 'monospace', marginRight: 6 },
  cmdInput: { flex: 1, color: '#cdd6f4', fontSize: 12, fontFamily: 'monospace', padding: 0 },
});
