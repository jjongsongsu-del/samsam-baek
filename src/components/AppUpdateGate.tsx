import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';
import { fetchAppVersionPolicy, type AppVersionPolicy } from '../services/appVersionService';
import { colors, elevation, radius, spacing, typography } from '../theme';

type AppUpdateGateProps = {
  children: React.ReactNode;
};

type ExpoConfigShape = {
  version?: string;
  android?: {
    versionCode?: number | string;
  };
};

function getCurrentAppVersion() {
  const expoConfig = Constants.expoConfig as ExpoConfigShape | null;
  const version = Constants.nativeAppVersion ?? expoConfig?.version ?? '0.0.0';
  const rawBuildVersion = Constants.nativeBuildVersion ?? expoConfig?.android?.versionCode ?? 0;
  const versionCode = Number(rawBuildVersion) || 0;
  return { version, versionCode };
}

export function AppUpdateGate({ children }: AppUpdateGateProps) {
  const current = useMemo(() => getCurrentAppVersion(), []);
  const [policy, setPolicy] = useState<AppVersionPolicy | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let mounted = true;

    fetchAppVersionPolicy(current.versionCode, current.version)
      .then((nextPolicy) => {
        if (!mounted || !nextPolicy.updateRequired) {
          return;
        }
        setPolicy(nextPolicy);
        setVisible(true);
      })
      .catch(() => {
        // Version checks should not block app startup when the network is unavailable.
      });

    return () => {
      mounted = false;
    };
  }, [current.version, current.versionCode]);

  const openStore = () => {
    if (!policy?.storeUrl) {
      return;
    }
    Linking.openURL(policy.storeUrl).catch(() => undefined);
  };

  return (
    <>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => !policy?.forceUpdate && setVisible(false)}>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <Text style={styles.title}>{policy?.forceUpdate ? '업데이트가 필요합니다' : '새 버전이 있습니다'}</Text>
            <Text style={styles.message}>{policy?.message}</Text>
            <View style={styles.versionBox}>
              <Text style={styles.versionText}>현재 버전 {current.version}</Text>
              <Text style={styles.versionText}>최신 버전 {policy?.latestVersion}</Text>
            </View>
            <View style={styles.actions}>
              {!policy?.forceUpdate ? (
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setVisible(false)} activeOpacity={0.85}>
                  <Text style={styles.secondaryButtonText}>나중에</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.primaryButton} onPress={openStore} activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>업데이트</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17, 20, 24, 0.42)',
    padding: spacing.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    padding: spacing.lg,
    ...elevation.level1,
  },
  title: {
    ...typography.title,
    color: colors.ink,
  },
  message: {
    ...typography.body,
    color: colors.gray70,
    marginTop: spacing.sm,
  },
  versionBox: {
    gap: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.gray5,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  versionText: {
    ...typography.caption,
    color: colors.gray60,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  secondaryButton: {
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  secondaryButtonText: {
    ...typography.label,
    color: colors.gray70,
  },
  primaryButton: {
    minWidth: 112,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.primary50,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  primaryButtonText: {
    ...typography.label,
    color: colors.white,
  },
});