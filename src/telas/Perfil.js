import { updatePassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
      console.error("Erro ao carregar perfil", error);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregarPerfil(); }, []);

  const salvarDadosPessoais = async () => {
    try {
      setCarregando(true);
      await setDoc(doc(db, 'usuarios', usuarioLogado.uid), { nomeCompleto, dataNascimento, email }, { merge: true });
      setEditando(false);
      Alert.alert("Sucesso", "Suas informações foram atualizadas.");
    } catch (error) { Alert.alert("Erro", "Não foi possível salvar os dados."); } finally { setCarregando(false); }
  };

  const alterarSenhaFirebase = async () => {
    if (!novaSenha || novaSenha.trim().length < 6) { Alert.alert("Atenção", "A senha precisa ter pelo menos 6 caracteres."); return; }
    try {
      setCarregando(true);
      await updatePassword(usuarioLogado, novaSenha);
      setNovaSenha('');
      Alert.alert("Segurança", "Senha alterada com sucesso.");
    } catch (error) { Alert.alert("Erro", "Faça login novamente para alterar a senha."); } finally { setCarregando(false); }
  };

  const fazerLogout = async () => {
    await auth.signOut();
    navigation.replace('Login'); 
  };

  const obterIniciais = (nome) => {
    if (!nome) return 'US';
    const partes = nome.trim().split(' ');
    if (partes.length > 1) return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
    return partes[0].slice(0, 2).toUpperCase();
  };

  if (carregando) return <View style={estilos.carregando}><ActivityIndicator size="large" color="#32cd32" /></View>;

  return (
    <ScrollView style={estilos.fundo} showsVerticalScrollIndicator={false}>
      
      <View style={estilos.headerPerfil}>
        <View style={estilos.avatarCirculo}>
          <Text style={estilos.avatarTexto}>{obterIniciais(nomeCompleto)}</Text>
        </View>
        <Text style={estilos.usuarioNome}>{nomeCompleto || 'Investidor'}</Text>
      </View>

      <View style={estilos.containerConteudo}>
        <View style={estilos.boxHeader}>
          <Text style={estilos.tituloSessao}>Informações Pessoais</Text>
          <TouchableOpacity onPress={() => editando ? salvarDadosPessoais() : setEditando(true)} style={estilos.btnAcaoPequeno}>
            <Text style={estilos.txtBtnAcaoPequeno}>{editando ? 'Salvar' : 'Editar'}</Text>
          </TouchableOpacity>
        </View>

        <View style={estilos.boxCardGroup}>
          <View style={estilos.campoItem}>
            <Text style={estilos.labelCampo}>NOME COMPLETO</Text>
            {editando ? <TextInput style={estilos.inputEditavel} value={nomeCompleto} onChangeText={setNomeCompleto} placeholderTextColor="#555" /> : <Text style={estilos.textoCampo}>{nomeCompleto || 'Não informado'}</Text>}
          </View>
          <View style={[estilos.campoItem, { borderBottomWidth: 0 }]}>
            <Text style={estilos.labelCampo}>DATA DE NASCIMENTO</Text>
            {editando ? <TextInput style={estilos.inputEditavel} value={dataNascimento} onChangeText={setDataNascimento} placeholder="DD/MM/AAAA" placeholderTextColor="#555" /> : <Text style={estilos.textoCampo}>{dataNascimento || 'Não informado'}</Text>}
          </View>
        </View>

        <Text style={[estilos.tituloSessao, { marginTop: 25 }]}>Acesso & Segurança</Text>
        <View style={estilos.boxCardGroup}>
          <View style={estilos.campoItem}>
            <Text style={estilos.labelCampo}>E-MAIL DE CADASTRO</Text>
            <Text style={estilos.textoCampoDesabilitado}>{email}</Text>
          </View>
          <View style={[estilos.campoItem, { borderBottomWidth: 0 }]}>
            <Text style={estilos.labelCampo}>ALTERAR SENHA</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
              <TextInput style={[estilos.inputEditavel, { flex: 1, marginRight: 10, marginVertical: 0 }]} value={novaSenha} onChangeText={setNovaSenha} placeholder="Nova senha (mín. 6)" placeholderTextColor="#555" secureTextEntry />
              <TouchableOpacity style={estilos.btnSenha} onPress={alterarSenhaFirebase}>
                <Text style={estilos.txtBtnSenha}>Trocar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity style={estilos.botaoLogout} onPress={fazerLogout}>
          <Text style={estilos.textoBotaoLogout}>Encerrar Sessão</Text>
        </TouchableOpacity>

        <Text style={estilos.versaoApp}>Quantia v3.0 (TCC Final) 🎓</Text>
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: '#050505' },
  carregando: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050505' },
  
  headerPerfil: { alignItems: 'center', paddingTop: 60, paddingBottom: 40, backgroundColor: '#0A0A0C', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, borderWidth: 1, borderColor: '#15151A', borderTopWidth: 0 },
  avatarCirculo: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#32cd32', marginBottom: 15, shadowColor: '#32cd32', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
  avatarTexto: { color: '#FFF', fontSize: 36, fontWeight: '900' },
  usuarioNome: { color: '#FFF', fontSize: 24, fontWeight: '800' },

  containerConteudo: { padding: 20 },
  boxHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  tituloSessao: { color: '#888', fontSize: 13, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', marginLeft: 10 },
  btnAcaoPequeno: { backgroundColor: '#1C1C22', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  txtBtnAcaoPequeno: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },

  boxCardGroup: { backgroundColor: '#0A0A0C', borderRadius: 20, paddingHorizontal: 20, borderWidth: 1, borderColor: '#15151A' },
  campoItem: { borderBottomWidth: 1, borderColor: '#15151A', paddingVertical: 18 },
  labelCampo: { color: '#555', fontSize: 10, textTransform: 'uppercase', fontWeight: '800', marginBottom: 6, letterSpacing: 1 },
  textoCampo: { color: '#FFF', fontSize: 16, fontWeight: '500' },
  textoCampoDesabilitado: { color: '#666', fontSize: 16, fontWeight: '500' },
  
  inputEditavel: { backgroundColor: '#111', color: '#FFF', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: '#222' },
  btnSenha: { backgroundColor: '#32cd32', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  txtBtnSenha: { color: '#000', fontWeight: '900', fontSize: 13 },

  botaoLogout: { backgroundColor: 'rgba(255, 68, 68, 0.1)', borderColor: '#ff4444', borderWidth: 1, padding: 18, borderRadius: 20, alignItems: 'center', marginTop: 40, marginBottom: 20 },
  textoBotaoLogout: { color: '#ff4444', fontWeight: '800', fontSize: 15, textTransform: 'uppercase' },
  versaoApp: { color: '#444', textAlign: 'center', fontSize: 12, marginBottom: 40, fontWeight: '600' }
});