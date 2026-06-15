import axios from 'axios';

export const buscarCotacoes = async () => {
  try {
    const crypto = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=brl'
    );
    
    const fiat = await axios.get(
      'https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL'
    );

    return {
      bitcoin: crypto.data.bitcoin.brl,
      ethereum: crypto.data.ethereum.brl,
      dolar: parseFloat(fiat.data.USDBRL.bid),
      euro: parseFloat(fiat.data.EURBRL.bid),
    };
  } catch (error) {
    console.error("Erro ao buscar cotações:", error);
    return null;
  }
};