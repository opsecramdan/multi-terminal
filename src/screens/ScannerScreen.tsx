// Scanner Screen — REAL network scanner via HTTP probing
// Scans actual devices on the network using fetch() with timeout

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Alert, Platform,
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

interface DiscoveredDevice {
  ip: string;
  openPorts: number[];
  vendor: string;
  type: string;
  responseTime: number;
}

// ============================================
// Real Network Scanner — HTTP probe
// ============================================

// Ports to probe via HTTP fetch
const SCAN_PORTS = [80, 443, 8080, 8443, 8291, 8728, 3000, 9090];

/**
 * Probe a single IP:port using fetch with timeout.
 * Returns true if ANYTHING responds (even errors like CORS, 401, 403).
 * Returns false only on connection timeout (host unreachable).
 */
async function probePort(ip: string, port: number, timeoutMs: number = 2000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const scheme = port === 443 || port === 8443 ? 'https' : 'http';

  try {
    await fetch(`${scheme}://${ip}:${port}/`, {
      method: 'HEAD',
      signal: controller.signal,
      // @ts-ignore — React Native specific
      reactNative: { textStreaming: true },
    });
    clearTimeout(timer);
    return true; // Got a response — host is alive
  } catch (err: any) {
    clearTimeout(timer);
    // AbortError = timeout = host unreachable
    if (err.name === 'AbortError') return false;
    // Any other error (CORS, network error, SSL error) = host IS alive, just refused/blocked
    // TypeError "Network request failed" on RN usually means connection refused = port closed
    // But "Network request failed" can also mean CORS on web
    if (Platform.OS === 'web') {
      // On web, CORS errors mean the host responded — it's alive
      return true;
    }
    // On native (Android/iOS), "Network request failed" = connection refused = port closed
    // But if we get here, something responded
    const msg = String(err.message || err);
    if (msg.includes('Network request failed')) return false;
    return true; // Any other error = something is there
  }
}

/**
 * Scan a single IP across multiple ports.
 */
async function scanHost(ip: string, ports: number[], timeout: number): Promise<DiscoveredDevice | null> {
  const start = Date.now();

  // Probe all ports in parallel
  const results = await Promise.all(
    ports.map(async (port) => {
      const alive = await probePort(ip, port, timeout);
      return { port, alive };
    })
  );

  const openPorts = results.filter(r => r.alive).map(r => r.port);

  if (openPorts.length === 0) return null;

  const responseTime = Date.now() - start;

  // Fingerprint based on open ports
  const { vendor, type } = fingerprintDevice(openPorts);

  return { ip, openPorts, vendor, type, responseTime };
}

/**
 * Simple fingerprinting based on which ports are open.
 */
function fingerprintDevice(ports: number[]): { vendor: string; type: string } {
  const p = new Set(ports);

  // MikroTik: Winbox (8291) or RouterOS API (8728)
  if (p.has(8291) || p.has(8728)) return { vendor: 'mikrotik', type: 'router' };

  // If only web ports, likely AP or basic device
  if (p.has(80) && !p.has(443) && ports.length <= 2) return { vendor: 'unknown', type: 'access-point' };

  // HTTPS management (could be firewall, managed switch, etc)
  if (p.has(443) && !p.has(80)) return { vendor: 'unknown', type: 'firewall' };

  // Web server with extra ports
  if (p.has(3000) || p.has(9090) || p.has(8080)) return { vendor: 'generic', type: 'server' };

  // Generic with HTTP
  if (p.has(80) || p.has(443)) return { vendor: 'unknown', type: 'other' };

  return { vendor: 'unknown', type: 'other' };
}

/**
 * Parse CIDR to get list of IPs to scan.
 */
function cidrToIPs(cidr: string): string[] {
  const [network, maskStr] = cidr.split('/');
  const mask = parseInt(maskStr, 10);
  const parts = network.split('.').map(Number);
  const networkInt = (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
  const hostBits = 32 - mask;
  const numHosts = Math.pow(2, hostBits) - 2;
  const ips: string[] = [];

  for (let i = 1; i <= Math.min(numHosts, 254); i++) {
    const ip = (networkInt >>> 0) + i;
    ips.push(
      `${(ip >>> 24) & 0xff}.${(ip >>> 16) & 0xff}.${(ip >>> 8) & 0xff}.${ip & 0xff}`
    );
  }
  return ips;
}

// ============================================
// Scanner Screen Component
// ============================================

export const ScannerScreen = ({ navigation }: any) => {
  const [subnet, setSubnet] = useState('192.168.1.0/24');
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scanned, setScanned] = useState(0);
  const [totalHosts, setTotalHosts] = useState(0);
  const [results, setResults] = useState<DiscoveredDevice[]>([]);
  const [addedIPs, setAddedIPs] = useState<Set<string>>(new Set());
  const { addDevice, devices } = useDeviceStore();
  const abortRef = useRef(false);

  const stopScan = useCallback(() => {
    abortRef.current = true;
    setScanning(false);
  }, []);

  const startScan = useCallback(async () => {
    if (scanning) {
      stopScan();
      return;
    }

    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    if (!cidrRegex.test(subnet)) {
      Alert.alert('Error', 'Format subnet tidak valid.\nContoh: 192.168.1.0/24');
      return;
    }

    const mask = parseInt(subnet.split('/')[1], 10);
    if (mask < 20 || mask > 30) {
      Alert.alert('Error', 'Gunakan mask /20 sampai /30.\n/24 = 254 host (paling umum)');
      return;
    }

    const ips = cidrToIPs(subnet);
    setTotalHosts(ips.length);
    setScanning(true);
    setResults([]);
    setScanned(0);
    setProgress(0);
    abortRef.current = false;

    // Scan in batches for performance (10 IPs concurrent)
    const BATCH_SIZE = 10;
    const TIMEOUT = 2500; // ms per probe
    let completed = 0;

    for (let i = 0; i < ips.length; i += BATCH_SIZE) {
      if (abortRef.current) break;

      const batch = ips.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(ip => scanHost(ip, SCAN_PORTS, TIMEOUT))
      );

      if (abortRef.current) break;

      // Add found devices
      for (const result of batchResults) {
        if (result) {
          setResults(prev => [...prev, result]);
        }
      }

      completed += batch.length;
      setScanned(completed);
      setProgress(Math.round(completed / ips.length * 100));
    }

    setScanning(false);
    setScanned(ips.length);
    setProgress(100);
  }, [subnet, scanning, stopScan]);

  const handleAdd = useCallback((dev: DiscoveredDevice) => {
    let protocol: any = 'http';
    let port = 80;

    if (dev.openPorts.includes(8728)) { protocol = 'mikrotik-api'; port = 8728; }
    else if (dev.openPorts.includes(443)) { protocol = 'https'; port = 443; }
    else if (dev.openPorts.includes(80)) { protocol = 'http'; port = 80; }
    else if (dev.openPorts.includes(8080)) { protocol = 'http'; port = 8080; }
    else { port = dev.openPorts[0]; }

    addDevice({
      name: `${VENDOR_LABELS[dev.vendor]} - ${dev.ip}`,
      host: dev.ip,
      port,
      protocol,
      vendor: dev.vendor as DeviceVendor,
      deviceType: dev.type as any,
    });
    setAddedIPs(prev => new Set(prev).add(dev.ip));
  }, [addDevice]);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>🔍 Network Scanner</Text>
        <Text style={s.subtitle}>Scan perangkat yang benar-benar ada di jaringan</Text>
        <View style={s.inputRow}>
          <TextInput style={s.subnetInput} value={subnet} onChangeText={setSubnet}
            placeholder="192.168.1.0/24" placeholderTextColor="#6c7086"
            autoCapitalize="none" keyboardType="url" editable={!scanning} />
          <TouchableOpacity
            style={[s.scanBtn, scanning && { backgroundColor: '#f38ba8' }]}
            onPress={scanning ? stopScan : startScan}
          >
            <Text style={s.scanBtnText}>{scanning ? '■ Stop' : '▶ Scan'}</Text>
          </TouchableOpacity>
        </View>
        <View style={s.shortcuts}>
          {['192.168.1.0/24', '192.168.0.0/24', '192.168.10.0/24', '10.0.0.0/24'].map(sn => (
            <TouchableOpacity key={sn}
              style={[s.shortcut, subnet === sn && s.shortcutActive]}
              onPress={() => setSubnet(sn)}>
              <Text style={[s.shortcutText, subnet === sn && s.shortcutTextActive]}>{sn}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Scan info */}
        <View style={s.infoBox}>
          <Text style={s.infoText}>
            ℹ️ Scan menggunakan HTTP probe ke port {SCAN_PORTS.join(', ')}. Hanya mendeteksi perangkat yang membuka port HTTP/HTTPS.
          </Text>
        </View>
      </View>

      {/* Progress */}
      {(scanning || scanned > 0) && (
        <View style={s.progressWrap}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={s.progressText}>
            {scanned}/{totalHosts} host • {results.length} ditemukan • {
              !scanning && scanned >= totalHosts ? 'Selesai ✓' :
              scanning ? `${progress}% — scanning...` : `${progress}%`
            }
          </Text>
        </View>
      )}

      {/* Results */}
      <FlatList
        data={results}
        keyExtractor={(item, index) => `${item.ip}-${index}`}
        renderItem={({ item }) => {
          const vc = VENDOR_COLORS[item.vendor] || '#585b70';
          const alreadyExists = devices.some(d => d.host === item.ip);
          const justAdded = addedIPs.has(item.ip);
          const isAdded = alreadyExists || justAdded;
          return (
            <View style={s.resultCard}>
              <View style={[s.vendorDot, { backgroundColor: vc }]} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.resultIP}>{item.ip}</Text>
                <Text style={s.resultLatency}>{item.responseTime}ms</Text>
                <View style={{ flexDirection: 'row', gap: 5, marginVertical: 3 }}>
                  <View style={[s.tag, { backgroundColor: vc + '20' }]}>
                    <Text style={[s.tagText, { color: vc }]}>
                      {VENDOR_LABELS[item.vendor] || item.vendor}
                    </Text>
                  </View>
                  <View style={[s.tag, { backgroundColor: '#45475a' }]}>
                    <Text style={s.tagText}>{item.type}</Text>
                  </View>
                </View>
                <Text style={s.resultPorts}>
                  Open ports: {item.openPorts.join(', ')}
                </Text>
              </View>
              {isAdded ? (
                <View style={s.addedBadge}>
                  <Text style={s.addedBadgeText}>✓ {justAdded ? 'Ditambahkan' : 'Sudah ada'}</Text>
                </View>
              ) : (
                <TouchableOpacity style={s.addBtn} onPress={() => handleAdd(item)}>
                  <Text style={s.addBtnText}>+ Tambah</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 }}>
            <Text style={{ fontSize: 50, marginBottom: 16 }}>
              {scanning ? '📡' : scanned > 0 ? '🔇' : '📡'}
            </Text>
            <Text style={{ color: '#6c7086', fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
              {scanning
                ? 'Sedang memindai jaringan...\nMenunggu respons dari perangkat'
                : scanned > 0
                  ? 'Tidak ada perangkat ditemukan di subnet ini.\nPastikan HP terhubung ke jaringan yang sama.'
                  : 'Masukkan subnet jaringan lokal dan tekan Scan.\nContoh: 192.168.1.0/24'
              }
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
  infoBox: { marginTop: 10, backgroundColor: '#313244', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#45475a' },
  infoText: { color: '#6c7086', fontSize: 10, lineHeight: 15 },
  progressWrap: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#181825' },
  progressTrack: { height: 4, backgroundColor: '#313244', borderRadius: 2, overflow: 'hidden', marginBottom: 5 },
  progressFill: { height: '100%', backgroundColor: '#74c7ec', borderRadius: 2 },
  progressText: { color: '#6c7086', fontSize: 11 },
  resultCard: { flexDirection: 'row', backgroundColor: '#313244', borderRadius: 12, padding: 12, marginBottom: 7, borderWidth: 1, borderColor: '#45475a', alignItems: 'center' },
  vendorDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  resultIP: { color: '#cdd6f4', fontSize: 15, fontWeight: '600', fontFamily: 'monospace' },
  resultLatency: { color: '#a6e3a1', fontSize: 10, fontFamily: 'monospace' },
  resultPorts: { color: '#a6adc8', fontSize: 10, fontFamily: 'monospace', marginTop: 2 },
  tag: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 5 },
  tagText: { color: '#bac2de', fontSize: 10, fontWeight: '500' },
  addBtn: { backgroundColor: 'rgba(116,199,236,0.12)', borderWidth: 1, borderColor: 'rgba(116,199,236,0.3)', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 7 },
  addBtnText: { color: '#74c7ec', fontSize: 11, fontWeight: '600' },
  addedBadge: { backgroundColor: 'rgba(166,227,161,0.15)', borderWidth: 1, borderColor: 'rgba(166,227,161,0.3)', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 7 },
  addedBadgeText: { color: '#a6e3a1', fontSize: 10, fontWeight: '600' },
});
