# Webhooks — Ebeno Research Platform

Recevez des notifications HTTP POST à chaque événement de la plateforme.

## Format de requête

```http
POST https://votre-endpoint.com/webhook
Content-Type: application/json
User-Agent: Ebeno-Research-Webhook/1.0
X-Ebeno-Event: file.uploaded
X-Ebeno-Signature: sha256=<hmac_hex>
X-Ebeno-Delivery: <unique_id>
X-Ebeno-Attempt: 1
