export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Contactez-nous / Contact Us</h1>

        <p className="text-gray-700 mb-4">
          Pour toute question concernant la plateforme Ebeno Research Platform, la facturation 
          ou le support technique, veuillez nous contacter par email. Nous répondons sous 24 à 48h.
        </p>
        <p className="text-gray-700 mb-8">
          For any questions regarding the Ebeno Research Platform, billing, or technical support, 
          please contact us by email. We aim to respond within 24-48 hours.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-blue-900 mb-2">📧 Email</h2>
          <a
            href="mailto:jacquesbene301@gmail.com"
            className="text-xl text-blue-600 hover:underline font-mono break-all"
          >
            jacquesbene301@gmail.com
          </a>
        </div>

        <div className="mt-8 text-sm text-gray-500 space-y-1">
          <p><strong>Business name :</strong> Ebeno Research Platform</p>
          <p><strong>Owner :</strong> Jacques Bene Mbama</p>
          <p><strong>Location :</strong> Cameroon</p>
        </div>
      </div>
    </div>
  );
}
