import React, { useEffect, useState } from 'react';
import { OrderDetails } from '../types';
import { formatCurrency } from '../utils/formatters';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Package,
  Truck,
  MapPin,
  Calendar,
  CreditCard,
  QrCode,
  Printer,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

interface OrderSuccessViewProps {
  order: OrderDetails;
  onReset: () => void;
  onGoToAdmin?: () => void;
}

export const OrderSuccessView: React.FC<OrderSuccessViewProps> = ({ order, onReset, onGoToAdmin }) => {
  const [showTrackingModal, setShowTrackingModal] = useState(false);

  useEffect(() => {
    // Fire confetti celebration on mount
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#059669', '#3b82f6', '#f59e0b'],
      });
    } catch {
      // ignore in environments without canvas support
    }
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-emerald-200 p-6 sm:p-8 text-center shadow-xs">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 animate-bounce">
          <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
          Transação Concluída
        </span>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
          Pagamento Aprovado com Sucesso!
        </h2>
        <p className="text-sm text-neutral-600 max-w-md mx-auto mt-2">
          Obrigado pela sua compra, <strong>{order.customer.name}</strong>. Enviamos a confirmação e os detalhes do
          pedido para <span className="font-semibold text-neutral-900">{order.customer.email}</span>.
        </p>

        {/* Order Meta Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-neutral-100 text-left">
          <div className="p-3 bg-neutral-50 rounded-xl">
            <span className="block text-[11px] text-neutral-500 font-medium">Pedido</span>
            <span className="font-mono font-bold text-sm text-neutral-900">{order.orderId}</span>
          </div>

          <div className="p-3 bg-neutral-50 rounded-xl">
            <span className="block text-[11px] text-neutral-500 font-medium">Data</span>
            <span className="font-medium text-xs sm:text-sm text-neutral-900 flex items-center gap-1 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
              {order.createdAt}
            </span>
          </div>

          <div className="p-3 bg-neutral-50 rounded-xl">
            <span className="block text-[11px] text-neutral-500 font-medium">Forma de Pagamento</span>
            <span className="font-semibold text-xs sm:text-sm text-neutral-900 flex items-center gap-1 mt-0.5 capitalize">
              {order.paymentMethod === 'pix' ? (
                <>
                  <QrCode className="w-3.5 h-3.5 text-emerald-600" /> Pix Instantâneo
                </>
              ) : (
                <>
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Cartão ({order.card?.installments}x)
                </>
              )}
            </span>
          </div>

          <div className="p-3 bg-neutral-50 rounded-xl">
            <span className="block text-[11px] text-neutral-500 font-medium">Total Pago</span>
            <span className="font-bold text-sm text-emerald-700">{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Details Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Shipping & Delivery Address */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <h4 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-neutral-700" />
              <span>Envio & Entrega</span>
            </h4>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              Sedex Expresso
            </span>
          </div>

          <div className="text-xs text-neutral-600 space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-neutral-900">
                  {order.customer.street}, {order.customer.number}
                  {order.customer.complement ? ` - ${order.customer.complement}` : ''}
                </p>
                <p>
                  {order.customer.neighborhood}, {order.customer.city} - {order.customer.state}
                </p>
                <p className="font-mono text-neutral-500">CEP: {order.customer.zipCode}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
              <div>
                <span className="text-neutral-500 block text-[11px]">Código de Rastreamento:</span>
                <span className="font-mono font-bold text-sm text-neutral-900">{order.trackingCode}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowTrackingModal(true)}
                className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <span>Rastrear</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <h4 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Comprovante de Pagamento</span>
            </h4>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              Aprovado
            </span>
          </div>

          <div className="space-y-2.5 text-xs text-neutral-600">
            {order.paymentMethod === 'pix' ? (
              <>
                <div className="flex justify-between">
                  <span>Método:</span>
                  <span className="font-semibold text-neutral-900">Pix Banco Central</span>
                </div>
                <div className="flex justify-between">
                  <span>Desconto Pix aplicado:</span>
                  <span className="font-semibold text-emerald-700">5% OFF</span>
                </div>
                <div className="flex justify-between">
                  <span>Autenticação Bancária:</span>
                  <span className="font-mono text-neutral-500">AUT-{Math.floor(10000000 + Math.random() * 90000000)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span>Bandeira:</span>
                  <span className="font-semibold text-neutral-900 uppercase">{order.card?.brand || 'Crédito'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cartão:</span>
                  <span className="font-mono text-neutral-900">•••• •••• •••• {order.card?.lastDigits || '9104'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Parcelas:</span>
                  <span className="font-semibold text-neutral-900">
                    {order.card?.installments}x de {formatCurrency(order.card?.installmentValue || order.total)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>NSU / Autorização:</span>
                  <span className="font-mono text-neutral-500">{Math.floor(100000 + Math.random() * 900000)}</span>
                </div>
              </>
            )}

            <div className="pt-2 border-t border-neutral-100 flex justify-between font-bold text-sm text-neutral-900">
              <span>Valor Total:</span>
              <span className="text-emerald-700">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Items Summary */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs">
        <h4 className="font-bold text-sm text-neutral-900 flex items-center gap-2 mb-4">
          <Package className="w-4 h-4 text-neutral-700" />
          <span>Itens Adquiridos ({order.items.reduce((a, b) => a + b.quantity, 0)})</span>
        </h4>

        <div className="divide-y divide-neutral-100">
          {order.items.map((item) => (
            <div key={item.id} className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-12 h-12 rounded-lg object-cover bg-neutral-100 border border-neutral-200 flex-shrink-0"
                />
                <div>
                  <h5 className="font-semibold text-sm text-neutral-900 leading-tight">{item.name}</h5>
                  <p className="text-xs text-neutral-500">{item.variant}</p>
                  <span className="text-xs text-neutral-600 font-medium">Quantidade: {item.quantity}</span>
                </div>
              </div>
              <div className="text-right font-bold text-sm text-neutral-900">
                {formatCurrency(item.price * item.quantity)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={handlePrint}
          className="flex-1 py-3 px-4 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
        >
          <Printer className="w-4 h-4 text-neutral-600" />
          <span>Imprimir Comprovante</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          className="flex-1 py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Voltar à Loja</span>
        </button>
      </div>

      {/* Tracking Simulation Modal */}
      {showTrackingModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-neutral-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h4 className="font-bold text-base text-neutral-900">Rastreamento de Envio</h4>
                <p className="text-xs font-mono text-neutral-500">{order.trackingCode}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTrackingModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center hover:bg-neutral-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 py-2">
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  ✓
                </div>
                <div>
                  <h5 className="font-bold text-xs text-neutral-900">Pedido Aprovado e Pago</h5>
                  <p className="text-[11px] text-neutral-500">Hoje às {order.createdAt.split(' ')[1] || '10:00'}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  📦
                </div>
                <div>
                  <h5 className="font-bold text-xs text-neutral-900">Em Separação no Centro de Distribuição</h5>
                  <p className="text-[11px] text-neutral-500">Previsão de coleta nas próximas 3 horas</p>
                </div>
              </div>

              <div className="flex gap-3 opacity-50">
                <div className="w-7 h-7 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  🚚
                </div>
                <div>
                  <h5 className="font-bold text-xs text-neutral-900">Objeto em Trânsito para Entrega</h5>
                  <p className="text-[11px] text-neutral-500">Estimativa: 2 a 4 dias úteis</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowTrackingModal(false)}
              className="w-full py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-bold"
            >
              Fechar Rastreamento
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
