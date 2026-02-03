/**
 * Machine ID Binding
 *
 * Cross-platform machine identification with SHA256 hashing
 */

import { createHash } from 'crypto';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

/**
 * Get raw machine ID based on platform
 */
export async function getMachineId(): Promise<string> {
  try {
    const platform = process.platform;

    switch (platform) {
      case 'darwin':
        return getMacOSMachineId();
      case 'linux':
        return getLinuxMachineId();
      case 'win32':
        return getWindowsMachineId();
      default:
        return getFallbackMachineId();
    }
  } catch (error) {
    // Fallback to hostname if platform-specific method fails
    return getFallbackMachineId();
  }
}

/**
 * Get macOS hardware UUID
 */
function getMacOSMachineId(): string {
  try {
    const output = execSync('ioreg -rd1 -c IOPlatformExpertDevice', {
      encoding: 'utf-8',
      timeout: 5000
    });

    const match = output.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
    if (match && match[1]) {
      return match[1].trim();
    }

    // Fallback to serial number
    const serialOutput = execSync('system_profiler SPHardwareDataType', {
      encoding: 'utf-8',
      timeout: 5000
    });

    const serialMatch = serialOutput.match(/Serial Number \(system\):\s*(.+)/);
    if (serialMatch && serialMatch[1]) {
      return serialMatch[1].trim();
    }

    throw new Error('Could not retrieve macOS machine ID');
  } catch (error) {
    throw new Error(`macOS machine ID retrieval failed: ${error}`);
  }
}

/**
 * Get Linux machine ID
 */
function getLinuxMachineId(): string {
  try {
    // Try /etc/machine-id first (systemd)
    try {
      const machineId = readFileSync('/etc/machine-id', 'utf-8').trim();
      if (machineId) {
        return machineId;
      }
    } catch (error) {
      // Continue to next method
    }

    // Try /var/lib/dbus/machine-id
    try {
      const dbusMachineId = readFileSync('/var/lib/dbus/machine-id', 'utf-8').trim();
      if (dbusMachineId) {
        return dbusMachineId;
      }
    } catch (error) {
      // Continue to next method
    }

    // Fallback to hostname
    const hostname = execSync('hostname', {
      encoding: 'utf-8',
      timeout: 5000
    }).trim();

    if (hostname) {
      return hostname;
    }

    throw new Error('Could not retrieve Linux machine ID');
  } catch (error) {
    throw new Error(`Linux machine ID retrieval failed: ${error}`);
  }
}

/**
 * Get Windows machine GUID
 */
function getWindowsMachineId(): string {
  try {
    const output = execSync(
      'reg query HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid',
      {
        encoding: 'utf-8',
        timeout: 5000
      }
    );

    const match = output.match(/MachineGuid\s+REG_SZ\s+(.+)/);
    if (match && match[1]) {
      return match[1].trim();
    }

    throw new Error('Could not retrieve Windows machine GUID');
  } catch (error) {
    throw new Error(`Windows machine ID retrieval failed: ${error}`);
  }
}

/**
 * Fallback machine ID using hostname
 */
function getFallbackMachineId(): string {
  try {
    const hostname = execSync('hostname', {
      encoding: 'utf-8',
      timeout: 5000
    }).trim();

    if (hostname) {
      return hostname;
    }

    // Last resort: use process info
    return `${process.platform}-${process.arch}-${process.pid}`;
  } catch (error) {
    // Absolute last resort
    return `fallback-${process.platform}-${process.arch}`;
  }
}

/**
 * Hash machine ID with SHA256 for privacy
 */
export function hashMachineId(rawId: string): string {
  const hash = createHash('sha256');
  hash.update(rawId);
  return hash.digest('hex');
}

/**
 * Get hashed machine ID (convenience method)
 */
export async function getHashedMachineId(): Promise<string> {
  const rawId = await getMachineId();
  return hashMachineId(rawId);
}
