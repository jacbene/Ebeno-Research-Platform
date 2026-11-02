// frontend/src/pages/ContactPage.tsx
export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow border border-transparent dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Contactez-nous / Contact Us
        </h1>

        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Pour toute question concernant la plateforme Ebeno Research Platform, la facturation
          ou le support technique, veuillez nous contacter par email. Nous répondons sous 24 à 48h.
        </p>
        <p className="text-gray-700 dark:text-gray-300 mb-8">
          For any questions regarding the Ebeno Research Platform, billing, or technical support,
          please contact us by email. We aim to respond within 24-48 hours.
        </p>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h2 className="text-lg font-bold text-blue-900 dark:text-blue-200 mb-2">📧 Email Support</h2>
          <a
            href="mailto:contact@ebenoresearch.com"
            className="text-xl text-blue-600 dark:text-blue-400 hover:underline font-mono break-all"
          >
            contact@ebenoresearch.com
          </a>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
            Nous répondons sous 24-48h ouvrées / We reply within 24-48 business hours
          </p>
        </div>

        <div className="mt-8 text-sm text-gray-500 dark:text-gray-400 space-y-1">
          <p>
            <strong className="text-gray-700 dark:text-gray-300">Business name :</strong> Ebeno Research Platform
          </p>
          <p>
            <strong className="text-gray-700 dark:text-gray-300">Owner :</strong> Jacques Bene Mbama
          </p>
          <p>
            <strong className="text-gray-700 dark:text-gray-300">Location :</strong> Yaoundé, Cameroon
          </p>
        </div>

        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            <strong className="text-gray-700 dark:text-gray-300">Billing Inquiries :</strong> For any billing, refund, or subscription questions, please contact our Merchant of Record support team directly through your account portal.
          </p>
        </div>
      </div>
    </div>
  );
}
