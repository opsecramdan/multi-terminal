// Zustand stores for Multi Terminal app state

import { create } from 'zustand';
import type {
  Device,
  DeviceGroup,
  DeviceStore,
  TerminalSession,
  SessionStore,
  ScanResult,
  ScanProgress,
  ScanTarget,
  ScannerStore,
} from '../types';

// ============================================
// Device Store
// ============================================

// Demo devices for first launch
const DEMO_DEVICES: Device[] = [
  { id: 'demo_1', name: 'Router Core 1', host: '192.168.1.1', port: 22, protocol: 'ssh', vendor: 'mikrotik', deviceType: 'router', lastConnected: Date.now() - 3600000, createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'demo_2', name: 'MikroTik-Core', host: '192.168.88.1', port: 8728, protocol: 'mikrotik-api', vendor: 'mikrotik', deviceType: 'router', lastConnected: Date.now() - 7200000, createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'demo_3', name: 'FortiGate-60F', host: '10.0.0.1', port: 443, protocol: 'https', vendor: 'fortigate', deviceType: 'firewall', lastConnected: Date.now() - 86400000, createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'demo_4', name: 'SW-Core Juniper', host: '10.0.0.2', port: 22, protocol: 'ssh', vendor: 'juniper', deviceType: 'switch', lastConnected: Date.now() - 172800000, createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'demo_5', name: 'AP-Lobby TP-Link', host: '192.168.1.100', port: 80, protocol: 'http', vendor: 'tplink', deviceType: 'access-point', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'demo_6', name: 'Huawei-NE40E', host: '10.10.0.1', port: 22, protocol: 'ssh', vendor: 'huawei', deviceType: 'router', createdAt: Date.now(), updatedAt: Date.now() },
];

export const useDeviceStore = create<DeviceStore>((set, get) => ({
  devices: DEMO_DEVICES,
  groups: [],

  addDevice: (deviceData) => {
    const device: Device = {
      ...deviceData,
      id: `dev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((state) => ({ devices: [...state.devices, device] }));
    return device;
  },

  updateDevice: (id, updates) => {
    set((state) => ({
      devices: state.devices.map((d) =>
        d.id === id ? { ...d, ...updates, updatedAt: Date.now() } : d
      ),
    }));
  },

  removeDevice: (id) => {
    set((state) => ({
      devices: state.devices.filter((d) => d.id !== id),
    }));
  },

  getDevicesByGroup: (groupId) => {
    return get().devices.filter((d) => d.groupId === groupId);
  },

  addGroup: (groupData) => {
    const group: DeviceGroup = {
      ...groupData,
      id: `grp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    set((state) => ({ groups: [...state.groups, group] }));
    return group;
  },

  removeGroup: (id) => {
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== id),
      // Unassign devices from deleted group
      devices: state.devices.map((d) =>
        d.groupId === id ? { ...d, groupId: undefined } : d
      ),
    }));
  },
}));

// ============================================
// Session Store
// ============================================

export const useSessionStore = create<SessionStore>((set) => ({
  sessions: [],
  activeSessionId: null,

  addSession: (session) => {
    set((state) => ({ sessions: [...state.sessions, session] }));
  },

  removeSession: (id) => {
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      activeSessionId:
        state.activeSessionId === id ? null : state.activeSessionId,
    }));
  },

  setActiveSession: (id) => {
    set({ activeSessionId: id });
  },

  updateSessionStatus: (id, status, error) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, status, error } : s
      ),
    }));
  },
}));

// ============================================
// Scanner Store
// ============================================

export const useScannerStore = create<ScannerStore>((set) => ({
  isScanning: false,
  progress: null,
  results: [],

  startScan: (_target: ScanTarget) => {
    set({ isScanning: true, results: [], progress: null });
  },

  stopScan: () => {
    set({ isScanning: false });
  },

  clearResults: () => {
    set({ results: [], progress: null });
  },
}));

// ============================================
// App Settings Store
// ============================================

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  fontSize: number;
  fontFamily: string;
  defaultSSHPort: number;
  defaultTelnetPort: number;
  defaultMikroTikPort: number;
  scanConcurrency: number;
  scanTimeout: number;
  keepAliveInterval: number;
  biometricAuth: boolean;
}

interface SettingsStore {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: {
    theme: 'dark',
    fontSize: 14,
    fontFamily: 'JetBrains Mono',
    defaultSSHPort: 22,
    defaultTelnetPort: 23,
    defaultMikroTikPort: 8728,
    scanConcurrency: 10,
    scanTimeout: 3000,
    keepAliveInterval: 30000,
    biometricAuth: false,
  },

  updateSettings: (updates) => {
    set((state) => ({
      settings: { ...state.settings, ...updates },
    }));
  },
}));
