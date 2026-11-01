// Multi Terminal — Core Type Definitions

// ============================================
// Device & Connection Types
// ============================================

export type ConnectionProtocol = 'ssh' | 'telnet' | 'mikrotik-api' | 'http' | 'https' | 'rdp';

export type DeviceVendor =
  | 'mikrotik'
  | 'fortigate'
  | 'juniper'
  | 'huawei'
  | 'cisco'
  | 'tplink'
  | 'linksys'
  | 'dlink'
  | 'ubiquiti'
  | 'generic'
  | 'unknown';

export type DeviceType =
  | 'router'
  | 'switch'
  | 'firewall'
  | 'access-point'
  | 'server'
  | 'other';

export interface Device {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: ConnectionProtocol;
  vendor: DeviceVendor;
  deviceType: DeviceType;
  groupId?: string;
  macAddress?: string;
  notes?: string;
  credentialId?: string; // reference to keychain entry
  lastConnected?: number; // unix timestamp
  createdAt: number;
  updatedAt: number;
}

export interface DeviceGroup {
  id: string;
  name: string;
  color: string;
  icon: string;
  parentId?: string; // for nested groups
}

export interface ConnectionConfig {
  host: string;
  port: number;
  protocol: ConnectionProtocol;
  username?: string;
  password?: string;
  privateKey?: string;
  useTLS?: boolean;
  timeout?: number; // ms
  keepAlive?: number; // ms
}

// ============================================
// SSH Types
// ============================================

export type SSHAuthMethod = 'password' | 'publickey' | 'keyboard-interactive';

export interface SSHConfig extends ConnectionConfig {
  protocol: 'ssh';
  authMethod: SSHAuthMethod;
  privateKey?: string;
  passphrase?: string;
  hostKeyVerification: boolean;
  termType?: string; // default: xterm-256color
  cols?: number;
  rows?: number;
}

export interface SSHSession {
  id: string;
  deviceId: string;
  config: SSHConfig;
  status: SessionStatus;
  startedAt: number;
}

// ============================================
// Telnet Types
// ============================================

export interface TelnetConfig extends ConnectionConfig {
  protocol: 'telnet';
  encoding?: string; // default: utf-8
  negotiateOptions?: boolean; // IAC negotiation
  cols?: number;
  rows?: number;
}

// ============================================
// MikroTik API Types
// ============================================

export interface MikroTikConfig extends ConnectionConfig {
  protocol: 'mikrotik-api';
  port: number; // 8728 plain, 8729 TLS
  useTLS: boolean;
}

export interface MikroTikCommand {
  command: string; // e.g., '/interface/print'
  params?: Record<string, string>; // e.g., { '=type': 'ether' }
  query?: string[]; // e.g., ['?running=true']
  tag?: string; // for multiplexing
}

export interface MikroTikResponse {
  type: '!re' | '!done' | '!trap' | '!fatal';
  tag?: string;
  data: Record<string, string>;
}

// ============================================
// Network Scanner Types
// ============================================

export interface ScanTarget {
  subnet: string; // e.g., '192.168.1.0/24'
  portList?: number[];
}

export interface ScanResult {
  ip: string;
  mac?: string;
  vendor?: string;
  hostname?: string;
  openPorts: number[];
  deviceType?: DeviceType;
  detectedVendor?: DeviceVendor;
  responseTime?: number; // ms
  lastSeen: number;
}

export interface ScanProgress {
  total: number;
  scanned: number;
  found: number;
  phase: 'ping' | 'port-scan' | 'fingerprint' | 'done';
}

// ============================================
// Session & Terminal Types
// ============================================

export type SessionStatus = 'connecting' | 'connected' | 'disconnecting' | 'disconnected' | 'error';

export interface TerminalSession {
  id: string;
  deviceId: string;
  protocol: ConnectionProtocol;
  status: SessionStatus;
  title: string;
  startedAt: number;
  error?: string;
}

export interface TerminalDimensions {
  cols: number;
  rows: number;
}

// ============================================
// Store Types
// ============================================

export interface DeviceStore {
  devices: Device[];
  groups: DeviceGroup[];
  addDevice: (device: Omit<Device, 'id' | 'createdAt' | 'updatedAt'>) => Device;
  updateDevice: (id: string, updates: Partial<Device>) => void;
  removeDevice: (id: string) => void;
  getDevicesByGroup: (groupId: string) => Device[];
  addGroup: (group: Omit<DeviceGroup, 'id'>) => DeviceGroup;
  removeGroup: (id: string) => void;
}

export interface SessionStore {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  addSession: (session: TerminalSession) => void;
  removeSession: (id: string) => void;
  setActiveSession: (id: string) => void;
  updateSessionStatus: (id: string, status: SessionStatus, error?: string) => void;
}

export interface ScannerStore {
  isScanning: boolean;
  progress: ScanProgress | null;
  results: ScanResult[];
  startScan: (target: ScanTarget) => void;
  stopScan: () => void;
  clearResults: () => void;
}

// ============================================
// Navigation Types
// ============================================

export type RootTabParamList = {
  DevicesTab: undefined;
  SessionsTab: undefined;
  ScannerTab: undefined;
  SettingsTab: undefined;
};

export type DevicesStackParamList = {
  DeviceList: undefined;
  DeviceDetail: { deviceId: string };
  AddDevice: undefined;
  EditDevice: { deviceId: string };
};

export type SessionsStackParamList = {
  SessionList: undefined;
  Terminal: { sessionId: string };
  WebTerminal: { deviceId: string; url: string };
};

export type ScannerStackParamList = {
  ScannerHome: undefined;
  ScanResults: { scanId: string };
};
