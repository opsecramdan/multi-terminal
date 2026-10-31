// Terminal Screen — SSH/Telnet terminal emulator with simulated output
// Uses basic RN TextInput for now (xterm.js WebView version requires dev build)

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useDeviceStore } from '../stores';

// ============================================
// SSH/Telnet Terminal Screen (simulated for Expo Go)
// ============================================

export const TerminalScreen = ({ route, navigation }: any) => {
  const { deviceId } = route.params;
  const device = useDeviceStore(s => s.devices.find(d => d.id === deviceId));
  const [lines, setLines] = useState<{ text: string; color?: string }[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!device) return;
    // Simulate connection
    const timer = setTimeout(() => {
      setConnected(true);
      setLines([
        { text: `✓ Connected to ${device.host}:${device.port}`, color: '#a6e3a1' },
        { text: `Protocol: ${device.protocol.toUpperCase()}`, color: '#74c7ec' },
        { text: `Last login: ${new Date().toLocaleString('id-ID')}`, color: '#6c7086' },
        { text: '' },
      ]);
    }, 800);
    return () => clearTimeout(timer);
  }, [device]);

  // Simulated command responses
  const simulateCommand = useCallback((cmd: string) => {
    const responses: Record<string, string[]> = {
      'ip addr': [
        '1: lo: <LOOPBACK,UP> mtu 65536',
        '    inet 127.0.0.1/8 scope host lo',
        `2: ether1: <BROADCAST,MULTICAST,UP> mtu 1500`,
        `    inet ${device?.host || '0.0.0.0'}/24 scope global`,
      ],
      'uptime': [`${new Date().toLocaleString('id-ID')}  up 42 days, 7:23, 1 user, load average: 0.12, 0.08, 0.05`],
      'uname -a': ['Linux router-core 5.15.0 #1 SMP aarch64 GNU/Linux'],
      'df -h': [
        'Filesystem      Size  Used Avail Use% Mounted on',
        '/dev/sda1        32G  8.2G   22G  28% /',
        'tmpfs           256M     0  256M   0% /tmp',
      ],
      'free -h': [
        '              total   used   free  shared  buff/cache  available',
        'Mem:          256Mi   78Mi  112Mi    12Mi       66Mi      164Mi',
      ],
      'ifconfig': [
        `ether1: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500`,
        `        inet ${device?.host || '0.0.0.0'}  netmask 255.255.255.0`,
        `        ether e4:8d:8c:ab:12:34  txqueuelen 1000`,
        `        RX packets 1234567  bytes 987654321 (987.6 MB)`,
        `        TX packets 7654321  bytes 123456789 (123.4 MB)`,
      ],
      'ls': ['bin  boot  dev  etc  home  lib  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var'],
      'whoami': ['admin'],
      'hostname': [device?.name || 'router-core'],
      'help': [
        'Perintah yang tersedia (simulasi):',
        '  ip addr    - Tampilkan IP address',
        '  ifconfig   - Konfigurasi interface',
        '  uptime     - Waktu aktif sistem',
        '  uname -a   - Info kernel',
        '  df -h      - Disk usage',
        '  free -h    - Memory usage',
        '  hostname   - Nama host',
        '  whoami     - User aktif',
        '  ls         - Daftar file',
        '  clear      - Bersihkan terminal',
        '  exit       - Keluar',
      ],
    };

    if (cmd === 'clear') {
      setLines([]);
      return;
    }
    if (cmd === 'exit') {
      navigation.goBack();
      return;
    }

    const prompt = `admin@${device?.name || 'device'}:~$ `;
    const output = responses[cmd.trim().toLowerCase()] || [`-bash: ${cmd}: command not found`];

    setLines(prev => [
      ...prev,
      { text: prompt + cmd, color: '#a6e3a1' },
      ...output.map(text => ({ text, color: '#cdd6f4' })),
      { text: '' },
    ]);
  }, [device, navigation]);

  const handleSubmit = useCallback(() => {
    if (!input.trim()) return;
    simulateCommand(input.trim());
    setInput('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [input, simulateCommand]);

  if (!device) {
    return (
      <View style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: '#f38ba8', fontSize: 16 }}>Perangkat tidak ditemukan</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Status Bar */}
      <View style={s.statusBar}>
        <View style={s.statusLeft}>
          <View style={[s.dot, { backgroundColor: connected ? '#a6e3a1' : '#f9e2af' }]} />
          <Text style={s.statusText}>{device.host}:{device.port} ({device.protocol.toUpperCase()})</Text>
        </View>
        <TouchableOpacity onPress={() => Alert.alert('Disconnect', 'Tutup sesi?', [
          { text: 'Batal', style: 'cancel' },
          { text: 'Disconnect', style: 'destructive', onPress: () => navigation.goBack() },
        ])}>
          <Text style={s.disconnectBtn}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Terminal Output */}
      <ScrollView ref={scrollRef} style={s.termBody} contentContainerStyle={{ paddingBottom: 20 }}>
        {!connected && (
          <Text style={{ color: '#f9e2af', fontFamily: 'monospace', fontSize: 13 }}>
            Menghubungkan ke {device.host}...
          </Text>
        )}
        {lines.map((line, i) => (
          <Text key={i} style={{ color: line.color || '#cdd6f4', fontFamily: 'monospace', fontSize: 13, lineHeight: 20 }}>
            {line.text}
          </Text>
        ))}
      </ScrollView>

      {/* Extra Keys Row */}
      <View style={s.extraKeys}>
        {['ESC', 'TAB', 'CTRL', '↑', '↓', '←', '→', '/', '-'].map(key => (
          <TouchableOpacity key={key} style={s.extraKey} onPress={() => {
            if (key === '↑' || key === '↓') return; // history navigation TODO
            setInput(prev => prev + (key === 'TAB' ? '\t' : key === '/' ? '/' : key === '-' ? '-' : ''));
          }}>
            <Text style={s.extraKeyText}>{key}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Command Input */}
      <View style={s.cmdBar}>
        <Text style={s.prompt}>$</Text>
        <TextInput
          style={s.cmdInput}
          value={input}
          onChangeText={setInput}
          placeholder="Ketik perintah... (coba: help)"
          placeholderTextColor="#585b70"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
        />
        <TouchableOpacity onPress={handleSubmit}>
          <Text style={{ color: '#74c7ec', fontSize: 16, fontWeight: '700', paddingHorizontal: 8 }}>⏎</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

// ============================================
// Web Terminal Screen (WebView for HTTP devices)
// ============================================

export const WebTerminalScreen = ({ route, navigation }: any) => {
  const { deviceId, url } = route.params;
  const device = useDeviceStore(s => s.devices.find(d => d.id === deviceId));
  const [currentUrl, setCurrentUrl] = useState(url);
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<any>(null);

  // Web platform doesn't support WebView — fallback to browser
  if (Platform.OS === 'web') {
    return (
      <View style={s.container}>
        <View style={s.statusBar}>
          <View style={s.statusLeft}>
            <View style={[s.dot, { backgroundColor: '#f9e2af' }]} />
            <Text style={s.statusText}>{device?.name || url}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.disconnectBtn}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
          <Text style={{ fontSize: 50, marginBottom: 16 }}>🌐</Text>
          <Text style={{ color: '#cdd6f4', fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Web Interface</Text>
          <Text style={{ color: '#a6adc8', fontSize: 12, fontFamily: 'monospace', marginBottom: 20 }}>{url}</Text>
          <TouchableOpacity
            style={{ backgroundColor: '#74c7ec', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 }}
            onPress={() => Linking.openURL(url)}>
            <Text style={{ color: '#1e1e2e', fontSize: 16, fontWeight: '700' }}>🌐 Buka di Browser</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Native (Android/iOS) — use real WebView
  return (
    <View style={s.container}>
      {/* URL Bar */}
      <View style={s.urlBar}>
        <TouchableOpacity onPress={() => webViewRef.current?.goBack()} style={s.urlBtn}>
          <Text style={s.urlBtnText}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => webViewRef.current?.goForward()} style={s.urlBtn}>
          <Text style={s.urlBtnText}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => webViewRef.current?.reload()} style={s.urlBtn}>
          <Text style={s.urlBtnText}>↻</Text>
        </TouchableOpacity>
        <View style={s.urlDisplay}>
          <Text style={s.urlText} numberOfLines={1}>{currentUrl}</Text>
        </View>
        <TouchableOpacity onPress={() => Linking.openURL(currentUrl)} style={s.urlBtn}>
          <Text style={s.urlBtnText}>↗</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.urlBtn}>
          <Text style={[s.urlBtnText, { color: '#f38ba8' }]}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={{ flex: 1, backgroundColor: '#1e1e2e' }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={(state: any) => setCurrentUrl(state.url)}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        mixedContentMode="always"
        allowsBackForwardNavigationGestures
        onSslError={(event: any) => event.preventDefault()}
      />

      {loading && (
        <View style={{ position: 'absolute', top: 100, left: 0, right: 0, alignItems: 'center' }}>
          <Text style={{ color: '#74c7ec', fontSize: 13 }}>Loading {device?.name || ''}...</Text>
        </View>
      )}
    </View>
  );
};

// ============================================
// Styles
// ============================================

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e2e' },
  statusBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#313244', paddingHorizontal: 12, paddingVertical: 8, paddingTop: 52, borderBottomWidth: 1, borderBottomColor: '#45475a' },
  statusLeft: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 8 },
  statusText: { color: '#a6adc8', fontSize: 12, fontFamily: 'monospace' },
  disconnectBtn: { color: '#f38ba8', fontSize: 18, fontWeight: '700', paddingHorizontal: 8 },
  termBody: { flex: 1, padding: 10, backgroundColor: '#1e1e2e' },
  extraKeys: { flexDirection: 'row', backgroundColor: '#313244', padding: 4, gap: 3 },
  extraKey: { flex: 1, padding: 7, backgroundColor: '#45475a', borderRadius: 4, alignItems: 'center', borderWidth: 1, borderColor: '#585b70' },
  extraKeyText: { color: '#cdd6f4', fontSize: 11, fontFamily: 'monospace' },
  cmdBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#313244', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#45475a' },
  prompt: { color: '#a6e3a1', fontSize: 14, fontFamily: 'monospace', marginRight: 8, fontWeight: '700' },
  cmdInput: { flex: 1, color: '#cdd6f4', fontSize: 13, fontFamily: 'monospace', padding: 0 },
  urlBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#313244', paddingHorizontal: 8, paddingVertical: 6, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#45475a', gap: 4 },
  urlBtn: { padding: 6 },
  urlBtnText: { color: '#74c7ec', fontSize: 18, fontWeight: '600' },
  urlDisplay: { flex: 1, backgroundColor: '#1e1e2e', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  urlText: { color: '#a6adc8', fontSize: 11, fontFamily: 'monospace' },
});
