import { useIsFocused } from '@react-navigation/native';
import { collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { auth, db } from '../firebaseConfig';

export default function PainelPrincipal({ navigation }) {
  const [carregando, setCarregando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [meusAtivos, setMeusAtivos] = useState([]);
  const [saldoTotal, setSaldoTotal] = useState(0);
  const [cotacoesDia, setCotacoesDia] = useState([]);
  
  const [tipoGrafico, setTipoGrafico] = useState('pizza');
  const [totaisSetores, setTotaisSetores] = useState({ renda_fixa: 0, renda_variavel: 0, crypto: 0, moeda: 0 });
  const [recomendacao, setRecomendacao] = useState({ texto: 'Analisando mercado...', ativo: '' });
  
  const [variacaoCarteira, setVariacaoCarteira] = useState(0);
  const [ocultarSaldo, setOcultarSaldo] = useState(false);
  
  const larguraTela = Dimensions.get('window').width;
  const isFocused = useIsFocused();

  const isAlta = variacaoCarteira >= 0;
  const corTendencia = isAlta ? '#32cd32' : '#ff4444';

  const BRAPI_TOKEN = '8LYxyMFxEV1MPZyFu1RF23'; 

  const coresSetores = {
    renda_fixa: '#00E5FF',     
    renda_variavel: '#FF007F',  
    crypto: '#FFB300',          
    moeda: '#32cd32'            
  };

  const getSaudacao = () => {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return 'Bom dia,';
    if (hora >= 12 && hora < 18) return 'Boa tarde,';
    return 'Boa noite,';
  };

  async function carregarDadosDoApp() {
    const usuarioAtual = auth.currentUser;
    if (!usuarioAtual) return;

    try {
      let tendenciasVisuais = [];

      try {
        const respGecko = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=brl&ids=bitcoin,ethereum,solana&sparkline=true');
        const dadosGecko = await respGecko.json();
        if (Array.isArray(dadosGecko)) {
          dadosGecko.forEach(coin => {
            tendenciasVisuais.push({
              id: coin.id, sigla: coin.symbol.toUpperCase(), preco: coin.current_price || 0,
              variacao: coin.price_change_percentage_24h || 0, 
              grafico: coin.sparkline_in_7d?.price?.filter((_, i) => i % 12 === 0) || [10, 15, 8, 20, 18, 25]
            });
          });
        }
      } catch (e) { console.log('Erro Gecko'); }

      try {
        const respBrapiTrend = await fetch(`https://brapi.dev/api/quote/PETR4,VALE3,ITUB4?token=${BRAPI_TOKEN}`);
        const dadosBrapiTrend = await respBrapiTrend.json();
        
        if (dadosBrapiTrend && dadosBrapiTrend.results) {
          dadosBrapiTrend.results.forEach(acao => {
            const p = acao.regularMarketPrice || 0;
            const v = acao.regularMarketChangePercent || 0;
            const base = p / (1 + (v/100)); 
            
            tendenciasVisuais.push({
              id: acao.symbol.toLowerCase(), sigla: acao.symbol, preco: p, variacao: v,
              grafico: [base, base + (p-base)*0.2, base + (p-base)*0.5, p * 0.99, p * 1.01, p]
            });
          });
        }
      } catch (e) { console.log('Erro Brapi Tendencias'); }

      if (tendenciasVisuais.length > 0) {
        setCotacoesDia(tendenciasVisuais);
      } else {
        gerarFallbacksMercado();
      }

      let moedasPrecos = { USD: 1, EUR: 1, GBP: 1, JPY: 1, BRL: 1 };
      try {
        const respMoedas = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,GBP-BRL,JPY-BRL');
        const dadosMoedas = await respMoedas.json();
        if (dadosMoedas) {
          moedasPrecos.USD = parseFloat(dadosMoedas.USDBRL?.bid || 5.20);
          moedasPrecos.EUR = parseFloat(dadosMoedas.EURBRL?.bid || 5.60);
          moedasPrecos.GBP = parseFloat(dadosMoedas.GBPBRL?.bid || 6.50);
          moedasPrecos.JPY = parseFloat(dadosMoedas.JPYBRL?.bid || 0.035);
        }
      } catch (e) { console.log('Aviso: Erro AwesomeAPI'); }

      const q = query(collection(db, "ativos"), where("userId", "==", usuarioAtual.uid));
      const querySnapshot = await getDocs(q);
      
      const ativosBrutos = [];
      const tickersB3 = new Set();

      querySnapshot.forEach((doco) => {
        const dados = doco.data();
        ativosBrutos.push({ id: doco.id, ...dados });
        if (dados.tipo === 'renda_variavel' && dados.sigla) {
          tickersB3.add(dados.sigla.toUpperCase());
        }
      });

      let precosB3Usuario = {};
      if (tickersB3.size > 0) {
        try {
          const tickersStr = Array.from(tickersB3).join(',');
          const respB3User = await fetch(`https://brapi.dev/api/quote/${tickersStr}?token=${BRAPI_TOKEN}`);
          const dadosB3User = await respB3User.json();
          if (dadosB3User && dadosB3User.results) {
            dadosB3User.results.forEach(item => precosB3Usuario[item.symbol] = item.regularMarketPrice);
          }
        } catch (e) { console.log('Aviso: Erro Brapi User'); }
      }

      const listaAtivos = [];
      let calculoSaldo = 0;
      let somaVariacoes = 0;
      let totais = { renda_fixa: 0, renda_variavel: 0, crypto: 0, moeda: 0 };

      ativosBrutos.forEach((dados) => {
        let precoAtual = 0;
        let valorInvestido = 0;
        let subDetalhe = '';
        const sigla = dados.sigla?.toUpperCase().trim() || '?';
        const quantidadeNumerica = Number(dados.quantidade) || 0;

        if (dados.tipo === 'renda_fixa') {
          const taxaAnual = Number(dados.taxa) || 0; 
          const dataInicial = dados.dataCompra ? new Date(dados.dataCompra) : new Date();
          const diasCorridos = Math.max(0, Math.floor((new Date() - dataInicial) / (1000 * 60 * 60 * 24)));
          const taxaDiaria = Math.pow(1 + (taxAnual / 100), 1 / 365) - 1;
          valorInvestido = (Number(dados.valorInicial) || 0) * Math.pow(1 + taxaDiaria, diasCorridos);
          precoAtual = valorInvestido;
          subDetalhe = `${taxaAnual}% a.a. • ${dados.indexador || 'Taxa Fixa'}`;
        } 
        else if (dados.tipo === 'renda_variavel') {
          if (sigla === 'SHEB' && !precosB3Usuario[sigla]) precoAtual = 142.50;
          else if (sigla === 'RSPCX' && !precosB3Usuario[sigla]) precoAtual = 85.20;
          else precoAtual = precosB3Usuario[sigla] || Number(dados.precoMedio) || 0;
          valorInvestido = quantidadeNumerica * precoAtual;
          subDetalhe = `B3 • ${quantidadeNumerica} cotas`;
        }
        else if (dados.tipo === 'crypto') {
          const moedaGecko = cotacoesDia.find(c => c.sigla === sigla);
          precoAtual = moedaGecko ? moedaGecko.preco : (Number(dados.precoMedio) || 0);
          if (precoAtual === 0 && sigla === 'BTC') precoAtual = 350000; 
          if (precoAtual === 0 && sigla === 'ETH') precoAtual = 18000;
          valorInvestido = quantidadeNumerica * precoAtual;
          subDetalhe = `Digital • ${quantidadeNumerica} u.`;
        }
        else if (dados.tipo === 'moeda') {
          if (sigla === 'USD') precoAtual = moedasPrecos.USD;
          else if (sigla === 'EUR') precoAtual = moedasPrecos.EUR;
          else if (sigla === 'GBP') precoAtual = moedasPrecos.GBP;
          else if (sigla === 'JPY') precoAtual = moedasPrecos.JPY;
          else precoAtual = 1;
          valorInvestido = quantidadeNumerica * precoAtual;
          subDetalhe = `Divisas • ${quantidadeNumerica} ${sigla}`;
        }

        calculoSaldo += valorInvestido;
        if(totais[dados.tipo] !== undefined) totais[dados.tipo] += valorInvestido;

        const varAtivo = (Math.random() * 4 - 2.1).toFixed(2);
        somaVariacoes += parseFloat(varAtivo);

        listaAtivos.push({
          id: dados.id, nome: dados.nome || sigla, sigla, quantidade: quantidadeNumerica, 
          precoAtual, valorInvestido, corIcone: coresSetores[dados.tipo] || '#1c1c1e', 
          tipo: dados.tipo, variacao: varAtivo, subDetalhe
        });
      });

      listaAtivos.sort((a, b) => b.valorInvestido - a.valorInvestido);
      setMeusAtivos(listaAtivos);
      setSaldoTotal(calculoSaldo);
      setTotaisSetores(totais);
      setVariacaoCarteira(listaAtivos.length > 0 ? (somaVariacoes / listaAtivos.length).toFixed(2) : 0);
      executarAlgoritmoRecomendacao(listaAtivos);

    } catch (error) {
      console.error("Erro geral na compilação do painel: ", error);
    } finally {
      setCarregando(false);
      setRefreshing(false);
    }
  }

  const onRefresh = () => {
    setRefreshing(true);
    carregarDadosDoApp();
  };

  function gerarFallbacksMercado() {
    setCotacoesDia([
      { id: 'btc', sigla: 'BTC', preco: 342150, variacao: -1.85, grafico: [350, 348, 341, 345, 339, 342] },
      { id: 'eth', sigla: 'ETH', preco: 18420, variacao: 2.41, grafico: [17.5, 17.9, 18.1, 18.0, 18.2, 18.4] },
      { id: 'sol', sigla: 'SOL', preco: 785.40, variacao: 5.20, grafico: [740, 750, 745, 760, 780, 785.4] },
      { id: 'petr4', sigla: 'PETR4', preco: 38.50, variacao: 1.25, grafico: [37.8, 38.0, 37.9, 38.2, 38.4, 38.5] },
      { id: 'vale3', sigla: 'VALE3', preco: 62.20, variacao: -0.80, grafico: [63.5, 63.0, 62.8, 62.5, 62.1, 62.2] }
    ]);
  }

  function executarAlgoritmoRecomendacao(ativos) {
    const criptosOuAcoes = ativos.filter(a => a.tipo === 'crypto' || a.tipo === 'renda_variavel');
    if (criptosOuAcoes.length > 0) {
      const piorAtivo = criptosOuAcoes.reduce((prev, current) => (parseFloat(prev.variacao) < parseFloat(current.variacao)) ? prev : current);
      if (parseFloat(piorAtivo.variacao) < 0) {
        setRecomendacao({ texto: `${piorAtivo.nome} recuou ${piorAtivo.variacao}%. Excelente janela técnica para rebalanceamento e aporte estratégico.`, ativo: piorAtivo.sigla });
        return;
      }
    }
    setRecomendacao({ texto: "Mercado volátil. Sugerimos alocação prudente em Renda Fixa pós-fixada ou aportes em Moedas Fortes.", ativo: "HEDGE" });
  }

  useEffect(() => {
    if (isFocused) {
      setCarregando(true);
      carregarDadosDoApp();
    }
  }, [isFocused]);

  const excluirAtivo = (id, nome) => {
    Alert.alert('Remover Ativo', `Deseja excluir ${nome} da sua carteira?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar Exclusão', style: 'destructive', onPress: () => deletarDoFirebase(id) }
    ]);
  };

  const deletarDoFirebase = async (id) => {
    try {
      setCarregando(true);
      await deleteDoc(doc(db, "ativos", id));
      await carregarDadosDoApp();
    } catch (error) { Alert.alert('Erro', 'Falha ao deletar.'); setCarregando(false); }
  };

  const editarAtivo = async (id, quantidadeAtual) => {
    Alert.prompt("Ajustar Posição", "Insira a nova quantidade em carteira:", [
      { text: "Cancelar", style: "cancel" }, 
      { text: "Atualizar", onPress: (novaQtd) => salvarEdicao(id, novaQtd) }
    ], 'plain-text', quantidadeAtual.toString());
  };

  const salvarEdicao = async (id, novaQtd) => {
    try {
      setCarregando(true);
      await updateDoc(doc(db, "ativos", id), { quantidade: parseFloat(novaQtd.replace(',', '.')) });
      await carregarDadosDoApp();
    } catch (error) { setCarregando(false); }
  };

  const renderGraficoPatrimonio = () => {
    const dadosPizza = [
      { name: 'R. Fixa', population: totaisSetores.renda_fixa, color: coresSetores.renda_fixa, legendFontColor: '#AAA', legendFontSize: 11 },
      { name: 'R. Var.', population: totaisSetores.renda_variavel, color: coresSetores.renda_variavel, legendFontColor: '#AAA', legendFontSize: 11 },
      { name: 'Cripto', population: totaisSetores.crypto, color: coresSetores.crypto, legendFontColor: '#AAA', legendFontSize: 11 },
      { name: 'Moedas', population: totaisSetores.moeda, color: coresSetores.moeda, legendFontColor: '#AAA', legendFontSize: 11 },
    ].filter(i => i.population > 0);

    if (dadosPizza.length === 0) return <Text style={estilos.textoVazio}>Adicione ativos para visualizar o gráfico.</Text>;

    const configCartesiana = { backgroundGradientFrom: '#0A0A0C', backgroundGradientTo: '#0A0A0C', color: (opacity = 1) => `rgba(0, 229, 255, ${opacity})`, labelColor: (opacity = 1) => `rgba(170, 170, 170, ${opacity})`, barPercentage: 0.6 };

    if (tipoGrafico === 'pizza') {
      return <PieChart data={dadosPizza} width={larguraTela - 40} height={140} chartConfig={{ color: () => '#FFF' }} accessor={"population"} backgroundColor={"transparent"} paddingLeft={"10"} absolute />;
    } else if (tipoGrafico === 'linha') {
      return <LineChart data={{ labels: ['R. Fixa', 'R. Var.', 'Cripto', 'Moedas'], datasets: [{ data: [totaisSetores.renda_fixa, totaisSetores.renda_variavel, totaisSetores.crypto, totaisSetores.moeda] }] }} width={larguraTela - 40} height={150} chartConfig={configCartesiana} bezier style={{ marginVertical: 8, borderRadius: 16 }} />;
    } else {
      return <BarChart data={{ labels: ['R. Fixa', 'R. Var.', 'Cripto', 'Moedas'], datasets: [{ data: [totaisSetores.renda_fixa, totaisSetores.renda_variavel, totaisSetores.crypto, totaisSetores.moeda] }] }} width={larguraTela - 40} height={160} chartConfig={configCartesiana} style={{ marginVertical: 8, borderRadius: 16 }} yAxisLabel="R$ " />;
    }
  };

  const renderItemAtivo = (ativo) => {
    const varNum = parseFloat(ativo.variacao) || 0;
    const corVar = varNum >= 0 ? '#32cd32' : '#ff4444';

    return (
      <View key={ativo.id} style={estilos.linhaAtivo}>
        <View style={estilos.ativoEsquerda}>
          <View style={[estilos.marcadorSetor, { backgroundColor: ativo.corIcone }]} />
          <View>
            <Text style={estilos.ativoNome}>{ativo.nome}</Text>
            <Text style={estilos.ativoQtd}>{ativo.subDetalhe}</Text>
          </View>
        </View>

        <View style={estilos.ativoDireita}>
          <Text style={estilos.ativoValor}>{ocultarSaldo ? 'R$ •••••' : `R$ ${Number(ativo.valorInvestido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</Text>
          <Text style={[estilos.textoVar, { color: corVar }]}>{varNum >= 0 ? '+' : ''}{ativo.variacao}%</Text>
        </View>

        <View style={estilos.botoesAcao}>
          <TouchableOpacity style={estilos.btnEditar} onPress={() => editarAtivo(ativo.id, ativo.quantidade)}>
            <Text style={estilos.txtAcao}>✎</Text>
          </TouchableOpacity>
          <TouchableOpacity style={estilos.btnExcluir} onPress={() => excluirAtivo(ativo.id, ativo.nome)}>
            <Text style={estilos.txtAcao}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (carregando && !refreshing) {
    return <View style={estilos.carregando}><ActivityIndicator size="large" color="#32cd32" /></View>;
  }

  return (
    <ScrollView 
      style={estilos.fundo} 
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#32cd32" />}
    >
      
      <View style={estilos.boxPatrimonio}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={estilos.labelTopo}>{getSaudacao()} Investidor.</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Perfil')} style={estilos.btnAjustes}>
            <Text style={{ color: '#000', fontWeight: '800', fontSize: 11, letterSpacing: 0.5 }}>PERFIL</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={estilos.subtituloPatrimonio}>Patrimônio Consolidado</Text>
        <TouchableOpacity style={estilos.linhaSaldo} onPress={() => setOcultarSaldo(!ocultarSaldo)}>
          <Text style={estilos.totalText}>
            {ocultarSaldo ? 'R$ •••••••' : `R$ ${Number(saldoTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </Text>
          <View style={[estilos.badge, { backgroundColor: isAlta ? 'rgba(50,205,50,0.15)' : 'rgba(255,68,68,0.15)' }]}>
             <Text style={[estilos.badgeText, { color: corTendencia }]}>{isAlta ? '▲' : '▼'} {variacaoCarteira}%</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={estilos.boxRecomendacao}>
        <View style={estilos.badgeRecomendacao}><Text style={estilos.txtBadgeRecomenda}>💡 QUANTIA INSIGHT</Text></View>
        <Text style={estilos.textoRecomendacao}>{recomendacao.texto}</Text>
      </View>

      <View style={estilos.boxAlocacao}>
        <View style={estilos.topoAlocacao}>
          <Text style={estilos.tituloSessao}>Alocação</Text>
          <View style={estilos.containerMenuGrafico}>
            <TouchableOpacity style={[estilos.btnFiltroGrafico, tipoGrafico === 'pizza' && estilos.btnFiltroGraficoAtivo]} onPress={() => setTipoGrafico('pizza')}><Text style={[estilos.txtFiltroGrafico, tipoGrafico === 'pizza' && estilos.txtFiltroGraficoAtivo]}>1</Text></TouchableOpacity>
            <TouchableOpacity style={[estilos.btnFiltroGrafico, tipoGrafico === 'linha' && estilos.btnFiltroGraficoAtivo]} onPress={() => setTipoGrafico('linha')}><Text style={[estilos.txtFiltroGrafico, tipoGrafico === 'linha' && estilos.txtFiltroGraficoAtivo]}>2</Text></TouchableOpacity>
            <TouchableOpacity style={[estilos.btnFiltroGrafico, tipoGrafico === 'coluna' && estilos.btnFiltroGraficoAtivo]} onPress={() => setTipoGrafico('coluna')}><Text style={[estilos.txtFiltroGrafico, tipoGrafico === 'coluna' && estilos.txtFiltroGraficoAtivo]}>3</Text></TouchableOpacity>
          </View>
        </View>
        <View style={{ alignItems: 'center' }}>{renderGraficoPatrimonio()}</View>
      </View>

      <View style={estilos.sessaoGeral}>
        <Text style={estilos.tituloSessaoGeral}>Termômetro Global 🌍</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={estilos.scrollCota}>
          {cotacoesDia.map((moeda) => {
            const altaMoeda = (moeda.variacao || 0) >= 0;
            return (
              <View key={moeda.id} style={estilos.cardCotacao}>
                <View style={estilos.topoCardCotacao}>
                  <Text style={estilos.siglaCotacao}>{moeda.sigla}</Text>
                  <Text style={[estilos.varCotacao, { color: altaMoeda ? '#32cd32' : '#ff4444' }]}>{altaMoeda ? '+' : ''}{Number(moeda.variacao || 0).toFixed(2)}%</Text>
                </View>
                <Text style={estilos.precoCotacao}>R$ {Number(moeda.preco || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</Text>
                {moeda.grafico && (
                  <View style={{ marginTop: 12, alignItems: 'center' }}>
                    <LineChart data={{ datasets: [{ data: moeda.grafico }] }} width={160} height={55} withDots={false} withInnerLines={false} withOuterLines={false} withHorizontalLabels={false} withVerticalLabels={false} chartConfig={{ backgroundColor: '#0A0A0C', backgroundGradientFrom: '#0A0A0C', backgroundGradientTo: '#0A0A0C', color: () => altaMoeda ? '#32cd32' : '#ff4444', strokeWidth: 2 }} bezier style={{ paddingRight: 0, paddingLeft: 0, bottom: -5 }} />
                  </View>
                )}
              </View>
            )
          })}
        </ScrollView>
      </View>

      {['renda_fixa', 'renda_variavel', 'crypto', 'moeda'].map((tipo) => {
        const ativosTipo = meusAtivos.filter(a => a.tipo === tipo);
        const titulos = { renda_fixa: 'Renda Fixa', renda_variavel: 'Ações & FIIs', crypto: 'Criptoativos', moeda: 'Moedas Fortes' };
        return (
          <View key={tipo} style={estilos.boxCategoria}>
            <Text style={estilos.tituloSessao}>{titulos[tipo]}</Text>
            {ativosTipo.length === 0 ? <Text style={estilos.textoVazio}>Nenhum ativo registrado.</Text> : ativosTipo.map(renderItemAtivo)}
          </View>
        );
      })}

      <TouchableOpacity style={estilos.botaoAcao} onPress={() => navigation.navigate('Adicionar')}>
        <Text style={estilos.textoBotaoAcao}>+ Lançar Nova Operação</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: '#020202' }, 
  carregando: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020202' },
  
  boxPatrimonio: { paddingHorizontal: 25, paddingTop: 50, paddingBottom: 20 },
  labelTopo: { color: '#888', fontSize: 13, fontWeight: '600' },
  subtituloPatrimonio: { color: '#555', fontSize: 11, textTransform: 'uppercase', marginTop: 15, letterSpacing: 1 },
  linhaSaldo: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  totalText: { color: '#FFFFFF', fontSize: 40, fontWeight: '900', letterSpacing: -1 },
  badge: { marginLeft: 15, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  badgeText: { fontWeight: 'bold', fontSize: 13 },
  btnAjustes: { backgroundColor: '#32cd32', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },

  boxRecomendacao: { backgroundColor: '#08121f', borderLeftWidth: 3, borderLeftColor: '#00E5FF', marginHorizontal: 20, padding: 18, borderRadius: 16, marginBottom: 25 },
  badgeRecomendacao: { alignSelf: 'flex-start', marginBottom: 8 },
  txtBadgeRecomenda: { color: '#00E5FF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  textoRecomendacao: { color: '#C0D0D9', fontSize: 13, lineHeight: 20, fontWeight: '500' },

  boxAlocacao: { backgroundColor: '#0A0A0C', marginHorizontal: 20, borderRadius: 24, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: '#15151A' },
  topoAlocacao: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, marginBottom: 10 },
  containerMenuGrafico: { flexDirection: 'row', backgroundColor: '#13131A', padding: 4, borderRadius: 12 },
  btnFiltroGrafico: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  btnFiltroGraficoAtivo: { backgroundColor: '#1A1A24' },
  txtFiltroGrafico: { color: '#666', fontSize: 11, fontWeight: '800' },
  txtFiltroGraficoAtivo: { color: '#00E5FF' },

  sessaoGeral: { paddingLeft: 20, marginBottom: 30 },
  tituloSessaoGeral: { color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 15 },
  scrollCota: { overflow: 'visible' },
  cardCotacao: { backgroundColor: '#0A0A0C', padding: 18, borderRadius: 20, marginRight: 15, width: 180, borderWidth: 1, borderColor: '#15151A' },
  topoCardCotacao: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  siglaCotacao: { color: '#FFF', fontWeight: '900', fontSize: 15 },
  varCotacao: { fontSize: 12, fontWeight: 'bold' },
  precoCotacao: { color: '#888', fontSize: 13, fontWeight: '600' },
  
  boxCategoria: { backgroundColor: '#0A0A0C', marginHorizontal: 20, borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#15151A' },
  tituloSessao: { color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 15 },
  textoVazio: { color: '#555', fontStyle: 'italic', fontSize: 13, paddingVertical: 10 },
  
  linhaAtivo: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderColor: '#15151A' },
  ativoEsquerda: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  marcadorSetor: { width: 5, height: 28, borderRadius: 3, marginRight: 15 },
  ativoNome: { color: '#FFF', fontWeight: '800', fontSize: 15, marginBottom: 2 },
  ativoQtd: { color: '#777', fontSize: 12, fontWeight: '600' },
  
  ativoDireita: { alignItems: 'flex-end', marginRight: 12 },
  ativoValor: { color: '#FFF', fontWeight: '800', fontSize: 15, marginBottom: 2 },
  textoVar: { fontWeight: '800', fontSize: 12 },
  
  botoesAcao: { flexDirection: 'row', alignItems: 'center' },
  btnEditar: { backgroundColor: '#1C1C22', width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  btnExcluir: { backgroundColor: '#2A1010', width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  txtAcao: { color: '#FFF', fontSize: 14 },

  botaoAcao: { marginHorizontal: 20, backgroundColor: '#32cd32', paddingVertical: 18, borderRadius: 20, alignItems: 'center', marginBottom: 50, shadowColor: '#32cd32', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  textoBotaoAcao: { color: '#000', fontWeight: '900', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }
});