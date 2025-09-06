interface SystemLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: any;
}

// In-memory log storage (in production, you'd use a proper logging service)
let systemLogs: SystemLog[] = [];
const MAX_LOGS = 1000;

export function addSystemLog(level: SystemLog['level'], message: string, details?: any) {
  const log: SystemLog = {
    timestamp: new Date().toISOString(),
    level,
    message,
    details
  };
  
  systemLogs.unshift(log);
  
  // Keep only the last MAX_LOGS entries
  if (systemLogs.length > MAX_LOGS) {
    systemLogs = systemLogs.slice(0, MAX_LOGS);
  }
}

export function getSystemLogs(limit?: number, level?: string): SystemLog[] {
  let filteredLogs = systemLogs;
  if (level && ['info', 'warning', 'error', 'success'].includes(level)) {
    filteredLogs = systemLogs.filter(log => log.level === level);
  }
  
  return limit ? filteredLogs.slice(0, limit) : filteredLogs;
}

export function getSystemLogsCount(): number {
  return systemLogs.length;
}

// Initialize with a startup log
addSystemLog('info', 'System logging utility initialized');
