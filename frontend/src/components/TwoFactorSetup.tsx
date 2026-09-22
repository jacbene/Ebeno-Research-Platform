// frontend/src/components/TwoFactorSetup.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { api } from '../services/api';

interface TwoFactorStatus {
  enabled: boolean;
  enabledAt: string | null;
  backupCodesRemaining: number;
}

export const TwoFactorSetup: React.FC = () => {
  const { colors } = useTheme();
  const toast = useToast();
  const { t } = useTranslation();

  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'idle' | 'scan' | 'confirm' | 'backup-codes'>('idle');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [confirmCode, setConfirmCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState('');
  const [busy, setBusy] = useState(false);

  // ============================================================
  // Charger le statut
  // ============================================================
  const loadStatus = async () => {
    try {
      const res = await api.get('/2fa/status');
      if (res.data.success) setStatus(res.data.data);
    } catch (error) {
      console.error('❌ Erreur statut 2FA:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  // ============================================================
  // ÉTAPE 1 : Setup → obtenir QR
  // ============================================================
  const startSetup = async () => {
    setBusy(true);
    try {
      const res = await api.post('/2fa/setup');
      if (res.data.success) {
        setQrCode(res.data.data.qrCodeDataUrl);
        setSecret(res.data.data.secret);
        setStep('scan');
      }
    } catch (error: any) {
      toast.addToast({
        type: 'error',
        title: t('common.error'),
        message: error.response?.data?.message || 'Erreur lors du setup',
      });
    } finally {
      setBusy(false);
    }
  };

  // ============================================================
  // ÉTAPE 2 : Confirmer avec un code
  // ============================================================
  const confirmEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmCode || confirmCode.length !== 6) {
      toast.addToast({ type: 'error', title: 'Code à 6 chiffres requis' });
      return;
    }

    setBusy(true);
    try {
      const res = await api.post('/2fa/enable', { code: confirmCode });
      if (res.data.success) {
        setBackupCodes(res.data.data.backupCodes);
        setStep('backup-codes');
        setConfirmCode('');
        toast.addToast({ type: 'success', title: '🔐 2FA activée' });
      }
    } catch (error: any) {
      toast.addToast({
        type: 'error',
        title: t('common.error'),
        message: error.response?.data?.message || 'Code invalide',
      });
    } finally {
      setBusy(false);
    }
  };

  // ============================================================
  // ÉTAPE 3 : Fin — recharger le statut
  // ============================================================
  const finishSetup = async () => {
    setStep('idle');
    setBackupCodes([]);
    setQrCode('');
    setSecret('');
    await loadStatus();
  };

  // ============================================================
  // Désactiver 2FA
  // ============================================================
  const disable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword) return;

    setBusy(true);
    try {
      const res = await api.post('/2fa/disable', { password: disablePassword });
      if (res.data.success) {
        setDisablePassword('');
        toast.addToast({ type: 'success', title: '2FA désactivée' });
        await loadStatus();
      }
    } catch (error: any) {
      toast.addToast({
        type: 'error',
        title: t('common.error'),
        message: error.response?.data?.message || 'Erreur',
      });
    } finally {
      setBusy(false);
    }
  };

  // ============================================================
  // Copier codes de secours
  // ============================================================
  const copyBackupCodes = () => {
    const text = backupCodes.join('\n');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.addToast({ type: 'success', title: '📋 Codes copiés' });
    }
  };

  const downloadBackupCodes = () => {
    const content = `Codes de secours 2FA — Ebeno Research\n\n` +
      backupCodes.map((c, i) => `${i + 1}. ${c}`).join('\n') +
      `\n\n⚠️ Conservez ces codes dans un endroit sûr.\n` +
      `Chaque code ne peut être utilisé qu'une seule fois.\n` +
      `Généré le ${new Date().toLocaleString('fr-FR')}\n`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_codes_2fa_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <p style={{ fontSize: '13px', color: colors.gray[500] }}>Chargement...</p>;
  }

  // ============================================================
  // RENDU : ÉTAPE "BACKUP CODES"
  // ============================================================
  if (step === 'backup-codes') {
    return (
      <div>
        <div
          style={{
            padding: '14px',
            backgroundColor: '#fff3cd',
            borderLeft: '3px solid #ffc107',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#856404',
          }}
        >
          ⚠️ <strong>Ces codes ne seront plus jamais affichés.</strong>
          <br />
          Conservez-les dans un endroit sûr (gestionnaire de mots de passe).
          Chacun ne peut être utilisé qu'<strong>une seule fois</strong>.
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            padding: '14px',
            backgroundColor: colors.gray[50] || '#fafafa',
            border: `1px solid ${colors.gray[200]}`,
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '13px',
            marginBottom: '16px',
          }}
        >
          {backupCodes.map((code, i) => (
            <div
              key={i}
              style={{
                padding: '6px 10px',
                backgroundColor: colors.white,
                borderRadius: '4px',
                textAlign: 'center',
                fontWeight: 'bold',
                color: colors.dark,
              }}
            >
              {code}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button variant="outline" size="sm" onClick={copyBackupCodes}>
            📋 Copier
          </Button>
          <Button variant="outline" size="sm" onClick={downloadBackupCodes}>
            📥 Télécharger
          </Button>
          <Button variant="primary" size="sm" onClick={finishSetup}>
            ✓ J'ai sauvegardé mes codes
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDU : ÉTAPE "SCAN"
  // ============================================================
  if (step === 'scan') {
    return (
      <div>
        <h4 style={{ marginTop: 0, color: colors.dark }}>
          Étape 1 : Scannez ce QR code
        </h4>
        <p style={{ fontSize: '13px', color: colors.gray[600], marginBottom: '16px' }}>
          Ouvrez votre application d'authentification (Google Authenticator, Authy, 1Password)
          et scannez le QR code.
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '16px',
            padding: '16px',
            backgroundColor: colors.white,
            borderRadius: '8px',
            border: `1px solid ${colors.gray[200]}`,
          }}
        >
          {qrCode && (
            <img src={qrCode} alt="QR 2FA" style={{ width: '200px', height: '200px' }} />
          )}
        </div>

        <div
          style={{
            padding: '10px 14px',
            backgroundColor: colors.gray[50] || '#fafafa',
            borderRadius: '6px',
            fontSize: '12px',
            color: colors.gray[600],
            marginBottom: '16px',
          }}
        >
          <strong>Ou saisissez ce code manuellement :</strong>
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '14px',
              fontWeight: 'bold',
              color: colors.dark,
              marginTop: '6px',
              padding: '8px',
              backgroundColor: colors.white,
              borderRadius: '4px',
              textAlign: 'center',
              letterSpacing: '2px',
              wordBreak: 'break-all',
            }}
          >
            {secret}
          </div>
        </div>

        <form onSubmit={confirmEnable}>
          <Input
            label="Étape 2 : Entrez le code à 6 chiffres"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={confirmCode}
            onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            autoFocus
          />

          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <Button type="submit" variant="primary" disabled={busy || confirmCode.length !== 6}>
              {busy ? '⏳ Vérification...' : '✓ Activer la 2FA'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStep('idle');
                setQrCode('');
                setSecret('');
                setConfirmCode('');
              }}
            >
              Annuler
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // ============================================================
  // RENDU : STATUT (activé ou désactivé)
  // ============================================================
  return (
    <div>
      {status?.enabled ? (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              backgroundColor: `${colors.success}15`,
              borderLeft: `3px solid ${colors.success}`,
              borderRadius: '8px',
              marginBottom: '16px',
            }}
          >
            <span style={{ fontSize: '24px' }}>🔐</span>
            <div>
              <strong style={{ color: colors.dark, fontSize: '14px' }}>
                2FA activée
              </strong>
              <div style={{ fontSize: '12px', color: colors.gray[600], marginTop: '2px' }}>
                {status.enabledAt && (
                  <>Activée le {new Date(status.enabledAt).toLocaleDateString('fr-FR')}</>
                )}
                {status.backupCodesRemaining > 0 && (
                  <> • {status.backupCodesRemaining} code(s) de secours restant(s)</>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={disable2FA}>
            <Input
              label="Pour désactiver, saisissez votre mot de passe"
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              placeholder="Votre mot de passe"
            />
            <Button
              type="submit"
              variant="outline"
              disabled={busy || !disablePassword}
              style={{ marginTop: '12px', color: colors.danger, borderColor: colors.danger }}
            >
              {busy ? '⏳...' : '🔓 Désactiver la 2FA'}
            </Button>
          </form>
        </>
      ) : (
        <>
          <p style={{ fontSize: '13px', color: colors.gray[600], marginBottom: '16px', lineHeight: 1.6 }}>
            Renforcez la sécurité de votre compte en activant l'authentification à deux facteurs.
            Vous devrez saisir un code à 6 chiffres généré par votre application mobile
            (Google Authenticator, Authy...) à chaque connexion.
          </p>

          <Button variant="primary" onClick={startSetup} disabled={busy}>
            {busy ? '⏳ Préparation...' : '🔐 Activer la 2FA'}
          </Button>
        </>
      )}
    </div>
  );
};

export default TwoFactorSetup;
