import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

// Configuração do Groq
const GROQ_API_KEY = process.env.GROQ_API_KEY || "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";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

// Função que envia mensagem ao Groq
export async function askGroq(question) {
  try {
    const response = await axios.post(
      GROQ_ENDPOINT,
      {
        model: "mixtral-8x7b-32768",
        messages: [
          {
            role: "system",
            content: `Você é o assistente inteligente do PDV InovaPro Smart Manager. 

CONTEXTO DO SISTEMA:
- Sistema de PDV para posto de combustível e loja de conveniência
- Controla vendas, estoque, relatórios e operações
- Integrado com WhatsApp para comunicação
- Usado por funcionários do Posto Caminho Certo

SUAS RESPONSABILIDADES:
1. Responder perguntas sobre vendas, estoque e relatórios
2. Ajudar com operações do PDV
3. Fornecer informações sobre produtos
4. Auxiliar com dúvidas operacionais
5. Manter tom profissional mas amigável

DIRETRIZES:
- Sempre responda em português brasileiro
- Seja direto e objetivo
- Use emojis quando apropriado
- Se não souber algo específico, seja honesto
- Foque em informações úteis para o trabalho no posto

FORMATO DE RESPOSTA:
- Máximo 200 palavras
- Use quebras de linha para organizar
- Inclua emojis relevantes
- Termine com uma pergunta ou sugestão quando apropriado`,
          },
          { role: "user", content: question },
        ],
        max_tokens: 500,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (err) {
    console.error("❌ Erro no Groq:", err.message);
    
    // Respostas de fallback baseadas em palavras-chave
    const perguntaLower = question.toLowerCase();
    
    if (perguntaLower.includes('venda') || perguntaLower.includes('vendeu')) {
      return "📊 Para consultar vendas, acesse o relatório de vendas no sistema PDV ou peça ao supervisor para gerar o relatório do período desejado.";
    }
    
    if (perguntaLower.includes('estoque')) {
      return "📦 Para verificar estoque, use o scanner de código de barras no sistema ou consulte a aba 'Produtos' no PDV.";
    }
    
    if (perguntaLower.includes('produto')) {
      return "🛍️ Para informações de produtos, use o sistema de busca no PDV ou escaneie o código de barras do item.";
    }
    
    if (perguntaLower.includes('ponto') || perguntaLower.includes('turno')) {
      return "⏰ Para questões de ponto, use o sistema de controle de ponto no PDV ou consulte seu supervisor.";
    }
    
    return "⚠️ Não consegui processar sua pergunta no momento. Tente reformular ou consulte o manual do sistema PDV.";
  }
}

// Função para detectar se a mensagem é uma pergunta para IA
export function isAIQuestion(message) {
  const msgLower = message.toLowerCase().trim();
  
  // Comandos diretos para IA
  if (msgLower.startsWith('ia ') || msgLower.startsWith('inovapro ')) {
    return true;
  }
  
  // Palavras-chave que indicam pergunta para IA
  const aiKeywords = [
    'quanto vendi', 'quanto vendeu', 'total de vendas',
    'produto mais vendido', 'produtos vendidos',
    'estoque baixo', 'sem estoque', 'falta produto',
    'como fazer', 'como usar', 'ajuda com',
    'qual o preço', 'preço do', 'custa quanto',
    'horário de funcionamento', 'quando abre', 'quando fecha'
  ];
  
  return aiKeywords.some(keyword => msgLower.includes(keyword));
}

// Função para limpar a pergunta removendo prefixos
export function cleanQuestion(message) {
  return message
    .replace(/^ia\s+/i, '')
    .replace(/^inovapro\s+/i, '')
    .trim();
}