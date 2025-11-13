import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Perfil from "./pages/Perfil";
import NotFound from "./pages/NotFound";
import ControlePonto from "./pages/ControlePonto";
import MeusPontos from "./pages/MeusPontos";
import Usuarios from "./pages/Usuarios";
import Veiculos from "./pages/Veiculos";
import ProducaoAdmin from "./pages/ProducaoAdmin";
import ProducaoFuncionario from "./pages/ProducaoFuncionario";
import Expedicao from "./pages/Expedicao";
import Agendamentos from "./pages/Agendamentos";
import Horarios from "./pages/Horarios";
import Garantias from "./pages/Garantias";
import Recebimentos from "./pages/Recebimentos";
import Produtividade from "./pages/Produtividade";
import Jornada from "./pages/Jornada";

const queryClient = new QueryClient();

function RedirectIfAuthenticated() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return user ? <Navigate to="/dashboard" replace /> : <Login />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RedirectIfAuthenticated />} />
            <Route path="/login" element={<RedirectIfAuthenticated />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pdv"
              element={
                <ProtectedRoute>
                  <PDV />
                </ProtectedRoute>
              }
            />
            <Route
              path="/produtos"
              element={
                <ProtectedRoute>
                  <Produtos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/recebimento"
              element={
                <ProtectedRoute>
                  <Recebimento />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendas"
              element={
                <ProtectedRoute>
                  <HistoricoVendas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/movimentacoes"
              element={
                <ProtectedRoute>
                  <Movimentacoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/desperdicio"
              element={
                <ProtectedRoute>
                  <Desperdicio />
                </ProtectedRoute>
              }
            />
            <Route
              path="/venda-total"
              element={
                <ProtectedRoute adminOnly>
                  <VendaTotal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendas-admin"
              element={
                <ProtectedRoute adminOnly>
                  <VendasAdmin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/historico-turnos"
              element={
                <ProtectedRoute>
                  <HistoricoTurnos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/usuarios"
              element={
                <ProtectedRoute adminOnly>
                  <Usuarios />
                </ProtectedRoute>
              }
            />
            <Route
              path="/importar"
              element={
                <ProtectedRoute adminOnly>
                  <ImportarProdutos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/importar-sql"
              element={
                <ProtectedRoute adminOnly>
                  <ImportarProdutosSQL />
                </ProtectedRoute>
              }
            />
            <Route
              path="/consulta-produtos"
              element={
                <ProtectedRoute>
                  <ConsultaProdutos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/produtos-risco"
              element={
                <ProtectedRoute adminOnly>
                  <ProdutosRisco />
                </ProtectedRoute>
              }
            />
          <Route
              path="/finalizar-turno"
              element={
                <ProtectedRoute>
                  <FinalizarTurno />
                </ProtectedRoute>
              }
            />
            <Route
              path="/perfil"
              element={
                <ProtectedRoute adminOnly>
                  <Perfil />
                </ProtectedRoute>
              }
            />
            <Route
              path="/relatorio-estoque"
              element={
                <ProtectedRoute adminOnly>
                  <RelatorioEstoque />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventario"
              element={
                <ProtectedRoute>
                  <Inventario />
                </ProtectedRoute>
              }
            />
            <Route
              path="/controle-ponto"
              element={
                <ProtectedRoute adminOnly>
                  <ControlePonto />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meus-pontos"
              element={
                <ProtectedRoute>
                  <MeusPontos />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
