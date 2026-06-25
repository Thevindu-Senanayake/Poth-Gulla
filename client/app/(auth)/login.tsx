import { useState } from 'react';
import { Alert, Button, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../src/auth/AuthContext';

export default function LoginScreen() {
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const onSubmit = async () => {
        setLoading(true);
        try {
            await signIn(email.trim(), password);
        } catch (e: any) {
            Alert.alert('Login failed', e?.response?.data?.message ?? e.message ?? 'Try again');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
            <Text style={{ fontSize: 24, fontWeight: '600' }}>Poth Gulla</Text>
            <TextInput
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                style={{
                    borderWidth: 1,
                    borderColor: '#ccc',
                    borderRadius: 8,
                    padding: 12,
                }}
            />
            <TextInput
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={{
                    borderWidth: 1,
                    borderColor: '#ccc',
                    borderRadius: 8,
                    padding: 12,
                }}
            />
            <Button
                title={loading ? 'Signing in…' : 'Sign in'}
                onPress={onSubmit}
                disabled={loading}
            />
        </View>
    );
}
