import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My2048</Text>
      <Text style={styles.subtitle}>Expo hello world placeholder</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf8ef',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#776e65',
    fontSize: 48,
    fontWeight: '700',
  },
  subtitle: {
    color: '#8f7a66',
    fontSize: 18,
    marginTop: 12,
    textAlign: 'center',
  },
});
