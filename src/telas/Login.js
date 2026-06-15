import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../firebaseConfig';

export default function Login({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  const fazerLogin = async () => {
    if (email === '' || senha === '') {
      Alert.alert('Erro', 'Preencha e-mail e senha.');
      return;
    }

    setCarregando(true);
    try {
      await signInWithEmailAndPassword(auth, email, senha);

      navigation.replace('Painel'); 
    } catch (error) {
      console.error(error);
      Alert.alert('Erro no Login', 'E-mail ou senha incorretos.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <View style={estilos.fundo}>
      <View style={estilos.container}>
        <Text style={estilos.logo}>Delta Tracker</Text>
        <Text style={estilos.subtitulo}>Acesse sua carteira</Text>

        <TextInput
          style={estilos.input}
          placeholder="Seu E-mail"
          placeholderTextColor="#666"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={estilos.input}
          placeholder="Sua Senha"
          placeholderTextColor="#666"
          secureTextEntry
          value={senha}
          onChangeText={setSenha}
        />

        <TouchableOpacity style={estilos.botaoAcao} onPress={fazerLogin} disabled={carregando}>
          {carregando ? <ActivityIndicator color="#000" /> : <Text style={estilos.textoBotao}>Entrar</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Cadastro')} style={{ marginTop: 30 }}>
          <Text style={estilos.textoLink}>Ainda não tem conta? <Text style={{ color: '#32cd32' }}>Crie uma aqui.</Text></Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  container: { padding: 30 },
  logo: { color: '#FFF', fontSize: 36, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitulo: { color: '#888', fontSize: 16, marginBottom: 50, textAlign: 'center' },
  input: {
    backgroundColor: '#111',
    color: '#FFF',
    fontSize: 16,
    padding: 18,
    borderRadius: 15,
    marginBottom: 20,
  },
  botaoAcao: { backgroundColor: '#32cd32', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  textoBotao: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  textoLink: { color: '#888', textAlign: 'center', fontSize: 14 }
});