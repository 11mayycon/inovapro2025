import express from 'express';
import cors from 'cors';
import https from 'https';
import moment from 'moment-timezone';
import fs from 'fs';
import path from 'path';
import pdf from 'puppeteer';
import dotenv from 'dotenv';
import axios from 'axios';

// Importar módulo de IA
import { askGroq, isAIQuestion, cleanQuestion } from './modules/ai/groq.js';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Configurar moment para português e timezone de São Paulo
moment.locale('pt-br');
moment.tz.setDefault('America/Sao_Paulo');

// Configurações da Evolution API
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8081';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || 'caminho-certo-bot';

// Status da conexão
let isConnected = false;

// Função para verificar status da instância na Evolution API
async function checkEvolutionStatus() {
  try {
    const response = await axios.get(
      `${EVOLUTION_API_URL}/instance/connectionState/${EVOLUTION_INSTANCE_NAME}`,
      {
        headers: {
          'apikey': EVOLUTION_API_KEY
        }
      }
    );

    isConnected = response.data?.state === 'open';
    console.log('📊 Status Evolution API:', response.data?.state);
    return isConnected;
  } catch (error) {
    console.error('❌ Erro ao verificar status da Evolution API:', error.message);
    isConnected = false;
    return false;
  }
}

// Função para enviar mensagem via Evolution API
async function sendEvolutionMessage(number, text) {
  try {
    // Formatar número para padrão internacional
    let cleanNumber = number.replace(/\D/g, '');

    // Se não começar com 55, adicionar
    if (!cleanNumber.startsWith('55')) {
      cleanNumber = '55' + cleanNumber;
    }

    console.log(`📤 Enviando mensagem para ${cleanNumber}...`);

    const response = await axios.post(
      `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`,
      {
        number: cleanNumber,
        text: text
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        }
      }
    );

    console.log('✅ Mensagem enviada via Evolution API!');
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem via Evolution API:', error.response?.data || error.message);
    throw error;
  }
}

// Função para enviar mídia via Evolution API
async function sendEvolutionMedia(number, mediaPath, caption) {
  try {
    // Formatar número
    let cleanNumber = number.replace(/\D/g, '');
    if (!cleanNumber.startsWith('55')) {
      cleanNumber = '55' + cleanNumber;
    }

    console.log(`📤 Enviando mídia para ${cleanNumber}...`);

    // Ler arquivo e converter para base64
    const mediaBuffer = fs.readFileSync(mediaPath);
    const mediaBase64 = mediaBuffer.toString('base64');
    const fileName = path.basename(mediaPath);

    const response = await axios.post(
      `${EVOLUTION_API_URL}/message/sendMedia/${EVOLUTION_INSTANCE_NAME}`,
      {
        number: cleanNumber,
        mediatype: 'document',
        mimetype: 'application/pdf',
        caption: caption,
        fileName: fileName,
        media: mediaBase64
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        }
      }
    );

    console.log('✅ Mídia enviada via Evolution API!');
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao enviar mídia via Evolution API:', error.response?.data || error.message);
    throw error;
  }
}

// Verificar status periodicamente
setInterval(checkEvolutionStatus, 60000); // A cada 1 minuto
checkEvolutionStatus(); // Verificar imediatamente ao iniciar

console.log('🔄 Bot configurado para usar Evolution API');
console.log(`📡 URL: ${EVOLUTION_API_URL}`);
console.log(`🏷️ Instância: ${EVOLUTION_INSTANCE_NAME}`);

// ============================================
// 🤖 INOVAPRO SMART MANAGER - MÓDULO DE IA
// ============================================
// Webhook para receber mensagens da Evolution API
app.post('/webhook', async (req, res) => {
  try {
    console.log('📥 Webhook recebido:', JSON.stringify(req.body, null, 2));

    const data = req.body?.data;

    if (!data) {
      return res.json({ success: true });
    }

    // Verificar se é uma mensagem de texto
    if (data.messageType === 'conversation' || data.messageType === 'extendedTextMessage') {
      const messageBody = data.message?.conversation || data.message?.extendedTextMessage?.text || '';
      const from = data.key?.remoteJid;
      const fromMe = data.key?.fromMe;

      // Ignorar mensagens de grupos e mensagens próprias
      if (!from || from.includes('@g.us') || fromMe) {
        return res.json({ success: true });
      }

      // Verificar se é uma pergunta para IA
      if (isAIQuestion(messageBody)) {
        console.log(`🤖 Pergunta para IA recebida de ${from}: ${messageBody}`);

        // Limpar a pergunta removendo prefixos
        const pergunta = cleanQuestion(messageBody);

        if (!pergunta) {
          await sendEvolutionMessage(
            from,
            "🤖 *InovaPro Smart Manager*\n\nDigite algo após 'ia' ou 'inovapro', exemplo:\n• 'ia quanto vendi ontem?'\n• 'inovapro qual o produto mais vendido?'"
          );
          return res.json({ success: true });
        }

        // Enviar resposta da IA
        const resposta = await askGroq(pergunta);
        await sendEvolutionMessage(
          from,
          `🤖 *InovaPro Smart Manager*\n\n${resposta}\n\n_Sistema PDV InovaPro - INOVAPRO TECHNOLOGY_`
        );

        console.log(`✅ Resposta da IA enviada para ${from}`);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    res.json({ success: false, error: error.message });
  }
});

console.log('🤖 Módulo InovaPro Smart Manager ativado!');
console.log('💬 Bot responderá a mensagens que começam com "ia" ou "inovapro"');
console.log('🔗 Configure o webhook na Evolution API para: http://SEU_SERVIDOR:4000/webhook');
// ============================================

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

// Rota para envio de relatório
app.post('/send-report', async (req, res) => {
  try {
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        error: 'WhatsApp não está conectado na Evolution API'
      });
    }

    const {
      user,
      startTime,
      endTime,
      totalSales,
      averageTicket,
      totalAmount,
      paymentSummary,
      groupId,
      pdfData,
      receiptNumber,
      whatsapp_number,
      shiftDuration
    } = req.body;

    // Determinar destinatário
    let targetNumber;
    if (whatsapp_number) {
      targetNumber = whatsapp_number;
      console.log(`📱 Enviando relatório para PV: ${whatsapp_number}`);
    } else {
      console.error('❌ Número de WhatsApp não fornecido');
      return res.status(400).json({
        success: false,
        error: 'Número de WhatsApp não fornecido'
      });
    }

    const date = moment().tz('America/Sao_Paulo').format('DD/MM/YYYY');
    const startTimeFormatted = moment(startTime).tz('America/Sao_Paulo').format('HH:mm');
    const endTimeFormatted = moment(endTime).tz('America/Sao_Paulo').format('HH:mm');

    // Montar mensagem
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

      // Agrupar por categoria
      const debitoCategories = ['cartao_debito', 'visa_debito', 'elo_debito', 'maestro_debito'];
      const creditoCategories = ['cartao_credito', 'visa_credito', 'elo_credito', 'mastercard_credito', 'amex_hipercard_credsystem'];

      let hasDebito = false;
      let hasCredito = false;
      let debitoTotal = 0;
      let creditoTotal = 0;
      const outrosMetodos = [];

      // Separar formas de pagamento
      Object.entries(paymentSummary || {}).forEach(([method, data]) => {
        if (debitoCategories.includes(method)) {
          if (!hasDebito) {
            message += `*🔵 DÉBITO:*\n`;
            hasDebito = true;
          }
          const methodLabel = paymentMethodLabels[method] || method;
          message += `  • ${methodLabel}: ${data.count}x — R$ ${parseFloat(data.amount).toFixed(2)}\n`;
          debitoTotal += parseFloat(data.amount);
        } else if (creditoCategories.includes(method)) {
          if (!hasCredito) {
            if (hasDebito) message += '\n';
            message += `*🟢 CRÉDITO:*\n`;
            hasCredito = true;
          }
          const methodLabel = paymentMethodLabels[method] || method;
          message += `  • ${methodLabel}: ${data.count}x — R$ ${parseFloat(data.amount).toFixed(2)}\n`;
          creditoTotal += parseFloat(data.amount);
        } else {
          outrosMetodos.push({ method, data });
        }
      });

      // Adicionar subtotais
      if (hasDebito) {
        message += `  ──────────────────\n`;
        message += `  *Subtotal Débito:* R$ ${debitoTotal.toFixed(2)}\n`;
      }
      if (hasCredito) {
        message += `  ──────────────────\n`;
        message += `  *Subtotal Crédito:* R$ ${creditoTotal.toFixed(2)}\n`;
      }

      // Outros métodos
      if (outrosMetodos.length > 0) {
        if (hasDebito || hasCredito) message += '\n';
        message += `*🔶 OUTROS:*\n`;
        outrosMetodos.forEach(({ method, data }) => {
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

    // Se há dados de PDF, criar e enviar
    if (pdfData && receiptNumber) {
      try {
        console.log('📄 Gerando PDF...');

        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        let reportText = '';
        if (typeof pdfData === 'string') {
          reportText = pdfData;
        } else if (pdfData.receiptText) {
          reportText = pdfData.receiptText;
        } else if (pdfData.data) {
          reportText = pdfData.data;
        }

        const pdfBuffer = await generateModernPDF(reportText, receiptNumber, paymentSummary);

        const fileName = `relatorio_turno_${receiptNumber}.pdf`;
        const filePath = path.join(tempDir, fileName);

        fs.writeFileSync(filePath, pdfBuffer);
        console.log(`📄 PDF criado: ${filePath}`);

        // Enviar PDF via Evolution API
        await sendEvolutionMedia(targetNumber, filePath, message);
        console.log('✅ Relatório com PDF enviado via Evolution API!');

        // Limpar arquivo temporário
        setTimeout(() => {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('🗑️ Arquivo PDF temporário removido');
          }
        }, 5000);

      } catch (pdfError) {
        console.error('❌ Erro ao processar PDF:', pdfError);
        console.log('📄 Enviando apenas mensagem de texto...');
        await sendEvolutionMessage(targetNumber, message);
        console.log('✅ Relatório (sem PDF) enviado!');
      }
    } else {
      console.log('📄 Sem PDF, enviando mensagem...');
      await sendEvolutionMessage(targetNumber, message);
      console.log('✅ Relatório enviado!');
    }

    res.json({ success: true, message: 'Relatório enviado com sucesso!' });

  } catch (error) {
    console.error('❌ Erro ao enviar relatório:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// Rota para enviar notificação de ponto
app.post('/send-clock-notification', async (req, res) => {
  try {
    console.log('📥 Requisição recebida em /send-clock-notification');
    console.log('🔌 WhatsApp conectado?', isConnected);

    if (!isConnected) {
      console.error('❌ WhatsApp não conectado - rejeitando requisição');
      return res.status(503).json({
        success: false,
        error: 'WhatsApp não está conectado na Evolution API'
      });
    }

    const { whatsapp_number, user_name, clock_time, type, entrada, saida, totalHoras } = req.body;

    if (!whatsapp_number) {
      return res.status(400).json({
        success: false,
        error: 'Número de WhatsApp não fornecido'
      });
    }

    console.log(`📱 Enviando notificação para: ${whatsapp_number}`);

    // Criar mensagem baseada no tipo
    let message = '';

    if (type === 'entrada') {
      message = `📋 *Comprovante de Ponto - PDV InovaPro*\n\n`;
      message += `👤 *Funcionário:* ${user_name}\n`;
      message += `📅 *Data:* ${moment(clock_time, 'DD/MM/YYYY [às] HH:mm:ss').format('DD/MM/YYYY')}\n`;
      message += `🕒 *Horário:* ${moment(clock_time, 'DD/MM/YYYY [às] HH:mm:ss').format('HH:mm:ss')}\n`;
      message += `🏢 *Local:* Loja de Conveniência CT P. Rodoil\n`;
      message += `📄 *Tipo:* Entrada no Turno\n\n`;
      message += `💼 *CNPJ:* 28.769.272/0001-70\n`;
      message += `📍 *Registro INPI:* BR5120210029364\n\n`;
      message += `💬 _Tenha um ótimo dia de trabalho!_\n\n`;
      message += `🤖 _Sistema PDV InovaPro - INOVAPRO TECHNOLOGY_`;
    } else if (type === 'saida') {
      message = `📋 *Comprovante de Ponto - PDV InovaPro*\n\n`;
      message += `👤 *Funcionário:* ${user_name}\n`;
      message += `📅 *Data:* ${moment(clock_time, 'DD/MM/YYYY [às] HH:mm:ss').format('DD/MM/YYYY')}\n`;
      message += `🕒 *Horário:* ${moment(clock_time, 'DD/MM/YYYY [às] HH:mm:ss').format('HH:mm:ss')}\n`;
      message += `🏢 *Local:* Loja de Conveniência CT P. Rodoil\n`;
      message += `📄 *Tipo:* Saída do Turno\n\n`;
      message += `💼 *CNPJ:* 28.769.272/0001-70\n`;
      message += `📍 *Registro INPI:* BR5120210029364\n\n`;
      message += `💬 _Obrigado pelo seu trabalho hoje!_\n\n`;
      message += `🤖 _Sistema PDV InovaPro - INOVAPRO TECHNOLOGY_`;
    } else if (type === 'comprovante') {
      message = `📋 *Comprovante de Ponto - PDV InovaPro*\n\n`;
      message += `👤 *Funcionário:* ${user_name}\n`;
      message += `📅 *Data:* ${moment(clock_time, 'DD/MM/YYYY [às] HH:mm:ss').format('DD/MM/YYYY')}\n`;
      message += `🕒 *Horário:* ${moment(clock_time, 'DD/MM/YYYY [às] HH:mm:ss').format('HH:mm:ss')}\n`;
      message += `🏢 *Local:* Loja de Conveniência CT P. Rodoil\n`;
      message += `📄 *Tipo:* Saída do Turno\n`;
      message += `⏱️ *Duração:* ${totalHoras}\n\n`;
      message += `💼 *CNPJ:* 28.769.272/0001-70\n`;
      message += `📍 *Registro INPI:* BR5120210029364\n\n`;
      message += `💬 _Turno finalizado com sucesso!_\n\n`;
      message += `🤖 _Sistema PDV InovaPro - INOVAPRO TECHNOLOGY_`;
    }

    await sendEvolutionMessage(whatsapp_number, message);
    console.log(`✅ Notificação de ${type} enviada para ${whatsapp_number}`);

    res.json({ success: true, message: 'Notificação enviada com sucesso!' });

  } catch (error) {
    console.error('❌ Erro ao enviar notificação de ponto:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// Rota para verificar status do bot
app.get('/status', async (req, res) => {
  const status = await checkEvolutionStatus();
  res.json({
    connected: status,
    timestamp: moment().tz('America/Sao_Paulo').format('DD/MM/YYYY HH:mm:ss')
  });
});

// Função para gerar PDF
async function generateModernPDF(reportText, receiptNumber, paymentSummary) {
  let browser;
  try {
    const now = moment().tz('America/Sao_Paulo');

    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: 'Arial', sans-serif;
                font-size: 12px;
                line-height: 1.4;
                color: #333;
                background: #fff;
            }

            .header {
                background: linear-gradient(135deg, #2980b9, #3498db);
                color: white;
                padding: 20px;
                text-align: center;
                margin-bottom: 20px;
            }

            .header h1 {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 5px;
            }

            .header h2 {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 10px;
            }

            .header h3 {
                font-size: 14px;
                font-weight: normal;
            }

            .company-info {
                background: #f8f9fa;
                padding: 15px;
                margin-bottom: 20px;
                border-left: 4px solid #2980b9;
            }

            .company-info p {
                margin: 3px 0;
                font-size: 11px;
                color: #555;
            }

            .report-info {
                margin-bottom: 20px;
            }

            .report-info p {
                margin: 5px 0;
                font-weight: bold;
            }

            .section {
                margin-bottom: 25px;
            }

            .section-title {
                background: #2980b9;
                color: white;
                padding: 10px 15px;
                font-weight: bold;
                font-size: 14px;
                margin-bottom: 10px;
            }

            .payment-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
            }

            .payment-table th {
                background: #ecf0f1;
                padding: 8px;
                text-align: left;
                font-weight: bold;
                border: 1px solid #bdc3c7;
            }

            .payment-table td {
                padding: 8px;
                border: 1px solid #bdc3c7;
            }

            .payment-table tr:nth-child(even) {
                background: #f8f9fa;
            }

            .total-row {
                background: #e74c3c !important;
                color: white;
                font-weight: bold;
            }

            .footer {
                margin-top: 30px;
                padding: 15px;
                background: #ecf0f1;
                text-align: center;
                font-size: 10px;
                color: #7f8c8d;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>CENTRO AUTOMOTIVO</h1>
            <h2>CAMINHO CERTO LTDA</h2>
            <h3>RELATÓRIO DE FECHAMENTO DE TURNO</h3>
        </div>

        <div class="company-info">
            <p><strong>Endereço:</strong> AV MANUEL DOMINGOS PINTO - PQ ANHANGUERA S10 PAULO-SP</p>
            <p><strong>CEP:</strong> 05120-000 | <strong>CNPJ:</strong> 02.727.407/0001-40</p>
        </div>

        <div class="report-info">
            <p><strong>Documento:</strong> ${receiptNumber}</p>
            <p><strong>Data/Hora:</strong> ${now.format('DD/MM/YYYY HH:mm:ss')}</p>
        </div>

        <div class="footer">
            <p><strong>Documento gerado automaticamente pelo Sistema PDV InovaPro</strong></p>
            <p>Gerado em: ${now.format('DD/MM/YYYY às HH:mm:ss')}</p>
        </div>
    </body>
    </html>
    `;

    browser = await pdf.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
      printBackground: true
    });

    return pdfBuffer;

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor bot Evolution API rodando em http://localhost:${PORT}`);
  console.log('📱 Aguardando conexão com Evolution API...');
});
