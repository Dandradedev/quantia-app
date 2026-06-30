import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../firebaseConfig';

export default function Cadastro({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  const fazerCadastro = async () => {
    if (email === '' || senha === '' || confirmarSenha === '') {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    if (senha !== confirmarSenha) {
      Alert.alert('Erro', 'As senhas digitadas não coincidem.');
      return;
    }

    if (senha.length < 6) {
      Alert.alert('Erro', 'A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setCarregando(true);
    try {
      await createUserWithEmailAndPassword(auth, email, senha);
      Alert.alert('Sucesso!', 'Sua conta foi criada com sucesso!', [
        { text: 'Ir para o App', onPress: () => navigation.replace('Painel') }
      ]);
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert('Erro', 'Este e-mail já está em uso por outra conta.');
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert('Erro', 'O formato do e-mail digitado é inválido.');
      } else {
        Alert.alert('Erro no Cadastro', 'Não foi possível criar a conta neste momento.');
      }
    } finally {
      setCarregando(false);
    }
  };

  return (
    <View style={estilos.fundo}>
      <View style={estilos.container}>
        <Text style={estilos.logo}>Delta Tracker</Text>
        <Text style={estilos.subtitulo}>Crie sua conta para começar</Text>

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

        <TextInput
          style={estilos.input}
          placeholder="Confirme sua Senha"
          placeholderTextColor="#666"
          secureTextEntry
          value={confirmarSenha}
          onChangeText={setConfirmarSenha}
        />

        <TouchableOpacity style={estilos.botaoAcao} onPress={fazerCadastro} disabled={carregando}>
          {carregando ? <ActivityIndicator color="#000" /> : <Text style={estilos.textoBotao}>Criar Conta</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 30 }}>
          <Text style={estilos.textoLink}>Já possui uma conta? <Text style={{ color: '#32cd32' }}>Faça login.</Text></Text>
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