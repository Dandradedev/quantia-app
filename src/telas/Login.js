import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import {
  ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, SafeAreaView,
  StyleSheet, Text, TextInput,
  TouchableOpacity, View
} from 'react-native';
import { auth } from '../firebaseConfig';

export default function Login({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  const fazerLogin = async () => {
    if (email === '' || senha === '') {
      Alert.alert('Atenção', 'Por favor, preencha seu e-mail e senha.');
      return;
    }

    setCarregando(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), senha);
      navigation.replace('Painel'); 
    } catch (error) {
      console.error(error);
      Alert.alert('Acesso Negado', 'E-mail ou senha incorretos. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <SafeAreaView style={estilos.fundo}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={estilos.container}
      >
        <View style={estilos.header}>
          <View style={estilos.logoIcon}>
            <Text style={estilos.logoIconText}>Q</Text>
          </View>
          <Text style={estilos.logo}>Quantia</Text>
          <Text style={estilos.subtitulo}>O controle do seu patrimônio em um só lugar.</Text>
        </View>

        <View style={estilos.formContainer}>
          <Text style={estilos.label}>E-MAIL</Text>
          <TextInput
            style={estilos.input}
            placeholder="Digite seu e-mail"
            placeholderTextColor="#555"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={estilos.label}>SENHA</Text>
          <TextInput
            style={estilos.input}
            placeholder="Sua senha secreta"
            placeholderTextColor="#555"
            secureTextEntry
            value={senha}
            onChangeText={setSenha}
          />

          <TouchableOpacity style={estilos.esqueceuSenha}>
            <Text style={estilos.esqueceuSenhaTexto}>Esqueceu a senha?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[estilos.botaoAcao, carregando && estilos.botaoDesabilitado]} 
            onPress={fazerLogin} 
            disabled={carregando}
          >
            {carregando ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={estilos.textoBotao}>Acessar Carteira</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={estilos.footer}>
          <Text style={estilos.textoLink}>Ainda não tem conta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Cadastro')}>
            <Text style={estilos.textoLinkDestaque}>Criar conta</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: '#050505' },
  container: { flex: 1, padding: 25, justifyContent: 'center' },
  
  header: { alignItems: 'center', marginBottom: 40, marginTop: 20 },
  logoIcon: { width: 60, height: 60, borderRadius: 16, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#32cd32', marginBottom: 15, shadowColor: '#32cd32', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  logoIconText: { color: '#32cd32', fontSize: 32, fontWeight: '900' },
  logo: { color: '#FFF', fontSize: 32, fontWeight: '800', letterSpacing: -1, marginBottom: 8 },
  subtitulo: { color: '#888', fontSize: 14, textAlign: 'center', maxWidth: '80%' },
  
  formContainer: { width: '100%' },
  label: { color: '#888', fontSize: 11, fontWeight: '700', marginBottom: 8, marginLeft: 4, letterSpacing: 1 },
  input: { backgroundColor: '#0F0F13', color: '#FFF', fontSize: 16, padding: 18, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#1A1A24' },
  
  esqueceuSenha: { alignSelf: 'flex-end', marginBottom: 25, marginTop: -5 },
  esqueceuSenhaTexto: { color: '#00E5FF', fontSize: 13, fontWeight: '600' },
  
  botaoAcao: { backgroundColor: '#32cd32', padding: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#32cd32', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  botaoDesabilitado: { opacity: 0.7 },
  textoBotao: { color: '#000', fontSize: 16, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40 },
  textoLink: { color: '#666', fontSize: 14 },
  textoLinkDestaque: { color: '#32cd32', fontSize: 14, fontWeight: 'bold' }
});