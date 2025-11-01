const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://148.230.76.60:8081';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '429683C4C977415CAAFCCE10F7D57E11';
const INSTANCE_NAME = process.env.INSTANCE_NAME || 'pdv-inovapro-bot';

// Mapeamento de formas de pagamento
const paymentMethodLabels = {
  'dinheiro': 'Dinheiro',
  'cartao_debito': 'Cartão de Débito',
  'cartao_credito': 'Cartão de Crédito',
  'pix': 'PIX',
  'cheque': 'Cheque',
  'outro': 'Outro',
  'visa_debito': 'Visa Débito',
  'elo_debito': 'Elo Débito',
  'maestro_debito': 'Maestro Débito',
  'visa_credito': 'Visa Crédito',
  'elo_credito': 'Elo Crédito',
  'mastercard_credito': 'Mastercard Crédito',
  'amex_hipercard_credsystem': 'Amex / Hipercard / Credsystem',
};

// Formatar número de WhatsApp
function formatWhatsAppNumber(number) {
  let cleanNumber = number.replace(/\D/g, '');
  if (!cleanNumber.startsWith('55')) {
    cleanNumber = '55' + cleanNumber;
  }
  return cleanNumber;
}

// Rota para enviar notificação de ponto
app.post('/send-clock-notification', async (req, res) => {
  try {
    const { whatsapp_number, user_name, clock_time, type, entrada, saida, totalHoras } = req.body;

    if (!whatsapp_number) {
      return res.status(400).json({ success: false, error: 'Número de WhatsApp não fornecido' });
    }

    const formattedNumber = formatWhatsAppNumber(whatsapp_number);

    // Validar que não é um grupo (grupos terminam com @g.us)
    if (formattedNumber.endsWith("@g.us") || whatsapp_number.includes("@g.us")) {
      console.error(`❌ Tentativa de envio para grupo bloqueada: ${formattedNumber}`);
      return res.status(400).json({
        success: false,
        error: "Envio para grupos não é permitido. Use apenas números individuais."
      });
    }

    let message = '';
    const date = clock_time.split(' às ')[0];
    const time = clock_time.split(' às ')[1];

    if (type === 'entrada') {
      message = `📋 *Comprovante de Ponto - PDV InovaPro*\n\n`;
      message += `👤 *Funcionário:* ${user_name}\n`;
      message += `📅 *Data:* ${date}\n`;
      message += `🕒 *Horário:* ${time}\n`;
      message += `🏢 *Local:* Loja de Conveniência CT P. Rodoil\n`;
      message += `📄 *Tipo:* Entrada no Turno\n\n`;
      message += `💼 *CNPJ:* 28.769.272/0001-70\n`;
      message += `📍 *Registro INPI:* BR5120210029364\n\n`;
      message += `💬 _Tenha um ótimo dia de trabalho!_\n\n`;
      message += `🤖 _Sistema PDV InovaPro - INOVAPRO TECHNOLOGY_`;
    } else if (type === 'saida') {
      message = `📋 *Comprovante de Ponto - PDV InovaPro*\n\n`;
      message += `👤 *Funcionário:* ${user_name}\n`;
      message += `📅 *Data:* ${date}\n`;
      message += `🕒 *Horário:* ${time}\n`;
      message += `🏢 *Local:* Loja de Conveniência CT P. Rodoil\n`;
      message += `📄 *Tipo:* Saída do Turno\n\n`;
      if (totalHoras) {
        message += `⏱️ *Duração:* ${totalHoras}\n\n`;
      }
      message += `💼 *CNPJ:* 28.769.272/0001-70\n`;
      message += `📍 *Registro INPI:* BR5120210029364\n\n`;
      message += `💬 _Obrigado pelo seu trabalho hoje!_\n\n`;
      message += `🤖 _Sistema PDV InovaPro - INOVAPRO TECHNOLOGY_`;
    } else if (type === 'comprovante') {
      message = `📋 *Comprovante de Ponto - PDV InovaPro*\n\n`;
      message += `👤 *Funcionário:* ${user_name}\n`;
      message += `📅 *Data:* ${date}\n`;
      message += `🏢 *Local:* Loja de Conveniência CT P. Rodoil\n`;
      message += `📄 *Tipo:* Comprovante de Registro de Ponto\n\n`;
      message += `━━━━━━━━━━━━━━━━━━━\n`;
      if (entrada) {
        message += `🕒 *Entrada:* ${entrada}\n`;
      }
      if (saida) {
        message += `🕐 *Saída:* ${saida}\n`;
      }
      if (totalHoras) {
        message += `⏱️ *Total de Horas:* ${totalHoras}\n`;
      }
      message += `━━━━━━━━━━━━━━━━━━━\n\n`;
      message += `💼 *CNPJ:* 28.769.272/0001-70\n`;
      message += `📍 *Registro INPI:* BR5120210029364\n\n`;
      message += `💬 _Comprovante gerado com sucesso!_\n\n`;
      message += `🤖 _Sistema PDV InovaPro - INOVAPRO TECHNOLOGY_`;
    }

    // Enviar mensagem via Evolution API
    const response = await axios.post(
      `${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`,
      {
        number: formattedNumber,
        text: message
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        }
      }
    );

    console.log(`✅ Notificação de ${type} enviada para ${whatsapp_number}`);
    res.json({ success: true, message: 'Notificação enviada com sucesso!', data: response.data });

  } catch (error) {
    console.error('❌ Erro ao enviar notificação:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao enviar notificação',
      details: error.response?.data || error.message
    });
  }
});

// Rota para enviar relatório de turno
app.post('/send-report', async (req, res) => {
  try {
    const {
      user,
      startTime,
      endTime,
      totalSales,
      averageTicket,
      totalAmount,
      paymentSummary,
      whatsapp_number,
      shiftDuration
    } = req.body;

    if (!whatsapp_number) {
      return res.status(400).json({ success: false, error: 'Número de WhatsApp não fornecido' });
    }

    const formattedNumber = formatWhatsAppNumber(whatsapp_number);

    // Validar que não é um grupo (grupos terminam com @g.us)
    if (formattedNumber.endsWith("@g.us") || whatsapp_number.includes("@g.us")) {
      console.error(`❌ Tentativa de envio para grupo bloqueada: ${formattedNumber}`);
      return res.status(400).json({
        success: false,
        error: "Envio para grupos não é permitido. Use apenas números individuais."
      });
    }

    const date = new Date().toLocaleDateString('pt-BR');
    const startTimeFormatted = startTime;
    const endTimeFormatted = endTime;

    let message = `📋 *Comprovante de Fechamento de Turno*\n\n`;
    message += `👤 *Funcionário:* ${user}\n`;
    message += `📅 *Data:* ${date}\n`;
    message += `🕐 *Horário do Turno:* ${startTimeFormatted} às ${endTimeFormatted}\n`;
    if (shiftDuration) {
      message += `⏱️ *Duração:* ${shiftDuration}\n`;
    }
    message += `\n`;
    message += `━━━━━━━━━━━━━━━━━━━\n`;
    message += `📊 *RESUMO DE VENDAS*\n`;
    message += `━━━━━━━━━━━━━━━━━━━\n\n`;

    if (totalSales === 0) {
      message += `💵 *Total de Vendas:* R$ 0,00\n`;
      message += `📄 *Status:* Nenhuma venda registrada neste turno.\n\n`;
    } else {
      message += `💵 *Total Vendido:* R$ ${parseFloat(totalAmount).toFixed(2)}\n`;
      message += `📊 *Quantidade de Vendas:* ${totalSales}\n`;
      message += `📈 *Ticket Médio:* R$ ${parseFloat(averageTicket).toFixed(2)}\n\n`;
      message += `💳 *Formas de Pagamento:*\n\n`;

      if (paymentSummary && typeof paymentSummary === 'object') {
        Object.entries(paymentSummary).forEach(([method, data]) => {
          const methodLabel = paymentMethodLabels[method] || method;
          message += `  • ${methodLabel}: ${data.count}x — R$ ${parseFloat(data.amount).toFixed(2)}\n`;
        });
      }
      message += '\n';
    }

    message += `🏢 *Local:* Loja de Conveniência CT P. Rodoil\n`;
    message += `💼 *CNPJ:* 28.769.272/0001-70\n`;
    message += `📍 *Registro INPI:* BR5120210029364\n\n`;
    message += `💬 _Obrigado pelo seu trabalho!_\n\n`;
    message += `🤖 _Sistema PDV InovaPro - INOVAPRO TECHNOLOGY_`;

    // Enviar mensagem via Evolution API
    const response = await axios.post(
      `${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`,
      {
        number: formattedNumber,
        text: message
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        }
      }
    );

    console.log(`✅ Relatório enviado para ${whatsapp_number}`);
    res.json({ success: true, message: 'Relatório enviado com sucesso!', data: response.data });

  } catch (error) {
    console.error('❌ Erro ao enviar relatório:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao enviar relatório',
      details: error.response?.data || error.message
    });
  }
});

// Rota de status
app.get('/status', (req, res) => {
  res.json({
    connected: true,
    timestamp: new Date().toLocaleString('pt-BR')
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Bot proxy rodando na porta ${PORT}`);
  console.log(`📱 Evolution API: ${EVOLUTION_API_URL}`);
  console.log(`📲 Instância: ${INSTANCE_NAME}`);
});
