import { addDoc, collection } from 'firebase/firestore';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

const TIPOS_INVESTIMENTO = [
  { id: 'crypto', label: 'Criptomoedas' },
  { id: 'moeda', label: 'Moedas Globais' },
  { id: 'renda_variavel', label: 'Renda Variável (B3/ETFs)' },
  { id: 'renda_fixa', label: 'Renda Fixa' }
];

const OPCOES_PREDEFINIDAS = {
  crypto: ['BTC', 'ETH', 'SOL', 'XRP', 'USDC'],
  moeda: ['USD', 'EUR', 'GBP', 'JPY']
};

export default function AdicionarAtivo({ navigation }) {
  const [tipoSel, setTipoSel] = useState('crypto');
  const [ativoSel, setAtivoSel] = useState('BTC'); // Para botões pré-definidos
  
  // Estados para inputs manuais
  const [siglaManual, setSiglaManual] = useState('');
  const [nomeManual, setNomeManual] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [precoMedio, setPrecoMedio] = useState('');
  const [valorInicial, setValorInicial] = useState(''); // Para Renda Fixa
  const [taxa, setTaxa] = useState(''); // Para Renda Fixa
  
  const [salvando, setSalvando] = useState(false);

  const salvarAtivo = async () => {
    const usuarioAtual = auth.currentUser;
    if (!usuarioAtual) {
      Alert.alert('Erro', 'Você precisa estar logado.');
      return;
    }

    // Validação básica
    if ((tipoSel === 'crypto' || tipoSel === 'moeda' || tipoSel === 'renda_variavel') && !quantidade) {
      Alert.alert('Aviso', 'Preencha a quantidade.');
      return;
    }
    if (tipoSel === 'renda_fixa' && (!valorInicial || !taxa)) {
      Alert.alert('Aviso', 'Preencha o valor investido e a taxa.');
      return;
    }

    setSalvando(true);

    // Montar o objeto exato que o PainelPrincipal.js espera ler
    let dadosParaSalvar = {
      tipo: tipoSel,
      userId: usuarioAtual.uid,
      dataCompra: new Date().toISOString()
    };

    if (tipoSel === 'crypto' || tipoSel === 'moeda') {
      dadosParaSalvar.sigla = ativoSel;
      dadosParaSalvar.nome = ativoSel;
      dadosParaSalvar.quantidade = parseFloat(quantidade.replace(',', '.'));
      dadosParaSalvar.precoMedio = precoMedio ? parseFloat(precoMedio.replace(',', '.')) : 0;
    } 
    else if (tipoSel === 'renda_variavel') {
      dadosParaSalvar.sigla = siglaManual.toUpperCase().trim();
      dadosParaSalvar.nome = nomeManual || siglaManual.toUpperCase().trim();
      dadosParaSalvar.quantidade = parseFloat(quantidade.replace(',', '.'));
      dadosParaSalvar.precoMedio = precoMedio ? parseFloat(precoMedio.replace(',', '.')) : 0;
    }
    else if (tipoSel === 'renda_fixa') {
      dadosParaSalvar.sigla = 'FIXA';
      dadosParaSalvar.nome = nomeManual || 'Tesouro / CDB';
      dadosParaSalvar.valorInicial = parseFloat(valorInicial.replace(',', '.'));
      dadosParaSalvar.quantidade = 1; // Renda fixa é tratada pelo montante
      dadosParaSalvar.taxa = parseFloat(taxa.replace(',', '.'));
      dadosParaSalvar.indexador = 'Prefixado';
    }

    try {
      await addDoc(collection(db, 'ativos'), dadosParaSalvar);
      Alert.alert('Sucesso', 'Operação registrada com sucesso!');
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
      <ScrollView style={estilos.container} showsVerticalScrollIndicator={false}>
        <Text style={estilos.titulo}>Nova Operação</Text>

        <Text style={estilos.label}>Classe do Ativo</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={estilos.scrollCategorias}>
          {TIPOS_INVESTIMENTO.map((cat) => (
            <TouchableOpacity 
              key={cat.id} 
              style={[estilos.abaCategoria, tipoSel === cat.id && estilos.abaCategoriaAtiva]}
              onPress={() => {
                setTipoSel(cat.id);
                if (OPCOES_PREDEFINIDAS[cat.id]) setAtivoSel(OPCOES_PREDEFINIDAS[cat.id][0]);
              }}
            >
              <Text style={[estilos.textoAba, tipoSel === cat.id && estilos.textoAbaAtiva]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={estilos.cardFormulario}>
          {/* FORMULÁRIO: CRIPTO OU MOEDAS */}
          {(tipoSel === 'crypto' || tipoSel === 'moeda') && (
            <>
              <Text style={estilos.labelInput}>Selecione a Moeda</Text>
              <View style={estilos.linhaAtivos}>
                {OPCOES_PREDEFINIDAS[tipoSel].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[estilos.cardOpcao, ativoSel === item && estilos.cardOpcaoAtivo]}
                    onPress={() => setAtivoSel(item)}
                  >
                    <Text style={[estilos.textoOpcao, ativoSel === item && estilos.textoOpcaoAtivo]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={estilos.labelInput}>Quantidade Adquirida</Text>
              <TextInput style={estilos.inputLimpo} placeholder="0.00" placeholderTextColor="#444" keyboardType="numeric" value={quantidade} onChangeText={setQuantidade} />
            </>
          )}

          {/* FORMULÁRIO: RENDA VARIÁVEL (AÇÕES, FIIs, ETFs) */}
          {tipoSel === 'renda_variavel' && (
            <>
              <Text style={estilos.labelInput}>Ticker / Sigla (Ex: PETR4, SHEB, RSPCX)</Text>
              <TextInput style={estilos.inputBox} placeholder="Digite a sigla..." placeholderTextColor="#666" autoCapitalize="characters" value={siglaManual} onChangeText={setSiglaManual} />
              
              <Text style={estilos.labelInput}>Quantidade (Cotas/Ações)</Text>
              <TextInput style={estilos.inputBox} placeholder="0" placeholderTextColor="#666" keyboardType="numeric" value={quantidade} onChangeText={setQuantidade} />
              
              <Text style={estilos.labelInput}>Preço Médio (Opcional)</Text>
              <TextInput style={estilos.inputBox} placeholder="R$ 0,00" placeholderTextColor="#666" keyboardType="numeric" value={precoMedio} onChangeText={setPrecoMedio} />
            </>
          )}

          {/* FORMULÁRIO: RENDA FIXA */}
          {tipoSel === 'renda_fixa' && (
            <>
              <Text style={estilos.labelInput}>Nome do Papel (Ex: CDB Banco Inter)</Text>
              <TextInput style={estilos.inputBox} placeholder="Nome do título..." placeholderTextColor="#666" value={nomeManual} onChangeText={setNomeManual} />
              
              <Text style={estilos.labelInput}>Valor Investido (R$)</Text>
              <TextInput style={estilos.inputBox} placeholder="R$ 0,00" placeholderTextColor="#666" keyboardType="numeric" value={valorInicial} onChangeText={setValorInicial} />
              
              <Text style={estilos.labelInput}>Taxa Anual Contratada (%)</Text>
              <TextInput style={estilos.inputBox} placeholder="Ex: 12.5" placeholderTextColor="#666" keyboardType="numeric" value={taxa} onChangeText={setTaxa} />
            </>
          )}
        </View>

        <TouchableOpacity style={estilos.botaoAcao} onPress={salvarAtivo} disabled={salvando}>
          {salvando ? <ActivityIndicator color="#000" /> : <Text style={estilos.textoBotao}>Adicionar à Carteira</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: '#000' },
  container: { padding: 20, paddingTop: 30 },
  titulo: { color: '#FFF', fontSize: 26, fontWeight: '800', marginBottom: 25 },
  label: { color: '#888', fontSize: 13, fontWeight: '700', marginBottom: 12, textTransform: 'uppercase' },
  
  scrollCategorias: { marginBottom: 25, maxHeight: 45 },
  abaCategoria: { paddingVertical: 10, paddingHorizontal: 18, marginRight: 10, borderRadius: 20, backgroundColor: '#13131A', borderWidth: 1, borderColor: '#1A1A24', height: 40 },
  abaCategoriaAtiva: { backgroundColor: '#00E5FF', borderColor: '#00E5FF' },
  textoAba: { color: '#888', fontWeight: '700', fontSize: 13 },
  textoAbaAtiva: { color: '#000', fontWeight: '800' },

  cardFormulario: { backgroundColor: '#0A0A0C', padding: 20, borderRadius: 20, marginBottom: 30 },
  labelInput: { color: '#AAA', fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 15 },
  
  linhaAtivos: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  cardOpcao: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12, backgroundColor: '#13131A', marginRight: 10, marginBottom: 10, borderWidth: 1, borderColor: '#222' },
  cardOpcaoAtivo: { backgroundColor: '#32cd32', borderColor: '#32cd32' },
  textoOpcao: { color: '#FFF', fontWeight: '700' },
  textoOpcaoAtivo: { color: '#000', fontWeight: '800' },

  inputLimpo: { color: '#FFF', fontSize: 32, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: '#222', paddingVertical: 10, marginBottom: 10 },
  inputBox: { backgroundColor: '#13131A', color: '#FFF', fontSize: 16, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#222', marginBottom: 5 },
  
  botaoAcao: { backgroundColor: '#32cd32', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginBottom: 50 },
  textoBotao: { color: '#000', fontSize: 16, fontWeight: '800', textTransform: 'uppercase' }
});