import { updatePassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

export default function Perfil({ navigation }) {
  const [carregando, setCarregando] = useState(true);
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [email, setEmail] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [editando, setEditando] = useState(false);

  const usuarioLogado = auth.currentUser;

  
  async function carregarPerfil() {
    if (!usuarioLogado) return;
    setEmail(usuarioLogado.email || '');

    try {
      const docRef = doc(db, 'usuarios', usuarioLogado.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const dados = docSnap.data();
        setNomeCompleto(dados.nomeCompleto || usuarioLogado.displayName || '');
        setDataNascimento(dados.dataNascimento || '');
      } else {
        
        setNomeCompleto(usuarioLogado.displayName || '');
      }
    } catch (error) {
      console.error("Erro ao carregar perfil do Firestore:", error);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarPerfil();
  }, []);

  const salvarDadosPessoais = async () => {
    try {
      setCarregando(true);
      const docRef = doc(db, 'usuarios', usuarioLogado.uid);
      
      await setDoc(docRef, {
        nomeCompleto: nomeCompleto,
        dataNascimento: dataNascimento,
        email: email
      }, { merge: true });

      setEditando(false);
      alert("Sucesso! Perfil atualizado.");
    } catch (error) {
      alert("Erro ao salvar dados.");
    } finally {
      setCarregando(false);
    }
  };

  const alterarSenhaFirebase = async () => {
    if (!novaSenha || novaSenha.trim().length < 6) {
      alert("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    try {
      setCarregando(true);
      await updatePassword(usuarioLogado, novaSenha);
      setNovaSenha('');
      alert("Segurança! Senha alterada com sucesso.");
    } catch (error) {
      console.error(error);
      alert("Erro ao alterar senha. Por segurança, faça login novamente antes de tentar.");
    } finally {
      setCarregando(false);
    }
  };

  const fazerLogout = async () => {
    await auth.signOut();
    navigation.replace('Login'); 
  };

  const obterIniciais = (nome) => {
    if (!nome) return 'IV';
    const partes = nome.trim().split(' ');
    if (partes.length > 1) {
      return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
    }
    return partes[0].slice(0, 2).toUpperCase();
  };

  if (carregando) {
    return (
      <View style={estilos.carregando}>
        <ActivityIndicator size="large" color="#32cd32" />
      </View>
    );
  }

  return (
    <ScrollView style={estilos.fundo} showsVerticalScrollIndicator={false}>
      
      {}
      <View style={estilos.headerPerfil}>
        <View style={estilos.avatarCirculo}>
          <Text style={estilos.avatarTexto}>{obterIniciais(nomeCompleto)}</Text>
        </View>
        <Text style={estilos.usuarioNome}>{nomeCompleto || 'Investidor Gold'}</Text>
        <Text style={estilos.usuarioStatus}>Membro Premium 💎</Text>
      </View>

      {}
      <View style={estilos.boxCard}>
        <View style={estilos.linhaTituloBox}>
          <Text style={estilos.tituloSessao}>Dados Pessoais</Text>
          <TouchableOpacity onPress={() => editando ? salvarDadosPessoais() : setEditando(true)}>
            <Text style={{ color: '#32cd32', fontWeight: 'bold' }}>
              {editando ? 'Salvar 💾' : 'Editar ✎'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={estilos.campoItem}>
          <Text style={estilos.labelCampo}>Nome Completo</Text>
          {editando ? (
            <TextInput style={estilos.inputEditavel} value={nomeCompleto} onChangeText={setNomeCompleto} placeholder="Digite seu nome completo" placeholderTextColor="#444" />
          ) : (
            <Text style={estilos.textoCampo}>{nomeCompleto || 'Não informado'}</Text>
          )}
        </View>

        <View style={estilos.campoItem}>
          <Text style={estilos.labelCampo}>Data de Nascimento</Text>
          {editando ? (
            <TextInput style={estilos.inputEditavel} value={dataNascimento} onChangeText={setDataNascimento} placeholder="DD/MM/AAAA" placeholderTextColor="#444" />
          ) : (
            <Text style={estilos.textoCampo}>{dataNascimento || 'Não informado'}</Text>
          )}
        </View>

        <View style={estilos.campoItem}>
          <Text style={estilos.labelCampo}>E-mail de Cadastro</Text>
          <Text style={estilos.textoCampoDesabilitado}>{email}</Text>
        </View>
      </View>

      {}
      <View style={estilos.boxCard}>
        <Text style={estilos.tituloSessao}>Segurança da Conta</Text>
        <Text style={estilos.descricaoSegurança}>Altere sua senha de acesso ao ecossistema:</Text>
        
        <View style={{ flexDirection: 'row', marginTop: 10, alignItems: 'center' }}>
          <TextInput 
            style={[estilos.inputEditavel, { flex: 1, marginBottom: 0, marginRight: 10 }]} 
            value={novaSenha} 
            onChangeText={setNovaSenha} 
            placeholder="Nova senha (min. 6 dígitos)" 
            placeholderTextColor="#444"
            secureTextEntry
          />
          <TouchableOpacity style={estilos.btnSenha} onPress={alterarSenhaFirebase}>
            <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 13 }}>Alterar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {}
      <TouchableOpacity style={estilos.botaoLogout} onPress={fazerLogout}>
        <Text style={estilos.textoBotaoLogout}>Sair da Conta 🚪</Text>
      </TouchableOpacity>

      <Text style={estilos.versaoApp}>Asset Tracker v2.4.0 • Built with Firebase</Text>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: '#000' },
  carregando: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  
  headerPerfil: { alignItems: 'center', paddingTop: 40, paddingBottom: 25 },
  avatarCirculo: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#1c1c1e', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#32cd32', marginBottom: 15 },
  avatarTexto: { color: '#32cd32', fontSize: 32, fontWeight: 'bold' },
  usuarioNome: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  usuarioStatus: { color: '#888', fontSize: 13, marginTop: 4, letterSpacing: 1 },

  boxCard: { backgroundColor: '#0a0a0c', marginHorizontal: 20, borderRadius: 24, padding: 20, marginBottom: 20 },
  linhaTituloBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  tituloSessao: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  descricaoSegurança: { color: '#666', fontSize: 13, marginBottom: 5 },

  campoItem: { borderBottomWidth: 1, borderColor: '#1a1a1c', paddingVertical: 12 },
  labelCampo: { color: '#444', fontSize: 11, textTransform: 'uppercase', fontWeight: '600', marginBottom: 4 },
  textoCampo: { color: '#FFF', fontSize: 15 },
  textoCampoDesabilitado: { color: '#666', fontSize: 15, fontStyle: 'italic' },
  
  inputEditavel: { backgroundColor: '#121214', color: '#FFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, fontSize: 15, marginBottom: 5 },
  btnSenha: { backgroundColor: '#32cd32', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8 },

  botaoLogout: { marginHorizontal: 20, borderColor: '#ff4444', borderWidth: 1, padding: 16, borderRadius: 24, alignItems: 'center', marginTop: 10, marginBottom: 20 },
  textoBotaoLogout: { color: '#ff4444', fontWeight: 'bold', fontSize: 15 },
  versaoApp: { color: '#333', textAlign: 'center', fontSize: 11, marginBottom: 40 }
});