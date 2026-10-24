import { useTranslation } from 'react-i18next';

export default function RefundPolicy() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Refund Policy / Politique de Remboursement</h1>

        <div className="space-y-6 text-gray-700 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">1. Subscriptions (Pro & Institution)</h2>
            <p>
              You can cancel your subscription at any time from your account settings. 
              Upon cancellation, you will retain access to the paid features until the end of your current billing period. 
              <strong> We do not provide refunds for partial billing periods.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">1. Abonnements (Pro & Institution)</h2>
            <p>
              Vous pouvez annuler votre abonnement à tout moment depuis les paramètres de votre compte. 
              Suite à l'annulation, vous conserverez l'accès aux fonctionnalités payantes jusqu'à la fin de la période de facturation en cours. 
              <strong> Nous ne procédons à aucun remboursement pour les périodes de facturation partielles.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">2. One-time purchases (PAYG Credits)</h2>
            <p>
              Purchases of AI message credits (Pay-As-You-Go) are final and non-refundable, as they are consumed immediately upon use.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">2. Achats uniques (Crédits PAYG)</h2>
            <p>
              Les achats de crédits de messages IA (Pay-As-You-Go) sont définitifs et non remboursables, car ils sont consommés immédiatement lors de leur utilisation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">3. Exceptions</h2>
            <p>
              If you are a consumer located in the European Union, you may have a statutory right to withdraw from the contract within 14 days. However, by accessing or using the digital content or services immediately after purchase, you expressly consent to the immediate performance of the contract and waive your right of withdrawal.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">4. Contact</h2>
            <p>
              For any billing inquiries or disputes, please contact us at <a href="mailto:jacquesbene301@gmail.com" className="text-blue-600 hover:underline">jacquesbene301@gmail.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
