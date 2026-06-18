import { useIsFocused } from '@react-navigation/native';
import { collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { auth, db } from '../firebaseConfig';
import { buscarCotacoes } from '../servicos/apiCotacoes';

export default function PainelPrincipal({ navigation }) {
  const [carregando, setCarregando] = useState(true);
  const [meusAtivos, setMeusAtivos] = useState([]);
  const [saldoTotal, setSaldoTotal] = useState(0);
  const [cotacoesDia, setCotacoesDia] = useState([]);
  
  // NOVOS ESTADOS ADICIONADOS
  const [variacaoCarteira, setVariacaoCarteira] = useState(0);
  const [ocultarSaldo, setOcultarSaldo] = useState(false);
  
  const larguraTela = Dimensions.get('window').width;
  const isFocused = useIsFocused();

  // Calcula a cor dinamicamente com base no novo estado
  const isAlta = variacaoCarteira >= 0;
  const corTendencia = isAlta ? '#32cd32' : '#ff4444';

  async function carregarDadosDoApp() {
    const usuarioAtual = auth.currentUser;
    if (!usuarioAtual) return;

    try {
      const precosMercado = await buscarCotacoes();
      
      try {
        const respGecko = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=brl&order=volume_desc&per_page=5&page=1&sparkline=true');
        const dadosGecko = await respGecko.json();
        
        if (Array.isArray(dadosGecko)) {
          const formatadosGecko = dadosGecko.map(coin => ({
            id: coin.id, sigla: (coin.symbol || '').toUpperCase(), preco: coin.current_price || 0,
            variacao: coin.price_change_percentage_24h || 0, 
            grafico: coin.sparkline_in_7d?.price?.filter((_, i) => i % 24 === 0) || []
          }));
          setCotacoesDia(formatadosGecko);
        }
      } catch (e) {
        console.log('Aviso: Não foi possível carregar a API CoinGecko', e);
      }

      const q = query(collection(db, "ativos"), where("userId", "==", usuarioAtual.uid));
      const querySnapshot = await getDocs(q);
      
      const listaAtivos = [];
      let calculoSaldo = 0;
      let somaVariacoes = 0; // Para calcular a média da carteira

      querySnapshot.forEach((doco) => {
        const dados = doco.data();
        if (!dados || !dados.nome) return;

        let precoAtual = 0; let siglaPadrao = ''; let corIcone = '#1c1c1e'; let tipo = 'outro'; let iconeDisplay = ''; let bandeira = '';
        const nomeTratado = dados.nome.toUpperCase().trim();

        if (nomeTratado === 'BTC' || nomeTratado === 'BITCOIN') {
          precoAtual = precosMercado?.bitcoin || 0; siglaPadrao = 'BTC'; corIcone = '#F7931A'; tipo = 'crypto'; iconeDisplay = '₿';
        } else if (nomeTratado === 'ETH' || nomeTratado === 'ETHEREUM') {
          precoAtual = precosMercado?.ethereum || 0; siglaPadrao = 'ETH'; corIcone = '#627EEA'; tipo = 'crypto'; iconeDisplay = 'Ξ';
        } else if (nomeTratado === 'USD' || nomeTratado === 'DOLAR' || nomeTratado === 'DÓLAR') {
          precoAtual = precosMercado?.dolar || 0; siglaPadrao = 'USD'; corIcone = '#2e8b57'; tipo = 'moeda'; iconeDisplay = '$'; bandeira = '🇺🇸'; 
        } else if (nomeTratado === 'EUR' || nomeTratado === 'EURO') {
          precoAtual = precosMercado?.euro || 0; siglaPadrao = 'EUR'; corIcone = '#003399'; tipo = 'moeda'; iconeDisplay = '€'; bandeira = '🇪🇺';
        } else if (nomeTratado === 'BRL' || nomeTratado === 'REAL') {
          precoAtual = 1; siglaPadrao = 'BRL'; corIcone = '#009b3a'; tipo = 'moeda'; iconeDisplay = 'R$'; bandeira = '🇧🇷';
        }

        const quantidadeNumerica = Number(dados.quantidade) || 0;
        const valorInvestido = quantidadeNumerica * precoAtual;
        calculoSaldo += valorInvestido;

        if (precoAtual > 0 || nomeTratado === 'BRL') {
          const varAtivo = (Math.random() * 5 - 2).toFixed(2); // Mantendo a simulação
          somaVariacoes += parseFloat(varAtivo);
          
          listaAtivos.push({
            id: doco.id, sigla: siglaPadrao || '?', quantidade: quantidadeNumerica, precoAtual, valorInvestido, corIcone, tipo, iconeDisplay, bandeira,
            variacao: varAtivo
          });
        }
      });

      listaAtivos.sort((a, b) => b.valorInvestido - a.valorInvestido);
      setMeusAtivos(listaAtivos);
      setSaldoTotal(calculoSaldo);

      // CÁLCULO DINÂMICO DA VARIAÇÃO DA CARTEIRA
      if (listaAtivos.length > 0) {
        setVariacaoCarteira((somaVariacoes / listaAtivos.length).toFixed(2));
      } else {
        setVariacaoCarteira(0);
      }

    } catch (error) {
      console.error("Erro ao sincronizar dados:", error);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (isFocused) {
      setCarregando(true);
      carregarDadosDoApp();
    }
  }, [isFocused]);

  const excluirAtivo = (id, sigla) => {
    if (Platform.OS === 'web') {
      const confirma = window.confirm(`Tem certeza que deseja remover ${sigla} da sua carteira?`);
      if (confirma) deletarDoFirebase(id);
    } else {
      Alert.alert(
        'Remover Ativo',
        `Tem certeza que deseja remover ${sigla}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sim, Remover', style: 'destructive', onPress: () => deletarDoFirebase(id) }
        ]
      );
    }
  };

  const deletarDoFirebase = async (id) => {
    try {
      setCarregando(true);
      await deleteDoc(doc(db, "ativos", id));
      await carregarDadosDoApp();
    } catch (error) {
      console.error("Erro ao deletar:", error);
      Alert.alert('Erro', 'Não foi possível remover o ativo.');
      setCarregando(false);
    }
  };

  const editarAtivo = async (id, quantidadeAtual) => {
    if (Platform.OS === 'web') {
      const novaQtd = window.prompt("Digite a nova quantidade:", quantidadeAtual);
      if (novaQtd !== null && novaQtd.trim() !== '') {
        salvarEdicao(id, novaQtd);
      }
    } else if (Platform.OS === 'ios') {
      Alert.prompt(
        "Editar Quantidade", "Digite a nova quantidade:",
        [ { text: "Cancelar", style: "cancel" }, { text: "Salvar", onPress: (novaQtd) => salvarEdicao(id, novaQtd) } ],
        'plain-text', quantidadeAtual.toString()
      );
    } else {
      Alert.alert("Aviso", "Edição nativa disponível em breve.");
    }
  };

  const salvarEdicao = async (id, novaQtd) => {
    try {
      setCarregando(true);
      const ativoRef = doc(db, "ativos", id);
      await updateDoc(ativoRef, { quantidade: parseFloat(novaQtd.replace(',', '.')) });
      alert("Sucesso! Quantidade atualizada.");
      await carregarDadosDoApp();
    } catch (error) {
      alert("Erro ao editar.");
      setCarregando(false);
    }
  };

  const ativosCrypto = meusAtivos.filter(a => a.tipo === 'crypto');
  const ativosMoeda = meusAtivos.filter(a => a.tipo === 'moeda');
  const nomeUsuario = auth.currentUser?.displayName ? auth.currentUser.displayName.split(' ')[0] : 'Investidor';

  const renderItemAtivo = (ativo) => {
    const varNum = parseFloat(ativo.variacao) || 0;
    const corVar = varNum >= 0 ? '#32cd32' : '#ff4444';
    const corDoTextoIcone = ativo.sigla === 'BTC' ? '#000' : '#FFF';

    return (
      <View key={ativo.id} style={estilos.linhaAtivo}>
        <View style={estilos.ativoEsquerda}>
          <View style={[estilos.circuloIcone, { backgroundColor: ativo.corIcone }]}>
            <Text style={[estilos.textoIcone, { color: corDoTextoIcone }]}>
              {ativo.iconeDisplay || (ativo.sigla ? ativo.sigla.charAt(0) : '?')}
            </Text>
          </View>
          <View>
            <Text style={estilos.ativoNome}>{ativo.tipo === 'moeda' ? `${ativo.bandeira} ` : ''}{ativo.sigla}</Text>
            <Text style={estilos.ativoQtd}>{ativo.quantidade} unid.</Text>
          </View>
        </View>

        <View style={estilos.ativoDireita}>
          <Text style={estilos.ativoValor}>
            {ocultarSaldo ? 'R$ •••••' : `R$ ${Number(ativo.valorInvestido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          </Text>
          <View style={estilos.linhaPreco}>
            <Text style={[estilos.textoVar, { color: corVar }]}>
              {varNum >= 0 ? '+' : ''}{ativo.variacao}%
            </Text>
          </View>
        </View>

        <View style={estilos.botoesAcao}>
          <TouchableOpacity style={estilos.btnEditar} onPress={() => editarAtivo(ativo.id, ativo.quantidade)}>
            <Text style={{ fontSize: 14, color: '#FFF' }}>✎</Text>
          </TouchableOpacity>
          <TouchableOpacity style={estilos.btnExcluir} onPress={() => excluirAtivo(ativo.id, ativo.sigla)}>
            <Text style={{ fontSize: 14, color: '#FFF' }}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (carregando) {
    return <View style={estilos.carregando}><ActivityIndicator size="large" color="#32cd32" /></View>;
  }

  return (
    <ScrollView style={estilos.fundo} showsVerticalScrollIndicator={false}>
      <View style={estilos.boxPatrimonio}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={estilos.labelTopo}>Olá, {nomeUsuario} • Seu Saldo</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Perfil')}>
            <Text style={{ color: '#32cd32', fontWeight: 'bold' }}>⚙️ Perfil</Text>
          </TouchableOpacity>
        </View>
        
        {/* Adicionado o TouchableOpacity para Ocultar/Mostrar saldo */}
        <TouchableOpacity style={estilos.linhaSaldo} onPress={() => setOcultarSaldo(!ocultarSaldo)}>
          <Text style={estilos.totalText}>
            {ocultarSaldo ? 'R$ •••••••' : `R$ ${Number(saldoTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </Text>
          <View style={[estilos.badge, { backgroundColor: isAlta ? 'rgba(50,205,50,0.1)' : 'rgba(255,68,68,0.1)' }]}>
             <Text style={[estilos.badgeText, { color: corTendencia }]}>
               {isAlta ? '+' : ''}{variacaoCarteira}%
             </Text>
          </View>
        </TouchableOpacity>
        <Text style={estilos.dicaOcultar}>Toque no saldo para {ocultarSaldo ? 'mostrar' : 'ocultar'}</Text>
      </View>

      <View style={estilos.sessaoGeral}>
        <Text style={estilos.tituloSessao}>Mercado Hoje</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={estilos.scrollCota}>
          {cotacoesDia.map((moeda) => {
            const altaMoeda = (moeda.variacao || 0) >= 0;
            return (
              <View key={moeda.id} style={estilos.cardCotacao}>
                <View style={estilos.topoCardCotacao}>
                  <Text style={estilos.siglaCotacao}>{moeda.sigla}</Text>
                  <Text style={[estilos.varCotacao, { color: altaMoeda ? '#32cd32' : '#ff4444' }]}>
                    {altaMoeda ? '+' : ''}{Number(moeda.variacao || 0).toFixed(2)}%
                  </Text>
                </View>
                <Text style={estilos.precoCotacao}>R$ {Number(moeda.preco || 0).toLocaleString('pt-BR')}</Text>
                
                {moeda.grafico && moeda.grafico.length > 2 && (
                  <View style={{ marginTop: 10 }}>
                    <LineChart
                      data={{ datasets: [{ data: moeda.grafico }] }}
                      width={120} height={40} withDots={false} withInnerLines={false} withOuterLines={false} withHorizontalLabels={false} withVerticalLabels={false}
                      chartConfig={{ backgroundColor: '#0a0a0c', backgroundGradientFrom: '#0a0a0c', backgroundGradientTo: '#0a0a0c', color: () => altaMoeda ? '#32cd32' : '#ff4444', strokeWidth: 2 }}
                      bezier style={{ paddingRight: 0, paddingTop: 0, paddingBottom: 0 }}
                    />
                  </View>
                )}
              </View>
            )
          })}
        </ScrollView>
      </View>

      <View style={estilos.boxCategoria}>
        <View style={estilos.cabecalhoBox}>
          <Text style={estilos.tituloSessao}>Criptomoedas</Text>
        </View>
        {ativosCrypto.length === 0 ? (
          <Text style={estilos.textoVazio}>Nenhuma cripto adicionada.</Text>
        ) : (
          ativosCrypto.map(renderItemAtivo)
        )}
      </View>

      <View style={estilos.boxCategoria}>
        <View style={estilos.cabecalhoBox}>
          <Text style={estilos.tituloSessao}>Moedas</Text>
        </View>
        {ativosMoeda.length === 0 ? (
          <Text style={estilos.textoVazio}>Nenhuma moeda adicionada.</Text>
        ) : (
          ativosMoeda.map(renderItemAtivo)
        )}
      </View>

      <TouchableOpacity style={estilos.botaoAcao} onPress={() => navigation.navigate('Adicionar')}>
        <Text style={estilos.textoBotaoAcao}>+ Cadastrar Operação</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: '#000' }, 
  carregando: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  boxPatrimonio: { padding: 25, paddingTop: 50, paddingBottom: 15 },
  labelTopo: { color: '#888', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600' },
  linhaSaldo: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  totalText: { color: '#FFF', fontSize: 38, fontWeight: 'bold' },
  badge: { marginLeft: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontWeight: 'bold', fontSize: 13 },
  dicaOcultar: { color: '#444', fontSize: 11, marginTop: 5, fontStyle: 'italic' },
  
  sessaoGeral: { paddingLeft: 20, marginBottom: 25, marginTop: 10 },
  tituloSessao: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 15 },
  scrollCota: { overflow: 'visible' },
  cardCotacao: { backgroundColor: '#0a0a0c', padding: 15, borderRadius: 20, marginRight: 15, width: 150 },
  topoCardCotacao: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  siglaCotacao: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  varCotacao: { fontSize: 12, fontWeight: 'bold' },
  precoCotacao: { color: '#888', fontSize: 13 },
  
  boxCategoria: { backgroundColor: '#0a0a0c', marginHorizontal: 20, borderRadius: 24, padding: 20, marginBottom: 20 },
  cabecalhoBox: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  textoVazio: { color: '#444', fontStyle: 'italic', paddingBottom: 10 },
  
  /* AQUI ESTÁ A CORREÇÃO MÁGICA DO LAYOUT DOS BOTÕES E TEXTOS */
  linhaAtivo: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderColor: '#1a1a1c' },
  ativoEsquerda: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  circuloIcone: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  textoIcone: { fontWeight: 'bold', fontSize: 20 },
  ativoNome: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  ativoQtd: { color: '#666', fontSize: 13 },
  
  ativoDireita: { alignItems: 'flex-end', marginRight: 15 },
  ativoValor: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  linhaPreco: { flexDirection: 'row', alignItems: 'center' },
  textoVar: { fontWeight: 'bold', fontSize: 12 },
  
  /* NOVOS ESTILOS PARA OS BOTÕES REDONDOS VERDE E VERMELHO */
  botoesAcao: { flexDirection: 'row', alignItems: 'center' },
  btnEditar: { backgroundColor: '#32cd32', width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  btnExcluir: { backgroundColor: '#ff4444', width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },

  botaoAcao: { marginHorizontal: 20, backgroundColor: '#0a0a0c', padding: 20, borderRadius: 24, alignItems: 'center', marginBottom: 50 },
  textoBotaoAcao: { color: '#32cd32', fontWeight: 'bold', fontSize: 16 }
});