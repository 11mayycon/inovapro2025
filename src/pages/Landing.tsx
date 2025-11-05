import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  ShoppingCart,
  Package,
  BarChart3,
  Users,
  MessageSquare,
  Shield,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Menu,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import logoImage from '@/assets/inovapro-logo.png';

const LINK_TESTE = 'https://pdv.inovapro.cloud/';
const LINK_CHECKOUT = 'https://buy.stripe.com/5kQaEYgGd1LlcfO9Jz83C03';

export default function Landing() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Particles Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(236,72,153,0.1),transparent_50%)]" />
      </div>

      {/* Navbar */}
      <Navbar
        isScrolled={isScrolled}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        scrollToSection={scrollToSection}
      />

      {/* Hero Section */}
      <HeroSection opacity={opacity} />

      {/* Trust Badges */}
      <TrustSection />

      {/* Benefits */}
      <BenefitsSection />

      {/* How It Works */}
      <HowItWorksSection />

      {/* Features */}
      <FeaturesSection />

      {/* Pricing */}
      <PricingSection />

      {/* Testimonials */}
      <TestimonialsSection />

      {/* FAQ */}
      <FAQSection />

      {/* Final CTA */}
      <FinalCTASection />

      {/* Footer */}
      <Footer />
    </div>
  );
}

function Navbar({ isScrolled, isMenuOpen, setIsMenuOpen, scrollToSection }: any) {
  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-slate-950/80 backdrop-blur-xl border-b border-purple-500/20 shadow-lg shadow-purple-500/10'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="PDV InovaPro" className="h-10 w-auto" />
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              PDV InovaPro
            </span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-6">
            <button onClick={() => scrollToSection('beneficios')} className="hover:text-purple-400 transition">
              Benefícios
            </button>
            <button onClick={() => scrollToSection('como-funciona')} className="hover:text-purple-400 transition">
              Como Funciona
            </button>
            <button onClick={() => scrollToSection('recursos')} className="hover:text-purple-400 transition">
              Recursos
            </button>
            <button onClick={() => scrollToSection('planos')} className="hover:text-purple-400 transition">
              Planos
            </button>
            <button onClick={() => scrollToSection('faq')} className="hover:text-purple-400 transition">
              FAQ
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <Button 
              variant="ghost" 
              asChild 
              className="border-2 border-cyan-400 bg-transparent text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200 hover:border-cyan-300"
            >
              <a href={LINK_TESTE} target="_blank" rel="noopener noreferrer">
                Testar Agora
              </a>
            </Button>
            <Button
              asChild
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/50"
            >
              <a href={LINK_CHECKOUT} target="_blank" rel="noopener noreferrer">
                Assinar
              </a>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button className="lg:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="lg:hidden mt-4 space-y-4 pb-4"
          >
            <button onClick={() => scrollToSection('beneficios')} className="block w-full text-left py-2">
              Benefícios
            </button>
            <button onClick={() => scrollToSection('como-funciona')} className="block w-full text-left py-2">
              Como Funciona
            </button>
            <button onClick={() => scrollToSection('recursos')} className="block w-full text-left py-2">
              Recursos
            </button>
            <button onClick={() => scrollToSection('planos')} className="block w-full text-left py-2">
              Planos
            </button>
            <button onClick={() => scrollToSection('faq')} className="block w-full text-left py-2">
              FAQ
            </button>
            <div className="space-y-2 pt-4">
              <Button 
                variant="outline" 
                asChild 
                className="w-full border-2 border-cyan-400 bg-transparent text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200"
              >
                <a href={LINK_TESTE} target="_blank" rel="noopener noreferrer">
                  Testar Agora
                </a>
              </Button>
              <Button 
                asChild 
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500"
              >
                <a href={LINK_CHECKOUT} target="_blank" rel="noopener noreferrer">
                  Assinar
                </a>
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
}

function HeroSection({ opacity }: any) {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-24 pb-12 px-4">
      <motion.div style={{ opacity }} className="container mx-auto text-center max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/50 text-sm px-4 py-2">
            <Sparkles className="inline mr-2 h-4 w-4" />
            Sistema de Gestão Inteligente
          </Badge>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Gestão rápida,
            </span>
            <br />
            <span className="text-white">elegante e inteligente</span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto">
            Vendas ágeis, estoque sob controle e relatórios automáticos — tudo em um único painel.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              asChild
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-2xl shadow-purple-500/50 text-lg px-8 py-6 group"
            >
              <Link to="/login">
                Testar Agora
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-2 border-pink-400 bg-transparent text-pink-300 hover:border-pink-300 hover:bg-pink-500/20 hover:text-pink-200 text-lg px-8 py-6"
            >
              <a href={LINK_CHECKOUT} target="_blank" rel="noopener noreferrer">
                Assinar com Desconto
              </a>
            </Button>
          </div>

          <div className="inline-block bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl px-6 py-3">
            <p className="text-sm text-slate-300">
              <span className="line-through text-slate-500">R$ 300,00</span>{' '}
              <span className="text-2xl font-bold text-purple-300 ml-2">R$ 149,60</span>
              <span className="text-slate-400 ml-2">no 1º mês</span>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

function TrustSection() {
  const features = [
    { icon: Shield, text: 'Checkout seguro' },
    { icon: Users, text: 'Suporte humano + IA' },
    { icon: BarChart3, text: 'Relatórios automáticos' },
    { icon: Sparkles, text: 'Funciona em qualquer dispositivo' },
  ];

  return (
    <section className="py-12 px-4 border-y border-purple-500/10">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -5 }}
              className="flex flex-col items-center gap-3 p-4 rounded-xl bg-slate-900/50 border border-purple-500/20 hover:border-purple-400/50 transition cursor-default"
            >
              <feature.icon className="h-8 w-8 text-purple-400" />
              <p className="text-sm text-center text-slate-300">{feature.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  const benefits = [
    {
      icon: Zap,
      title: 'Vendas sem fila',
      description: 'Fluxo simples, rápido e sem travar. Atendimento ágil que mantém seus clientes satisfeitos.',
      gradient: 'from-yellow-400 to-orange-500',
      iconBg: 'from-yellow-500/30 to-orange-500/30',
      iconColor: 'text-yellow-400',
      shadow: 'shadow-yellow-500/30',
    },
    {
      icon: Package,
      title: 'Estoque preciso',
      description: 'Entradas, saídas e alertas de reposição automáticos. Nunca perca vendas por falta de produto.',
      gradient: 'from-blue-400 to-cyan-500',
      iconBg: 'from-blue-500/30 to-cyan-500/30',
      iconColor: 'text-blue-400',
      shadow: 'shadow-blue-500/30',
    },
    {
      icon: BarChart3,
      title: 'Relatórios em 1 clique',
      description: 'PDF e Excel automáticos com todos os dados que você precisa para tomar decisões.',
      gradient: 'from-purple-400 to-pink-500',
      iconBg: 'from-purple-500/30 to-pink-500/30',
      iconColor: 'text-purple-400',
      shadow: 'shadow-purple-500/30',
    },
    {
      icon: Clock,
      title: 'Equipe sob controle',
      description: 'Ponto digital e acompanhamento de produtividade em tempo real.',
      gradient: 'from-green-400 to-emerald-500',
      iconBg: 'from-green-500/30 to-emerald-500/30',
      iconColor: 'text-green-400',
      shadow: 'shadow-green-500/30',
    },
    {
      icon: MessageSquare,
      title: 'WhatsApp inteligente',
      description: 'IA responde clientes 24/7 e transfere ao humano quando necessário.',
      gradient: 'from-cyan-400 to-teal-500',
      iconBg: 'from-cyan-500/30 to-teal-500/30',
      iconColor: 'text-cyan-400',
      shadow: 'shadow-cyan-500/30',
    },
    {
      icon: TrendingUp,
      title: 'Multi-loja/escala',
      description: 'Preparado para crescer. Gerencie múltiplas unidades de forma centralizada.',
      gradient: 'from-pink-400 to-rose-500',
      iconBg: 'from-pink-500/30 to-rose-500/30',
      iconColor: 'text-pink-400',
      shadow: 'shadow-pink-500/30',
    },
  ];

  return (
    <section id="beneficios" className="py-24 px-4">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Por que escolher
            </span>{' '}
            o PDV InovaPro?
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Tudo que você precisa para gerenciar seu negócio com eficiência
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group"
            >
              <Card className={`h-full bg-slate-900/70 backdrop-blur-sm border-2 border-slate-700/50 hover:border-slate-600 transition-all duration-300 hover:shadow-2xl hover:${benefit.shadow}`}>
                <CardHeader>
                  <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${benefit.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg ${benefit.shadow}`}>
                    <benefit.icon className={`h-8 w-8 ${benefit.iconColor}`} />
                  </div>
                  <CardTitle className={`text-2xl bg-gradient-to-r ${benefit.gradient} bg-clip-text text-transparent`}>
                    {benefit.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-slate-300 text-base leading-relaxed">{benefit.description}</CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      title: 'Conecte & Teste',
      description: 'Acesse o ambiente e faça uma venda de demonstração.',
      icon: Zap,
    },
    {
      number: '02',
      title: 'Configure',
      description: 'Cadastre produtos e equipe em minutos.',
      icon: Package,
    },
    {
      number: '03',
      title: 'Venda & Acompanhe',
      description: 'Relatórios automáticos e gestão em tempo real.',
      icon: BarChart3,
    },
  ];

  return (
    <section id="como-funciona" className="py-24 px-4 bg-slate-900/30">
      <div className="container mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Como funciona</h2>
          <p className="text-xl text-slate-400">Comece em 3 passos simples</p>
        </motion.div>

        <div className="space-y-12">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: idx % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2 }}
              className="flex flex-col md:flex-row items-center gap-8"
            >
              <div className="flex-shrink-0">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-xl shadow-purple-500/50">
                  <step.icon className="h-10 w-10 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="text-6xl font-bold text-purple-500/20 mb-2">{step.number}</div>
                <h3 className="text-2xl font-bold mb-2">{step.title}</h3>
                <p className="text-slate-400 text-lg">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row gap-4 justify-center mt-16"
        >
          <Button
            size="lg"
            asChild
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-xl shadow-purple-500/50"
          >
            <a href={LINK_TESTE} target="_blank" rel="noopener noreferrer">
              Testar Agora
            </a>
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
            className="border-2 border-pink-400 bg-transparent text-pink-300 hover:border-pink-300 hover:bg-pink-500/20 hover:text-pink-200"
          >
            <a href={LINK_CHECKOUT} target="_blank" rel="noopener noreferrer">
              Assinar com Desconto
            </a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      title: 'Vendas & Caixa',
      items: [
        'Interface rápida e intuitiva',
        'Múltiplas formas de pagamento',
        'Cupom fiscal automático',
        'Gestão de turnos e sangrias',
      ],
    },
    {
      title: 'Estoque & Inventário',
      items: [
        'Controle de entrada e saída',
        'Alertas de estoque mínimo',
        'Inventário simplificado',
        'Rastreamento de lotes',
      ],
    },
    {
      title: 'Relatórios & PDFs',
      items: [
        'Relatórios de vendas automáticos',
        'Exportação para Excel',
        'Dashboards em tempo real',
        'Análise de desempenho',
      ],
    },
    {
      title: 'Ponto & Equipe',
      items: [
        'Registro de ponto digital',
        'Controle de jornada',
        'Relatórios de produtividade',
        'Gestão de turnos',
      ],
    },
    {
      title: 'Integração WhatsApp',
      items: [
        'IA responde clientes 24/7',
        'Transferência para humano',
        'Histórico de conversas',
        'Notificações automáticas',
      ],
    },
    {
      title: 'Segurança e Auditoria',
      items: [
        'Backup automático',
        'Log de todas as operações',
        'Controle de permissões',
        'Criptografia de dados',
      ],
    },
  ];

  return (
    <section id="recursos" className="py-24 px-4 bg-slate-900/30">
      <div className="container mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Recursos completos</h2>
          <p className="text-xl text-slate-400">Tudo que você precisa em um só lugar</p>
        </motion.div>

        <Accordion type="single" collapsible className="space-y-4">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
            >
              <AccordionItem
                value={`item-${idx}`}
                className="border border-purple-500/20 rounded-xl px-6 bg-slate-900/50 backdrop-blur-sm hover:border-purple-400/50 transition"
              >
                <AccordionTrigger className="text-xl font-semibold hover:text-purple-400">
                  {feature.title}
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 mt-4">
                    {feature.items.map((item, itemIdx) => (
                      <li key={itemIdx} className="flex items-start gap-3 text-slate-400">
                        <CheckCircle2 className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function PricingSection() {
  const features = [
    'Todas as funcionalidades incluídas',
    'Vendas ilimitadas',
    'Relatórios automáticos',
    'Suporte prioritário',
    'Atualizações gratuitas',
    'Backup automático',
    'Múltiplos usuários',
    'Integração WhatsApp',
  ];

  return (
    <section id="planos" className="py-24 px-4 relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-indigo-950/30 to-slate-950" />
      
      <div className="container mx-auto max-w-4xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Plano Único</h2>
          <p className="text-xl text-slate-400">Tudo incluído, sem surpresas</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ 
            duration: 0.6,
            ease: [0.19, 1, 0.22, 1]
          }}
          whileHover={{ 
            y: -5,
            transition: { duration: 0.3 }
          }}
          className="relative card-float"
        >
          {/* Outer glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-blue-500 to-pink-600 rounded-3xl blur-xl opacity-30 neon-glow-border" />
          
          {/* Main card */}
          <Card className="relative bg-gradient-to-br from-slate-900/90 via-indigo-950/50 to-slate-900/90 backdrop-blur-xl border-2 border-purple-500/40 rounded-3xl overflow-hidden">
            {/* Shimmer overlay */}
            <div className="absolute inset-0 shimmer-effect pointer-events-none" />
            
            <CardHeader className="text-center pb-8 pt-10 relative">
              {/* Badge */}
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mb-6"
              >
                <Badge className="bg-gradient-to-r from-green-500/30 to-emerald-500/30 text-green-300 border-green-400/50 text-sm px-4 py-2 backdrop-blur-sm">
                  <Sparkles className="inline mr-2 h-4 w-4" />
                  50% OFF no 1º mês
                </Badge>
              </motion.div>

              {/* Pricing */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-center gap-6">
                  <span className="text-3xl line-through text-slate-500 opacity-60">R$ 300,00</span>
                  <div className="relative">
                    <span className="text-7xl font-black text-transparent bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text price-pulse">
                      R$ 149,60
                    </span>
                  </div>
                </div>
                <p className="text-slate-300 text-lg">no primeiro mês</p>
                <p className="text-sm text-slate-500">depois R$ 300/mês</p>
              </motion.div>
            </CardHeader>

            <CardContent className="space-y-8 px-8 pb-10">
              {/* Features list */}
              <ul className="space-y-4">
                {features.map((feature, idx) => (
                  <motion.li
                    key={idx}
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ 
                      delay: 0.4 + idx * 0.05,
                      duration: 0.5,
                      ease: "easeOut"
                    }}
                    whileHover={{ x: 5 }}
                    className="flex items-center gap-4 group"
                  >
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        delay: idx * 0.2
                      }}
                    >
                      <CheckCircle2 className="h-6 w-6 text-green-400 flex-shrink-0 drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
                    </motion.div>
                    <span className="text-slate-100 text-lg group-hover:text-white transition-colors">
                      {feature}
                    </span>
                  </motion.li>
                ))}
              </ul>

              {/* CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8 }}
              >
                <Button
                  size="lg"
                  asChild
                  className="w-full relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-500 hover:via-pink-500 hover:to-blue-500 text-white shadow-2xl shadow-purple-500/50 text-lg py-7 rounded-2xl border-2 border-purple-400/30 group transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_60px_rgba(168,85,247,0.6)]"
                >
                  <a href={LINK_CHECKOUT} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                    <span className="font-bold">Assinar com Desconto</span>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </a>
                </Button>
              </motion.div>

              {/* Footer text */}
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 0.8 }}
                viewport={{ once: true }}
                transition={{ delay: 1 }}
                className="text-center text-sm text-slate-400 pt-4"
              >
                💜 Satisfação garantida — suporte humano + IA inteligente.
              </motion.p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Maria Silva',
      role: 'Supermercado Bom Preço',
      city: 'São Paulo, SP',
      content: 'Reduziu o tempo de caixa em 40%. Minha equipe adora a simplicidade do sistema!',
      initials: 'MS',
    },
    {
      name: 'João Santos',
      role: 'Posto Estrela',
      city: 'Rio de Janeiro, RJ',
      content: 'Os relatórios automáticos economizaram horas do meu dia. Recomendo!',
      initials: 'JS',
    },
    {
      name: 'Ana Costa',
      role: 'Loja da Esquina',
      city: 'Belo Horizonte, MG',
      content: 'Suporte excepcional e sistema super estável. Melhor investimento que fiz.',
      initials: 'AC',
    },
  ];

  return (
    <section className="py-24 px-4 bg-slate-900/30">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">O que dizem nossos clientes</h2>
          <p className="text-xl text-slate-400">Histórias reais de sucesso</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((testimonial, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -8 }}
            >
              <Card className="h-full bg-slate-900/50 backdrop-blur-sm border-purple-500/20 hover:border-purple-400/50 transition">
                <CardHeader>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold">
                      {testimonial.initials}
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-slate-400">{testimonial.role}</p>
                      <p className="text-xs text-slate-500">{testimonial.city}</p>
                    </div>
                  </div>
                  <p className="text-slate-300 italic">&ldquo;{testimonial.content}&rdquo;</p>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const faqs = [
    {
      question: 'Posso testar antes de assinar?',
      answer:
        'Sim! Disponibilizamos um ambiente de teste completo com acesso imediato. Basta usar as credenciais fornecidas nesta página.',
    },
    {
      question: 'Como faço a migração de produtos?',
      answer:
        'O sistema oferece importação via planilha Excel/CSV. Nossa equipe também pode auxiliar na migração inicial sem custo adicional.',
    },
    {
      question: 'Funciona offline?',
      answer:
        'O sistema funciona 100% online, garantindo sincronização em tempo real e acesso de qualquer lugar. Requer conexão estável com internet.',
    },
    {
      question: 'E se eu precisar de suporte humano?',
      answer:
        'Oferecemos suporte prioritário via WhatsApp, chat e email. Nossa equipe está pronta para ajudar durante horário comercial.',
    },
    {
      question: 'Posso cancelar quando quiser?',
      answer:
        'Sim, não há fidelidade. Você pode cancelar a qualquer momento e seus dados ficam disponíveis por 30 dias após o cancelamento.',
    },
  ];

  return (
    <section id="faq" className="py-24 px-4">
      <div className="container mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Perguntas Frequentes</h2>
          <p className="text-xl text-slate-400">Tire suas dúvidas</p>
        </motion.div>

        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
            >
              <AccordionItem
                value={`faq-${idx}`}
                className="border border-purple-500/20 rounded-xl px-6 bg-slate-900/50 backdrop-blur-sm hover:border-purple-400/50 transition"
              >
                <AccordionTrigger className="text-lg font-semibold hover:text-purple-400">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-400">{faq.answer}</AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function FinalCTASection() {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-pink-900/20" />
      <div className="container mx-auto max-w-4xl relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="text-center space-y-8"
        >
          <h2 className="text-4xl md:text-6xl font-bold">
            Pronto para{' '}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              transformar
            </span>{' '}
            sua gestão?
          </h2>

          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Junte-se a centenas de empresas que já escolheram o PDV InovaPro
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              asChild
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-2xl shadow-purple-500/50 text-lg px-8 py-6"
            >
              <a href={LINK_TESTE} target="_blank" rel="noopener noreferrer">
                Testar Agora Grátis
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-2 border-pink-400 bg-transparent text-pink-300 hover:border-pink-300 hover:bg-pink-500/20 hover:text-pink-200 text-lg px-8 py-6"
            >
              <a href={LINK_CHECKOUT} target="_blank" rel="noopener noreferrer">
                Assinar com 50% OFF
              </a>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-purple-500/20 py-12 px-4">
      <div className="container mx-auto text-center space-y-4">
        <div className="flex items-center justify-center gap-3 mb-6">
          <img src={logoImage} alt="PDV InovaPro" className="h-8 w-auto" />
          <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            PDV InovaPro
          </span>
        </div>
        <p className="text-slate-400">by InovaPro Technology</p>
        <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
          <a href="#" className="hover:text-purple-400 transition">
            Termos
          </a>
          <span>•</span>
          <a href="#" className="hover:text-purple-400 transition">
            Privacidade
          </a>
          <span>•</span>
          <a href="#" className="hover:text-purple-400 transition">
            Suporte
          </a>
        </div>
        <p className="text-xs text-slate-600 mt-8">
          © {new Date().getFullYear()} PDV InovaPro. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
