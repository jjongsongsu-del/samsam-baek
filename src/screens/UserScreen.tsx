import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppSurface } from '../components/AppSurface';
import { Panel } from '../components/Panel';
import { ScreenHeader } from '../components/ScreenHeader';
import {
  loadAccountState,
  KAKAO_REDIRECT_PATH,
  KAKAO_REDIRECT_SCHEME,
  KAKAO_REST_API_KEY,
  signInWithKakaoAuthorizationCode,
  signInWithSocial,
  signOutAccount,
  updateAccountProfile,
  type AccountState,
  type SocialProvider,
} from '../services/accountService';
import { loadAdminSession, signInAdmin, signOutAdmin, type AdminSession } from '../services/adminAuthService';
import { colors } from '../theme';

WebBrowser.maybeCompleteAuthSession();

const providerLabels: Record<SocialProvider, string> = {
  naver: 'NAVER',
  kakao: 'KAKAO',
  google: 'GOOGLE',
};

const UserScreen = () => {
  const [accountState, setAccountState] = useState<AccountState | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(null);
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [adminUsername, setAdminUsername] = useState('manager');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const kakaoRedirectUri = useMemo(
    () => AuthSession.makeRedirectUri({ scheme: KAKAO_REDIRECT_SCHEME, path: KAKAO_REDIRECT_PATH }),
    [],
  );
  const [, , promptKakaoAsync] = AuthSession.useAuthRequest(
    {
      clientId: KAKAO_REST_API_KEY,
      redirectUri: kakaoRedirectUri,
      responseType: AuthSession.ResponseType.Code,
    },
    {
      authorizationEndpoint: 'https://kauth.kakao.com/oauth/authorize',
    },
  );

  const refreshAccount = async () => {
    const state = await loadAccountState();
    const admin = await loadAdminSession();
    setAccountState(state);
    setAdminSession(admin);
    setProfileName(state.profile.nickname);
    setProfileEmail(state.profile.email ?? '');
  };

  useEffect(() => {
    refreshAccount();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshAccount();
    }, []),
  );

  const handleSocialSignIn = async (provider: SocialProvider) => {
    setLoadingProvider(provider);
    try {
      if (provider === 'kakao') {
        if (!KAKAO_REST_API_KEY) {
          throw new Error('EXPO_PUBLIC_KAKAO_REST_API_KEY is not configured.');
        }
        const result = await promptKakaoAsync();
        if (result.type !== 'success') {
          return;
        }
        const code = result.params.code;
        if (!code) {
          throw new Error('Kakao authorization code was not returned.');
        }
        setAccountState(await signInWithKakaoAuthorizationCode(code, kakaoRedirectUri));
        return;
      }
      setAccountState(await signInWithSocial(provider));
    } catch (error: any) {
      Alert.alert('로그인 실패', error.message || '잠시 후 다시 시도해 주세요.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleSaveProfile = async () => {
    setAccountState(await updateAccountProfile({ nickname: profileName, email: profileEmail }));
    Alert.alert('저장 완료', '사용자 정보가 저장되었습니다.');
  };

  const handleSignOut = async () => {
    setAccountState(await signOutAccount());
  };

  const handleAdminSignIn = async () => {
    setAdminLoading(true);
    try {
      const session = await signInAdmin(adminUsername.trim(), adminPassword);
      setAdminSession(session);
      setAdminPassword('');
      Alert.alert('관리자 로그인 완료', '지도 메뉴에서 CSV 반영을 사용할 수 있습니다.');
    } catch (error: any) {
      Alert.alert('관리자 로그인 실패', error.message || '계정 정보를 확인해 주세요.');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminSignOut = async () => {
    await signOutAdmin();
    setAdminSession(null);
  };

  if (!accountState) {
    return (
      <AppSurface>
        <ScreenHeader title="사용자" description="계정과 AI 판독 이용 현황을 확인합니다." />
      </AppSurface>
    );
  }

  const { profile, usage, limit, remaining } = accountState;
  const isMember = profile.mode === 'member';

  return (
    <AppSurface>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="사용자" description="계정과 AI 판독 이용 현황을 확인합니다." />

        <Panel tone="light">
          <View style={styles.accountHeader}>
            <View>
              <Text style={styles.title}>{isMember ? profile.nickname : '비회원'}</Text>
              <Text style={styles.meta}>{isMember ? `${providerLabels[profile.provider ?? 'kakao']} 계정으로 로그인됨` : '소셜 계정 연결 전'}</Text>
            </View>
            <View style={styles.usageBadge}>
              <Text style={styles.usageBadgeText}>{remaining}회 남음</Text>
            </View>
          </View>
          <Text style={styles.body}>오늘 AI 판독 {usage.count}/{limit}회 사용</Text>
          {isMember ? (
            <View style={styles.accountDetails}>
              {profile.email ? <Text style={styles.meta}>이메일 {profile.email}</Text> : null}
              <Text style={styles.meta}>회원 ID {profile.id}</Text>
              <Text style={styles.meta}>소셜 ID {profile.providerUserId}</Text>
              {profile.joinedAt ? <Text style={styles.meta}>가입일 {new Date(profile.joinedAt).toLocaleDateString('ko-KR')}</Text> : null}
            </View>
          ) : null}
        </Panel>

        {isMember ? (
          <Panel>
            <Text style={styles.panelTitle}>내 정보</Text>
            <TextInput
              value={profileName}
              onChangeText={setProfileName}
              placeholder="닉네임"
              placeholderTextColor={colors.gray40}
              style={styles.profileInput}
            />
            <TextInput
              value={profileEmail}
              onChangeText={setProfileEmail}
              placeholder="이메일"
              placeholderTextColor={colors.gray40}
              style={styles.profileInput}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.meta}>사용자 ID {profile.id}</Text>
            <Text style={styles.meta}>소셜 ID {profile.providerUserId}</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.accountButton} onPress={handleSaveProfile}>
                <Ionicons name="save" size={16} color={colors.primary60} />
                <Text style={styles.accountButtonText}>저장</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.accountButton, styles.deleteButton]} onPress={handleSignOut}>
                <Ionicons name="log-out" size={16} color={colors.danger60} />
                <Text style={styles.deleteText}>로그아웃</Text>
              </TouchableOpacity>
            </View>
          </Panel>
        ) : (
          <Panel>
            <Text style={styles.panelTitle}>소셜 로그인</Text>
            <View style={styles.socialStack}>
              {(['naver', 'kakao', 'google'] as SocialProvider[]).map((provider) => (
                <TouchableOpacity
                  key={provider}
                  style={styles.socialButton}
                  onPress={() => handleSocialSignIn(provider)}
                  disabled={loadingProvider !== null}
                >
                  <Ionicons name="log-in" size={17} color={colors.white} />
                  <Text style={styles.socialButtonText}>
                    {loadingProvider === provider ? '연결 중' : `${providerLabels[provider]}로 계속`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Panel>
        )}

        <Panel>
          <Text style={styles.panelTitle}>관리자</Text>
          {adminSession ? (
            <>
              <Text style={styles.body}>{adminSession.username} 계정으로 로그인되어 있습니다.</Text>
              <Text style={styles.meta}>만료 {new Date(adminSession.expiresAt).toLocaleString('ko-KR')}</Text>
              <TouchableOpacity style={[styles.accountButton, styles.adminLogoutButton]} onPress={handleAdminSignOut}>
                <Ionicons name="lock-open" size={16} color={colors.primary60} />
                <Text style={styles.accountButtonText}>관리자 로그아웃</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput
                value={adminUsername}
                onChangeText={setAdminUsername}
                placeholder="관리자 ID"
                placeholderTextColor={colors.gray40}
                style={styles.profileInput}
                autoCapitalize="none"
              />
              <TextInput
                value={adminPassword}
                onChangeText={setAdminPassword}
                placeholder="관리자 비밀번호"
                placeholderTextColor={colors.gray40}
                style={styles.profileInput}
                secureTextEntry
              />
              <TouchableOpacity style={styles.socialButton} onPress={handleAdminSignIn} disabled={adminLoading}>
                <Ionicons name="lock-closed" size={17} color={colors.white} />
                <Text style={styles.socialButtonText}>{adminLoading ? '로그인 중' : '관리자 로그인'}</Text>
              </TouchableOpacity>
            </>
          )}
        </Panel>
      </ScrollView>
    </AppSurface>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 28 },
  accountHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 },
  title: { color: colors.ink, fontSize: 20, lineHeight: 30, fontWeight: '700' },
  panelTitle: { color: colors.cream, fontSize: 16, lineHeight: 24, fontWeight: '700', marginBottom: 10 },
  body: { color: colors.gray60, fontSize: 14, lineHeight: 21 },
  meta: { color: colors.gray60, fontSize: 12, lineHeight: 18, marginTop: 4 },
  accountDetails: { marginTop: 8 },
  usageBadge: {
    minWidth: 64,
    minHeight: 40,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: colors.primary5,
    borderColor: colors.primary10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  usageBadgeText: { color: colors.primary60, fontSize: 15, lineHeight: 23, fontWeight: '700' },
  profileInput: {
    minHeight: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary10,
    backgroundColor: colors.gray0,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 21,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  accountButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary10,
    backgroundColor: colors.gray0,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  accountButtonText: { color: colors.primary60, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  adminLogoutButton: { marginTop: 12 },
  deleteButton: { borderColor: colors.danger5, backgroundColor: colors.danger5 },
  deleteText: { color: colors.danger60, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  socialStack: { gap: 10 },
  socialButton: {
    minHeight: 48,
    borderRadius: 6,
    backgroundColor: colors.primary60,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  socialButtonText: { color: colors.white, fontSize: 14, lineHeight: 21, fontWeight: '700' },
});

export default UserScreen;
