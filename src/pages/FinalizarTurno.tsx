import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Clock, DollarSign, Users, TrendingUp, FileText, Printer, AlertTriangle, Download } from 'lucide-react';
import { ClockOutDialog } from '@/components/ClockOutDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const BOT_SERVER_URL = import.meta.env.VITE_BOT_SERVER_URL || 'http://localhost:4000';

interface ShiftSummary {
  totalSales: number;
  totalAmount: number;
  averageTicket: number;
  paymentSummary: Record<string, { count: number; amount: number }>;
  brandSummary: Record<string, { count: number; amount: number }>;
  startTime: Date;
  endTime: Date;
}

export default function FinalizarTurno() {
  const [loading, setLoading] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [showClockOutDialog, setShowClockOutDialog] = useState(false);
  const [workedTime, setWorkedTime] = useState('0h 0min');
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Atualizar tempo trabalhado
  useEffect(() => {
    const updateWorkedTime = async () => {
      const time = await calculateWorkedTime();
      setWorkedTime(time);
    };

    updateWorkedTime();
    const interval = setInterval(updateWorkedTime, 60000); // Atualiza a cada minuto

    return () => clearInterval(interval);
  }, [user]);

  const calculateShiftSummary = async () => {
    setLoading(true);
    try {
      console.log('📊 [calculateShiftSummary] Iniciando cálculo...');

      // Buscar o turno ativo do usuário
      const { data: activeShift, error: shiftError } = await supabase
        .from('active_shifts')
        .select('*')
        .eq('user_id', user?.id)
        .order('start_time', { ascending: false })
        .limit(1)
        .single();

      console.log('📊 [calculateShiftSummary] Turno ativo:', activeShift);
      console.log('📊 [calculateShiftSummary] Erro turno:', shiftError);

      if (shiftError || !activeShift) {
        console.error('❌ [calculateShiftSummary] Nenhum turno ativo encontrado');
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Você precisa iniciar um turno antes de finalizá-lo.',
        });
        setLoading(false);
        return;
      }

      const shiftStartTime = new Date(activeShift.start_time);
      const now = new Date();

      console.log('📊 [calculateShiftSummary] Período:', {
        inicio: shiftStartTime.toISOString(),
        fim: now.toISOString()
      });

      // Buscar vendas desde o início do turno (com bandeira)
      const { data: salesData, error } = await supabase
        .from('sales')
        .select('*')
        .eq('user_id', user?.id)
        .gte('created_at', shiftStartTime.toISOString())
        .lte('created_at', now.toISOString());

      console.log('📊 [calculateShiftSummary] Vendas encontradas:', salesData?.length || 0);

      if (error) {
        console.error('❌ [calculateShiftSummary] Erro ao buscar vendas:', error);
        throw error;
      }

      // Type assertion para incluir bandeira
      const sales = salesData as Array<any>;

      // Se não houver vendas, criar um resumo vazio
      if (!sales || sales.length === 0) {
        console.log('📊 [calculateShiftSummary] Sem vendas - criando resumo vazio');
        const shiftSummary: ShiftSummary = {
          totalSales: 0,
          totalAmount: 0,
          averageTicket: 0,
          paymentSummary: {},
          brandSummary: {},
          startTime: shiftStartTime,
          endTime: now,
        };

        setSummary(shiftSummary);
        console.log('📊 [calculateShiftSummary] Abrindo dialog de relatório...');
        setShowReport(true);
        setLoading(false);
        return;
      }

      // Calcular resumo com vendas
      console.log('📊 [calculateShiftSummary] Calculando resumo com vendas...');
      const totalAmount = sales.reduce((sum: number, sale: any) => sum + Number(sale.total), 0);
      const paymentSummary: Record<string, { count: number; amount: number }> = {};
      const brandSummary: Record<string, { count: number; amount: number }> = {};

      sales.forEach((sale: any) => {
        const method = sale.forma_pagamento || 'outro';
        if (!paymentSummary[method]) {
          paymentSummary[method] = { count: 0, amount: 0 };
        }
        paymentSummary[method].count++;
        paymentSummary[method].amount += Number(sale.total);

        // Agrupar por bandeira (quando disponível)
        const bandeira = sale.bandeira;
        if (bandeira) {
          const brandKey = `${sale.forma_pagamento}_${bandeira}`;
          if (!brandSummary[brandKey]) {
            brandSummary[brandKey] = { count: 0, amount: 0 };
          }
          brandSummary[brandKey].count++;
          brandSummary[brandKey].amount += Number(sale.total);
        }
      });

      const shiftSummary: ShiftSummary = {
        totalSales: sales.length,
        totalAmount,
        averageTicket: totalAmount / sales.length,
        paymentSummary,
        brandSummary,
        startTime: shiftStartTime,
        endTime: now,
      };

      console.log('📊 [calculateShiftSummary] Resumo calculado:', shiftSummary);
      setSummary(shiftSummary);
      console.log('📊 [calculateShiftSummary] Abrindo dialog de relatório...');
      setShowReport(true);
    } catch (error) {
      console.error('❌ [calculateShiftSummary] Error calculating shift summary:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: `Erro ao calcular resumo do turno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      });
    } finally {
      console.log('📊 [calculateShiftSummary] Finalizando (setLoading false)');
      setLoading(false);
    }
  };

  const finalizeShift = async () => {
    if (!summary) {
      console.error('❌ [finalizeShift] Nenhum summary disponível');
      return;
    }

    setLoading(true);
    try {
      console.log('🔵 [finalizeShift] Iniciando finalização...');

      // Primeiro, registrar saída no ponto
      const { data: pontoAberto, error: pontoError } = await supabase
        .from('ponto')
        .select('*')
        .eq('user_id', user?.id)
        .is('saida', null)
        .order('entrada', { ascending: false })
        .limit(1);

      console.log('📋 [finalizeShift] Ponto aberto:', pontoAberto);

      if (!pontoError && pontoAberto && pontoAberto.length > 0) {
        // Registrar saída
        const now = new Date();
        console.log('⏰ [finalizeShift] Registrando saída:', now.toISOString());

        const { error: updateError } = await supabase
          .from('ponto')
          .update({ saida: now.toISOString() })
          .eq('id', pontoAberto[0].id);

        if (updateError) {
          console.error('❌ [finalizeShift] Erro ao registrar saída:', updateError);
          throw updateError;
        }

        console.log('✅ [finalizeShift] Saída registrada com sucesso');
      } else {
        console.log('⚠️ [finalizeShift] Nenhum ponto em aberto encontrado');
      }

      // Buscar dados do ponto para a mensagem privada
      const { data: pontoData, error: pontoDataError } = await supabase
        .from('ponto')
        .select('entrada, saida')
        .eq('user_id', user?.id)
        .order('entrada', { ascending: false })
        .limit(1);

      console.log('📋 [finalizeShift] Dados do ponto:', pontoData);

      // Salvar fechamento no banco
      console.log('💾 [finalizeShift] Salvando fechamento no banco...');
      const { error } = await supabase
        .from('shift_closures')
        .insert([{
          user_id: user?.id,
          start_time: summary.startTime.toISOString(),
          end_time: summary.endTime.toISOString(),
          shift_start_time: summary.startTime.toISOString(),
          shift_end_time: summary.endTime.toISOString(),
          total_sales: summary.totalSales,
          total_amount: summary.totalAmount,
          average_ticket: summary.averageTicket,
          payment_summary: summary.paymentSummary,
          report_data: summary,
        }] as any);

      if (error) {
        console.error('❌ [finalizeShift] Erro ao salvar fechamento:', error);
        throw error;
      }

      console.log('✅ [finalizeShift] Fechamento salvo com sucesso');

      // Remover o turno ativo
      console.log('🗑️ [finalizeShift] Removendo turno ativo...');
      await supabase
        .from('active_shifts')
        .delete()
        .eq('user_id', user?.id);

      console.log('✅ [finalizeShift] Turno ativo removido');

      // Enviar mensagem consolidada (ponto + vendas) para o colaborador
      console.log('📱 [finalizeShift] Verificando dados para envio...');
      console.log('📱 [finalizeShift] pontoData:', pontoData);
      console.log('📱 [finalizeShift] user.whatsapp_number:', user?.whatsapp_number);

      if (user?.whatsapp_number) {
        console.log('📱 [finalizeShift] Enviando relatório consolidado (ponto + vendas)...');
        try {
          // Enviar relatório de vendas (que agora inclui também o resumo de ponto)
          await sendReportToWhatsApp();
          console.log('✅ [finalizeShift] Relatório consolidado enviado com sucesso');

          toast({
            title: 'Turno finalizado!',
            description: 'Relatório de turno e comprovante de ponto enviados ao seu WhatsApp. Você será deslogado em 3 segundos...',
          });
        } catch (reportError) {
          console.error('❌ [finalizeShift] Erro ao enviar relatório:', reportError);

          // Se falhar, notificar o erro
          toast({
            title: 'Turno finalizado!',
            description: 'Turno finalizado, mas houve erro ao enviar relatório para WhatsApp. Você será deslogado em 3 segundos...',
            variant: 'destructive',
          });
        }
      } else {
        console.warn('⚠️ [finalizeShift] Usuário não tem whatsapp_number cadastrado');
        toast({
          title: 'Turno finalizado!',
          description: 'Turno finalizado. Configure seu número de WhatsApp para receber relatórios. Você será deslogado em 3 segundos...',
        });
      }

      console.log('🔴 [finalizeShift] Fechando dialog...');
      setShowReport(false);

      // Deslogar após 3 segundos
      console.log('⏱️ [finalizeShift] Agendando logout em 3 segundos...');
      setTimeout(async () => {
        console.log('👋 [finalizeShift] Fazendo logout...');
        await logout();
        navigate('/');
      }, 3000);
    } catch (error) {
      console.error('❌ [finalizeShift] Error finalizing shift:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: `Erro ao finalizar turno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      });
    } finally {
      console.log('🏁 [finalizeShift] Finalizando (setLoading false)');
      setLoading(false);
    }
  };

  const sendReportToWhatsApp = async () => {
    if (!summary || sendingReport) return;

    setSendingReport(true);
    try {
      console.log('🚀 Iniciando envio para WhatsApp...');

      // Primeiro, gerar o PDF do relatório
      const receiptNumber = `TURNO-${Date.now()}`;
      const now = new Date();

      // Preparar dados para geração do PDF
      const paymentSummaryForPrint: Record<string, number> = {};
      Object.entries(summary.paymentSummary).forEach(([method, data]) => {
        paymentSummaryForPrint[method] = data.amount;
      });

      const reportData = {
        type: 'shift_closure',
        receiptNumber,
        date: now.toLocaleDateString('pt-BR'),
        time: now.toLocaleTimeString('pt-BR'),
        user: user?.name || 'Sistema',
        total: summary.totalAmount,
        shiftData: {
          totalSales: summary.totalSales,
          averageTicket: summary.averageTicket,
          paymentSummary: paymentSummaryForPrint,
          entryTotal: summary.totalAmount,
          exitTotal: summary.totalAmount,
          difference: 0,
        },
      };

      console.log('📄 Gerando PDF...');
      // Gerar PDF usando a edge function
      const { data: pdfResponse, error: pdfError } = await supabase.functions.invoke('print-receipt', {
        body: reportData,
      });

      if (pdfError) {
        console.error('❌ Erro ao gerar PDF:', pdfError);
        throw pdfError;
      }

      console.log('✅ PDF gerado com sucesso');

      // Calcular duração do turno
      const duration = summary.endTime.getTime() - summary.startTime.getTime();
      const durationMins = Math.floor(duration / 60000);
      const hours = Math.floor(durationMins / 60);
      const mins = durationMins % 60;
      const shiftDuration = `${hours}h ${mins}min`;

      // Preparar payload para WhatsApp com PDF (enviar no PV do funcionário)
      const whatsappPayload = {
        user: user?.name || 'Sistema',
        startTime: summary.startTime.toISOString(),
        endTime: summary.endTime.toISOString(),
        totalSales: summary.totalSales,
        averageTicket: summary.averageTicket,
        totalAmount: summary.totalAmount,
        paymentSummary: summary.paymentSummary,
        pdfData: pdfResponse, // Dados completos do PDF
        receiptNumber: receiptNumber,
        whatsapp_number: user?.whatsapp_number, // Adicionar número de WhatsApp para envio no PV
        shiftDuration: shiftDuration, // Adicionar duração do turno
      };

      console.log('📦 Enviando para WhatsApp...');
      console.log('🔗 URL do Bot:', BOT_SERVER_URL);

      const response = await fetch(`${BOT_SERVER_URL}/send-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(whatsappPayload),
      });

      console.log('📡 Resposta do servidor:', response.status, response.statusText);

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Resposta do WhatsApp:', responseData);
        toast({
          title: 'Relatório enviado!',
          description: 'Relatório com PDF enviado ao seu WhatsApp com sucesso.',
        });

        // Fechar dialog e limpar dados após sucesso
        setShowPrintDialog(false);
        setSummary(null);
      } else {
        const errorData = await response.text();
        console.error('❌ Erro na resposta:', errorData);
        throw new Error('Falha ao enviar para WhatsApp');
      }

    } catch (error) {
      console.error('❌ Error sending to WhatsApp:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao enviar relatório para WhatsApp',
      });
    } finally {
      setSendingReport(false);
    }
  };

  const printReport = async () => {
    if (!summary) return;

    try {
      const receiptNumber = `TURNO-${Date.now()}`;
      const now = new Date();

      // Preparar dados para impressão
      const paymentSummaryForPrint: Record<string, number> = {};
      Object.entries(summary.paymentSummary).forEach(([method, data]) => {
        paymentSummaryForPrint[method] = data.amount;
      });

      const reportData = {
        type: 'shift_closure',
        receiptNumber,
        date: now.toLocaleDateString('pt-BR'),
        time: now.toLocaleTimeString('pt-BR'),
        user: user?.name || 'Sistema',
        total: summary.totalAmount,
        shiftData: {
          totalSales: summary.totalSales,
          averageTicket: summary.averageTicket,
          paymentSummary: paymentSummaryForPrint,
          entryTotal: summary.totalAmount,
          exitTotal: summary.totalAmount,
          difference: 0,
        },
      };

      // Chamar edge function
      const { data, error } = await supabase.functions.invoke('print-receipt', {
        body: reportData,
      });

      if (error) throw error;

      toast({
        title: 'Relatório gerado!',
        description: 'Envie para a impressora térmica.',
      });

      console.log('Report text:', data.receiptText);
      setShowPrintDialog(false);
      // Limpa o resumo após a impressão
      setSummary(null);
    } catch (error) {
      console.error('Error printing report:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao gerar relatório para impressão',
      });
    }
  };

  const paymentMethodLabels: Record<string, string> = {
    'dinheiro': 'Dinheiro',
    'cartao_debito': 'Cartão de Débito',
    'cartao_credito': 'Cartão de Crédito',
    'pix': 'PIX',
    'cheque': 'Cheque',
    'outro': 'Outro',
    // Subcategorias de débito
    'visa_debito': 'Visa Débito',
    'elo_debito': 'Elo Débito',
    'maestro_debito': 'Maestro Débito',
    // Subcategorias de crédito
    'visa_credito': 'Visa Crédito',
    'elo_credito': 'Elo Crédito',
    'mastercard_credito': 'Mastercard Crédito',
    'amex_hipercard_credsystem': 'Amex / Hipercard / Credsystem',
  };

  const handleFinalizarTurno = async () => {
    setLoading(true);
    try {
      console.log('🔵 Abrindo relatório de turno...');
      
      // Apenas calcular resumo do turno, sem registrar saída
      console.log('📊 Calculando resumo do turno...');
      await calculateShiftSummary();
    } catch (error) {
      console.error('❌ Error opening shift report:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: `Erro ao abrir relatório: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      });
      setLoading(false);
    }
  };

  const calculateWorkedTime = async (): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('ponto')
        .select('entrada, saida')
        .eq('user_id', user?.id)
        .is('saida', null)
        .order('entrada', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) return '0h 0min';

      const entrada = new Date(data[0].entrada);
      const saida = new Date();
      const diffMs = saida.getTime() - entrada.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;

      return `${hours}h ${mins}min`;
    } catch (error) {
      return '0h 0min';
    }
  };

  const generatePDFReport = async () => {
    if (!summary) return;

    try {
      const doc = new jsPDF('portrait', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Função auxiliar para desenhar caixas
      const drawBox = (x: number, y: number, width: number, height: number) => {
        doc.rect(x, y, width, height);
      };

      // CABEÇALHO
      let yPos = 15;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('CONVENIÊNCIA CAMINHO CERTO', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`CAIXA: ${user?.name || 'Sistema'}`, 15, yPos);
      doc.text(`DATA: ${format(summary.endTime, "dd/MM/yyyy", { locale: ptBR })}`, pageWidth - 60, yPos);
      
      yPos += 6;
      doc.text('PERÍODO: NOITE', 15, yPos);

      yPos += 10;

      // ==================== SEÇÃO PRINCIPAL ====================
      const boxWidth = 180;

      // TOTAL DE VENDAS
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL DE VENDAS (R$)', 15, yPos);
      
      yPos += 6;
      drawBox(15, yPos, boxWidth, 25);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      
      // Cabeçalhos
      let currentY = yPos + 6;
      doc.text('OFF', 20, currentY);
      doc.text('CRÉDITO (CIGARROS)', 70, currentY);
      doc.text('TOTAL', 140, currentY);
      
      currentY += 2;
      doc.line(15, currentY, 15 + boxWidth, currentY);
      
      currentY += 6;
      doc.setFont('helvetica', 'normal');
      
      // Valores
      const offValue = summary.brandSummary['off']?.amount || 0;
      
      if (offValue > 0) {
        doc.text(offValue.toFixed(2), 20, currentY);
      }
      
      doc.text(summary.totalAmount.toFixed(2), 140, currentY);

      yPos += 30;

      // RESUMO CAIXA
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMO CAIXA (R$)', 15, yPos);
      
      yPos += 6;
      const caixaBoxHeight = 110;
      drawBox(15, yPos, boxWidth, caixaBoxHeight);
      
      currentY = yPos + 7;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      // Calcular totais por categoria
      const dinheiro = summary.paymentSummary['dinheiro']?.amount || 0;
      const pix = summary.paymentSummary['pix']?.amount || 0;
      
      // Débito - somar todas as bandeiras
      let totalDebito = 0;
      const debitoDetails: Record<string, number> = {};
      Object.entries(summary.brandSummary).forEach(([key, data]) => {
        if (key.startsWith('debito_')) {
          totalDebito += data.amount;
          const bandeira = key.replace('debito_', '');
          debitoDetails[bandeira] = data.amount;
        }
      });

      // Crédito - somar todas as bandeiras
      let totalCredito = 0;
      const creditoDetails: Record<string, number> = {};
      Object.entries(summary.brandSummary).forEach(([key, data]) => {
        if (key.startsWith('credito_')) {
          totalCredito += data.amount;
          const bandeira = key.replace('credito_', '');
          creditoDetails[bandeira] = data.amount;
        }
      });

      // Refeições
      const totalRefeicoes = summary.paymentSummary['vale_refeicao']?.amount || 0;

      // Listar pagamentos
      if (dinheiro > 0) {
        doc.text('Dinheiro:', 20, currentY);
        doc.text(`R$ ${dinheiro.toFixed(2)}`, 160, currentY);
        currentY += 5;
      }

      if (pix > 0) {
        doc.text('PIX:', 20, currentY);
        doc.text(`R$ ${pix.toFixed(2)}`, 160, currentY);
        currentY += 5;
      }

      // SUBTOTAL CRÉDITO
      currentY += 3;
      doc.setFont('helvetica', 'bold');
      doc.text('SUBTOTAL CRÉDITO:', 20, currentY);
      doc.text(`R$ ${totalCredito.toFixed(2)}`, 160, currentY);
      currentY += 5;
      
      doc.setFont('helvetica', 'normal');
      Object.entries(creditoDetails).forEach(([bandeira, valor]) => {
        doc.text(`  ${bandeira.toUpperCase()}:`, 25, currentY);
        doc.text(`R$ ${valor.toFixed(2)}`, 160, currentY);
        currentY += 4;
      });

      // SUBTOTAL DÉBITO
      currentY += 3;
      doc.setFont('helvetica', 'bold');
      doc.text('SUBTOTAL DÉBITO:', 20, currentY);
      doc.text(`R$ ${totalDebito.toFixed(2)}`, 160, currentY);
      currentY += 5;
      
      doc.setFont('helvetica', 'normal');
      Object.entries(debitoDetails).forEach(([bandeira, valor]) => {
        doc.text(`  ${bandeira.toUpperCase()}:`, 25, currentY);
        doc.text(`R$ ${valor.toFixed(2)}`, 160, currentY);
        currentY += 4;
      });

      // REFEIÇÕES
      if (totalRefeicoes > 0) {
        currentY += 3;
        doc.setFont('helvetica', 'bold');
        doc.text('REFEIÇÕES:', 20, currentY);
        doc.text(`R$ ${totalRefeicoes.toFixed(2)}`, 160, currentY);
        currentY += 5;
      }

      yPos += caixaBoxHeight + 8;

      // QUEBRA/SOBRA
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('QUEBRA / SOBRA', 15, yPos);
      
      yPos += 6;
      drawBox(15, yPos, boxWidth, 20);
      
      currentY = yPos + 10;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const diferenca = 0; // Calculado como Total Recebido - Total Vendido
      const diffText = diferenca >= 0 ? 'SOBRA' : 'FALTA';
      doc.text(`${diffText}: R$ ${Math.abs(diferenca).toFixed(2)}`, 20, currentY);

      yPos += 25;

      // SANGRIAS
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('SANGRIAS', 15, yPos);
      
      yPos += 6;
      drawBox(15, yPos, boxWidth, 25);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      currentY = yPos + 10;
      doc.text('Nenhuma sangria registrada', 20, currentY);

      // Informações adicionais do turno
      yPos += 35;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMAÇÕES DO TURNO', 15, yPos);
      
      yPos += 6;
      drawBox(15, yPos, boxWidth, 35);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      currentY = yPos + 7;
      
      doc.text(`Horário de Início: ${format(summary.startTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 20, currentY);
      currentY += 6;
      doc.text(`Horário de Fim: ${format(summary.endTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 20, currentY);
      currentY += 6;
      doc.text(`Tempo Trabalhado: ${workedTime}`, 20, currentY);
      currentY += 6;
      doc.text(`Número de Vendas: ${summary.totalSales}`, 20, currentY);
      currentY += 6;
      doc.text(`Ticket Médio: R$ ${summary.averageTicket.toFixed(2)}`, 20, currentY);

      // Footer
      const footerY = pageHeight - 15;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text('PDV-INOVAPRO - Sistema de Gestão', pageWidth / 2, footerY, { align: 'center' });
      doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}`, pageWidth / 2, footerY + 4, { align: 'center' });

      // Salvar PDF
      const fileName = `fechamento_turno_${user?.name}_${format(new Date(), 'ddMMyyyy_HHmmss')}.pdf`;
      doc.save(fileName);

      toast({
        title: 'PDF Gerado!',
        description: 'O relatório foi baixado com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao gerar o PDF do relatório.',
      });
    }
  };

  return (
    <Layout title="Finalizar Turno" showBack>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Botão Circular Grande de Finalizar Turno */}
        <Card className="bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 border-none text-white">
          <CardContent className="py-12">
            <div className="flex flex-col items-center space-y-6">
              <h2 className="text-2xl font-bold">Finalizar Turno - {user?.name}</h2>

              {/* Botão Circular Gigante */}
              <button
                onClick={handleFinalizarTurno}
                disabled={loading}
                className="group relative"
              >
                <div className={`
                  w-64 h-64 rounded-full
                  bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500
                  shadow-2xl
                  flex flex-col items-center justify-center
                  transition-all duration-300
                  ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-3xl cursor-pointer'}
                  ${!loading && 'animate-pulse'}
                `}>
                  <Clock className="w-20 h-20 mb-4 text-white" />
                  <span className="text-3xl font-bold text-white">Finalizar</span>
                  <span className="text-2xl font-bold text-white">Turno</span>
                </div>
              </button>

              {/* Tempo Trabalhado */}
              <div className="text-center bg-white/20 backdrop-blur-md rounded-lg px-8 py-4">
                <p className="text-sm opacity-90 mb-1">Tempo Total Trabalhado</p>
                <p className="text-4xl font-bold">{workedTime}</p>
              </div>

              <p className="text-center text-sm opacity-75 max-w-md">
                Ao clicar em "Finalizar Turno", seu ponto de saída será registrado automaticamente
                e os relatórios serão enviados via WhatsApp
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Dialog com Relatório */}
        <Dialog open={showReport} onOpenChange={setShowReport}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Relatório de Fechamento de Turno</DialogTitle>
            </DialogHeader>

            {summary && (
              <div className="space-y-6">
                {summary.totalSales === 0 ? (
                  // Sem vendas no turno
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center py-8">
                        <AlertTriangle className="w-16 h-16 mb-4 text-yellow-500" />
                        <h3 className="text-xl font-bold mb-2">Sem Vendas no Turno</h3>
                        <p className="text-muted-foreground mb-4">
                          Você não realizou vendas durante este turno.
                        </p>
                        <div className="bg-muted/50 rounded-lg px-6 py-4 w-full">
                          <p className="text-sm mb-2">
                            <strong>Horário do turno:</strong>
                          </p>
                          <p className="text-sm">
                            Início: {format(summary.startTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                          <p className="text-sm">
                            Fim: {format(summary.endTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                          <p className="text-sm mt-2">
                            <strong>Duração:</strong> {workedTime}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">
                          O comprovante de ponto será enviado ao seu WhatsApp.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  // Com vendas no turno
                  <>
                    {/* Resumo Geral */}
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex flex-col items-center text-center">
                            <Users className="w-8 h-8 mb-2 text-primary" />
                            <p className="text-sm text-muted-foreground">Total de Vendas</p>
                            <p className="text-2xl font-bold">{summary.totalSales}</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex flex-col items-center text-center">
                            <DollarSign className="w-8 h-8 mb-2 text-success" />
                            <p className="text-sm text-muted-foreground">Total Vendido</p>
                            <p className="text-2xl font-bold">R$ {summary.totalAmount.toFixed(2)}</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex flex-col items-center text-center">
                            <TrendingUp className="w-8 h-8 mb-2 text-info" />
                            <p className="text-sm text-muted-foreground">Ticket Médio</p>
                            <p className="text-2xl font-bold">R$ {summary.averageTicket.toFixed(2)}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Resumo por Forma de Pagamento */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Resumo por Forma de Pagamento</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {Object.entries(summary.paymentSummary).map(([method, data]) => (
                            <div key={method} className="flex justify-between items-center p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{paymentMethodLabels[method] || method}</p>
                                <p className="text-sm text-muted-foreground">{data.count} transações</p>
                              </div>
                              <p className="font-bold text-primary">R$ {data.amount.toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Diferença de Caixa */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Fechamento</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Entrada Total (A):</span>
                            <span className="font-medium">R$ {summary.totalAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Saída Total (B):</span>
                            <span className="font-medium">R$ {summary.totalAmount.toFixed(2)}</span>
                          </div>
                          <div className="border-t pt-2 flex justify-between font-bold">
                            <span>Diferença (B - A):</span>
                            <span className="text-success">R$ 0.00</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowReport(false)}>
                Cancelar
              </Button>
              <Button variant="secondary" onClick={generatePDFReport} disabled={loading}>
                <Download className="w-4 h-4 mr-2" />
                Gerar PDF
              </Button>
              <Button onClick={finalizeShift} disabled={loading}>
                {loading ? 'Finalizando...' : 'Finalizar e Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para Registro de Saída */}
        <ClockOutDialog
          open={showClockOutDialog}
          onClose={() => setShowClockOutDialog(false)}
          onClockOutSuccess={() => {
            toast({
              title: 'Ponto de saída registrado!',
              description: 'Seu ponto de saída foi registrado com sucesso.',
            });
          }}
        />

        {/* Dialog para Envio do Relatório */}
        <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Enviar Relatório
              </DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Clique no botão abaixo para enviar o relatório de fechamento de turno para o WhatsApp.
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPrintDialog(false)}
                disabled={sendingReport}
              >
                Cancelar
              </Button>
              <Button
                onClick={sendReportToWhatsApp}
                disabled={sendingReport}
              >
                <FileText className="w-4 h-4 mr-2" />
                {sendingReport ? 'Enviando...' : 'Enviar Relatório'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
