import { addDoc, collection } from 'firebase/firestore';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../firebaseConfig';

const CATEGORIAS = {
  Crypto: ['BTC', 'ETH'],
  Moedas: ['USD', 'EUR']
};

export default function AdicionarAtivo({ navigation }) {
  const [categoriaSel, setCategoriaSel] = useState('Crypto');
  const [ativoSel, setAtivoSel] = useState('BTC');
  const [quantidade, setQuantidade] = useState('');
  const [salvando, setSalvando] = useState(false);

  const salvarAtivo = async () => {
    if (quantidade.trim() === '') {
      Alert.alert('Aviso', 'Preencha a quantidade.');
      return;
    }

    setSalvando(true);

    try {
      await addDoc(collection(db, 'ativos'), {
        nome: ativoSel, 
        quantidade: parseFloat(quantidade.replace(',', '.'))
      });

      Alert.alert('Sucesso', 'Ativo adicionado!');
      if (navigation) navigation.goBack();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      Alert.alert('Erro', 'Não foi possível salvar o ativo.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <View style={estilos.fundo}>
      <ScrollView style={estilos.container}>
        <Text style={estilos.titulo}>Novo Ativo</Text>

        {}
        <Text style={estilos.label}>Categoria</Text>
        <View style={estilos.linhaCategorias}>
          {Object.keys(CATEGORIAS).map((cat) => (
            <TouchableOpacity 
              key={cat} 
              style={[estilos.abaCategoria, categoriaSel === cat && estilos.abaCategoriaAtiva]}
              onPress={() => {
                setCategoriaSel(cat);
                setAtivoSel(CATEGORIAS[cat][0]); 
              }}
            >
              <Text style={[estilos.textoAba, categoriaSel === cat && estilos.textoAbaAtiva]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {}
        <Text style={estilos.label}>Selecione o Ativo</Text>
        <View style={estilos.linhaAtivos}>
          {CATEGORIAS[categoriaSel].map((item) => (
            <TouchableOpacity
              key={item}
              style={[estilos.cardOpcao, ativoSel === item && estilos.cardOpcaoAtivo]}
              onPress={() => setAtivoSel(item)}
            >
              <Text style={[estilos.textoOpcao, ativoSel === item && estilos.textoOpcaoAtivo]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {}
        <Text style={estilos.label}>Quantidade</Text>
        <TextInput
          style={estilos.inputLimpo}
          placeholder="0.00"
          placeholderTextColor="#444"
          keyboardType="numeric"
          value={quantidade}
          onChangeText={setQuantidade}
        />

        <TouchableOpacity 
          style={estilos.botaoAcao} 
          onPress={salvarAtivo}
          disabled={salvando}
        >
          {salvando ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={estilos.textoBotao}>Adicionar à Carteira</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: '#000' },
  container: { padding: 20, paddingTop: 30 },
  titulo: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 30 },
  label: { color: '#666', fontSize: 14, fontWeight: '600', marginBottom: 12, marginTop: 10 },
  
  linhaCategorias: { flexDirection: 'row', marginBottom: 25 },
  abaCategoria: { paddingVertical: 8, paddingHorizontal: 16, marginRight: 10, borderRadius: 20, backgroundColor: '#111' },
  abaCategoriaAtiva: { backgroundColor: '#222' },
  textoAba: { color: '#666', fontWeight: '600' },
  textoAbaAtiva: { color: '#FFF' },

  linhaAtivos: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 25 },
  cardOpcao: { paddingVertical: 12, paddingHorizontal: 25, borderRadius: 12, backgroundColor: '#1c1c1e', marginRight: 10, marginBottom: 10 },
  cardOpcaoAtivo: { backgroundColor: '#32cd32' },
  textoOpcao: { color: '#FFF', fontWeight: 'bold' },
  textoOpcaoAtivo: { color: '#000' },

  inputLimpo: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    paddingVertical: 10,
    marginBottom: 40,
  },
  botaoAcao: { backgroundColor: '#32cd32', paddingVertical: 18, borderRadius: 30, alignItems: 'center', marginTop: 10, marginBottom: 50 },
  textoBotao: { color: '#000', fontSize: 16, fontWeight: 'bold' }
});