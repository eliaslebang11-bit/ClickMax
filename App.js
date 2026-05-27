import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, StatusBar, SafeAreaView, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getApiUrl } from './src/lib/api';

// Configure Notifications (Mobile Only)
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export default function App() {
  const [apiStatus, setApiStatus] = useState('Checking API...');

  useEffect(() => {
    async function checkApi() {
      try {
        const url = getApiUrl('/api/health');
        console.log('[MOBILE] Checking API at:', url);
        const response = await fetch(url);
        if (response.ok) {
          setApiStatus('API Connected: ' + url);
        } else {
          setApiStatus('API Error: ' + response.status);
        }
      } catch (error) {
        setApiStatus('API Connection Failed');
        console.error('[MOBILE] API Check Error:', error);
      }
    }

    if (Platform.OS !== 'web') {
      checkApi();
      registerForPushNotificationsAsync();
    }
  }, []);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text>Mobile App Placeholder (Web Environment)</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <Text style={styles.title}>ClickMax Mobile</Text>
        <Text style={styles.subtitle}>Production Ready Build Setup</Text>
        
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Environment:</Text>
          <Text style={styles.statusValue}>{__DEV__ ? 'Development' : 'Production'}</Text>
          
          <Text style={styles.statusLabel}>API URL:</Text>
          <Text style={styles.statusValue}>{getApiUrl('/')}</Text>
          
          <Text style={styles.statusLabel}>Connection Status:</Text>
          <Text style={styles.statusValue}>{apiStatus}</Text>
        </View>

        <Text style={styles.infoText}>
          This app is configured for Android APK and AAB builds.
          {"\n\n"}
          Permissions enabled:
          {"\n"}- Video Upload (Camera/Storage)
          {"\n"}- Notifications
          {"\n"}- Internet
        </Text>
      </View>
    </SafeAreaView>
  );
}

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return;
  
  let token;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return;
  }
  token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  statusCard: {
    width: '100%',
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 32,
  },
  statusLabel: {
    fontSize: 12,
    color: '#999',
    textTransform: 'uppercase',
    marginTop: 8,
  },
  statusValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  }
});
