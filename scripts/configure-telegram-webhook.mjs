const isProductionDeployment = process.env.VERCEL_ENV === "production";

if (!isProductionDeployment) {
  console.log("Skipping Telegram webhook setup outside Vercel production.");
  process.exit(0);
}

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

if (!botToken || !webhookSecret || !productionHost) {
  throw new Error(
    "Telegram webhook setup requires TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, and VERCEL_PROJECT_PRODUCTION_URL.",
  );
}

if (!/^[A-Za-z0-9_-]{1,256}$/.test(webhookSecret)) {
  throw new Error(
    "TELEGRAM_WEBHOOK_SECRET contains characters unsupported by Telegram.",
  );
}

const webhookUrl = `https://${productionHost}/api/telegram/webhook`;
const response = await fetch(
  `https://api.telegram.org/bot${botToken}/setWebhook`,
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: webhookSecret,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: false,
    }),
    signal: AbortSignal.timeout(15_000),
  },
);

const result = await response.json();

if (!response.ok || !result.ok) {
  throw new Error(
    `Telegram setWebhook failed (${response.status}): ${result.description ?? "unknown error"}`,
  );
}

console.log(`Telegram webhook configured for ${webhookUrl}.`);
