import { useIsFocused } from '@react-navigation/native';
import { collection, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { db } from '../firebaseConfig';
import { buscarCotacoes } from '../servicos/apiCotacoes';

export default function PainelPrincipal({ navigation }) {
  const [carregando, setCarregando] = useState(true);
  const [meusAtivos, setMeusAtivos] = useState([]);
  const [saldoTotal, setSaldoTotal] = useState(0);
  const [cotacoesDia, setCotacoesDia] = useState([]);
  const larguraTela = Dimensions.get('window').width;
  const isFocused = useIsFocused();

  const variacaoCarteira = +2.45;
  const isAlta = variacaoCarteira >= 0;
  const corTendencia = isAlta ? '#32cd32' : '#ff4444';

  useEffect(() => {
    async function carregarDadosDoApp() {
      if (!isFocused) return;

      try {
        const precosMercado = await buscarCotacoes();
        
        try {
          const respGecko = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=brl&order=volume_desc&per_page=5&page=1&sparkline=true');
          const dadosGecko = await respGecko.json();
          
          const formatadosGecko = dadosGecko.map(coin => ({
            id: coin.id,
            sigla: coin.symbol.toUpperCase(),
            preco: coin.current_price,
            variacao: coin.price_change_percentage_24h,
            grafico: coin.sparkline_in_7d.price.filter((_, i) => i % 24 === 0)
          }));
          setCotacoesDia(formatadosGecko);
        } catch (e) {
          console.log('Aviso: Não foi possível carregar a API CoinGecko', e);
        }

        const querySnapshot = await getDocs(collection(db, "ativos"));
        const listaAtivos = [];
        let calculoSaldo = 0;

        querySnapshot.forEach((doc) => {
          const dados = doc.data();
          let precoAtual = 0;
          let siglaPadrao = '';
          let corIcone = '#1c1c1e';
          let tipo = 'outro';
          let iconeDisplay = '';
          let bandeira = '';

          const nomeTratado = dados.nome.toUpperCase().trim();

          
          if (nomeTratado === 'BTC' || nomeTratado === 'BITCOIN') {
            precoAtual = precosMercado?.bitcoin || 0;
            siglaPadrao = 'BTC';
            corIcone = '#F7931A'; 
            tipo = 'crypto';
            iconeDisplay = '₿';
          } else if (nomeTratado === 'ETH' || nomeTratado === 'ETHEREUM') {
            precoAtual = precosMercado?.ethereum || 0;
            siglaPadrao = 'ETH';
            corIcone = '#627EEA';
            tipo = 'crypto';
            iconeDisplay = 'Ξ';
          } else if (nomeTratado === 'USD' || nomeTratado === 'DOLAR' || nomeTratado === 'DÓLAR') {
            precoAtual = precosMercado?.dolar || 0;
            siglaPadrao = 'USD';
            corIcone = '#2e8b57'; 
            tipo = 'moeda';
            iconeDisplay = '$';
            bandeira = '🇺🇸'; 
          } else if (nomeTratado === 'EUR' || nomeTratado === 'EURO') {
            precoAtual = precosMercado?.euro || 0;
            siglaPadrao = 'EUR';
            corIcone = '#003399'; 
            tipo = 'moeda';
            iconeDisplay = '€';
            bandeira = '🇪🇺';
          } else if (nomeTratado === 'BRL' || nomeTratado === 'REAL') {
            precoAtual = 1; 
            siglaPadrao = 'BRL';
            corIcone = '#009b3a'; 
            tipo = 'moeda';
            iconeDisplay = 'R$';
            bandeira = '🇧🇷';
          }

          const valorInvestido = dados.quantidade * precoAtual;
          calculoSaldo += valorInvestido;

          if (precoAtual > 0 || nomeTratado === 'BRL') {
            listaAtivos.push({
              id: doc.id, sigla: siglaPadrao, quantidade: dados.quantidade, 
              precoAtual, valorInvestido, corIcone, tipo, iconeDisplay, bandeira,
              variacao: (Math.random() * 5 - 2).toFixed(2) 
            });
          }
        });

        listaAtivos.sort((a, b) => b.valorInvestido - a.valorInvestido);
        setMeusAtivos(listaAtivos);
        setSaldoTotal(calculoSaldo);
      } catch (error) {
        console.error("Erro ao sincronizar dados:", error);
      } finally {
        setCarregando(false);
      }
    }

    carregarDadosDoApp();
  }, [isFocused]);

  const ativosCrypto = meusAtivos.filter(a => a.tipo === 'crypto');
  const ativosMoeda = meusAtivos.filter(a => a.tipo === 'moeda');

  const renderItemAtivo = (ativo) => {
    const varNum = parseFloat(ativo.variacao);
    const corVar = varNum >= 0 ? '#32cd32' : '#ff4444';
    
    
    const corDoTextoIcone = ativo.sigla === 'BTC' ? '#000' : '#FFF';

    return (
      <View key={ativo.id} style={estilos.linhaAtivo}>
        <View style={estilos.ativoEsquerda}>
          
          <View style={[estilos.circuloIcone, { backgroundColor: ativo.corIcone }]}>
            <Text style={[estilos.textoIcone, { color: corDoTextoIcone }]}>
              {ativo.iconeDisplay || ativo.sigla.charAt(0)}
            </Text>
          </View>

          <View>
            <Text style={estilos.ativoNome}>
              {ativo.tipo === 'moeda' ? `${ativo.bandeira} ` : ''}{ativo.sigla}
            </Text>
            <Text style={estilos.ativoQtd}>{ativo.quantidade} na carteira</Text>
          </View>
        </View>

        <View style={estilos.ativoDireita}>
          <Text style={estilos.ativoValor}>
            R$ {ativo.valorInvestido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Text>
          <View style={estilos.linhaPreco}>
            <Text style={estilos.precoUnitario}>R$ {ativo.precoAtual.toLocaleString('pt-BR')}</Text>
            <Text style={[estilos.textoVar, { color: corVar }]}>
              {varNum >= 0 ? '+' : ''}{ativo.variacao}%
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (carregando) {
    return (
      <View style={estilos.carregando}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  return (
    <ScrollView style={estilos.fundo} showsVerticalScrollIndicator={false}>
      
      {}
      <View style={estilos.boxPatrimonio}>
        <Text style={estilos.labelTopo}>Saldo Total</Text>
        <View style={estilos.linhaSaldo}>
          <Text style={estilos.totalText}>
            R$ {saldoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <View style={[estilos.badge, { backgroundColor: isAlta ? 'rgba(50,205,50,0.1)' : 'rgba(255,68,68,0.1)' }]}>
             <Text style={[estilos.badgeText, { color: corTendencia }]}>
               {isAlta ? '+' : ''}{variacaoCarteira}%
             </Text>
          </View>
        </View>
      </View>

      {}
      <View style={estilos.sessaoGeral}>
        <Text style={estilos.tituloSessao}>Mercado Hoje</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={estilos.scrollCota}>
          {cotacoesDia.map((moeda) => {
            const altaMoeda = moeda.variacao >= 0;
            return (
              <View key={moeda.id} style={estilos.cardCotacao}>
                <View style={estilos.topoCardCotacao}>
                  <Text style={estilos.siglaCotacao}>{moeda.sigla}</Text>
                  <Text style={[estilos.varCotacao, { color: altaMoeda ? '#32cd32' : '#ff4444' }]}>
                    {altaMoeda ? '+' : ''}{moeda.variacao?.toFixed(2)}%
                  </Text>
                </View>
                <Text style={estilos.precoCotacao}>R$ {moeda.preco.toLocaleString('pt-BR')}</Text>
                
                {moeda.grafico && moeda.grafico.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <LineChart
                      data={{ datasets: [{ data: moeda.grafico }] }}
                      width={120}
                      height={40}
                      withDots={false}
                      withInnerLines={false}
                      withOuterLines={false}
                      withHorizontalLabels={false}
                      withVerticalLabels={false}
                      chartConfig={{
                        backgroundColor: '#0a0a0c',
                        backgroundGradientFrom: '#0a0a0c',
                        backgroundGradientTo: '#0a0a0c',
                        color: () => altaMoeda ? '#32cd32' : '#ff4444',
                        strokeWidth: 2,
                      }}
                      bezier
                      style={{ paddingRight: 0, paddingTop: 0, paddingBottom: 0 }}
                    />
                  </View>
                )}
              </View>
            )
          })}
        </ScrollView>
      </View>

      {}
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

      {}
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

  linhaAtivo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  ativoEsquerda: { flexDirection: 'row', alignItems: 'center' },
  circuloIcone: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  textoIcone: { fontWeight: 'bold', fontSize: 20 },
  ativoNome: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  ativoQtd: { color: '#666', fontSize: 13 },
  
  ativoDireita: { alignItems: 'flex-end' },
  ativoValor: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  linhaPreco: { flexDirection: 'row', alignItems: 'center' },
  precoUnitario: { color: '#666', fontSize: 12, marginRight: 8 },
  textoVar: { fontWeight: 'bold', fontSize: 12 },

  botaoAcao: { marginHorizontal: 20, backgroundColor: '#0a0a0c', padding: 20, borderRadius: 24, alignItems: 'center', marginBottom: 50 },
  textoBotaoAcao: { color: '#32cd32', fontWeight: 'bold', fontSize: 16 }
});