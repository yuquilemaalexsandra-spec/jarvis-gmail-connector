import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import { google } from "googleapis";

const app = express();
const port = Number(process.env.PORT || 10000);
const required = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"];

app.use(express.json({ limit: "256kb" }));
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || false }));

function oauthClient() {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  }
  return client;
}

function encodeHeader(value) {
  return `=?UTF-8?B?${Buffer.from(value).toString("base64")}?=`;
}

function rawMessage({ to, subject, text }) {
  const from = process.env.GMAIL_SENDER_EMAIL;
  const message = [
    `From: Jarvis <${from}>`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(text).toString("base64")
  ].join("\r\n");
  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function authorized(req, res, next) {
  const expected = process.env.CONNECTOR_API_KEY;
  const supplied = req.get("x-api-key") || "";
  if (!expected || supplied.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return res.status(401).json({ error: "No autorizado" });
  }
  next();
}

app.get("/", (_req, res) => {
  const missing = required.filter((key) => !process.env[key]);
  res.json({ service: "Jarvis Gmail Connector", ok: missing.length === 0, missing });
});

app.get("/auth/google", (_req, res) => {
  const url = oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/gmail.send"]
  });
  res.redirect(url);
});

app.get("/auth/google/callback", async (req, res) => {
  try {
    if (!req.query.code) return res.status(400).send("Falta el código de Google.");
    const { tokens } = await oauthClient().getToken(String(req.query.code));
    if (!tokens.refresh_token) {
      return res.status(400).send("Google no entregó un refresh token. Revoca el acceso anterior y vuelve a intentarlo.");
    }
    res.type("html").send(`<!doctype html><meta charset="utf-8"><title>Jarvis Gmail</title>
      <style>body{font:18px system-ui;max-width:760px;margin:60px auto;padding:24px}code{display:block;overflow-wrap:anywhere;background:#eee;padding:16px;border-radius:8px}</style>
      <h1>Gmail autorizado</h1><p>Copia este valor una sola vez y guárdalo en Render como <b>GOOGLE_REFRESH_TOKEN</b>.</p>
      <code>${tokens.refresh_token}</code><p>No compartas ni fotografíes esta pantalla.</p>`);
  } catch (error) {
    console.error(error);
    res.status(500).send("No se pudo completar la autorización de Google.");
  }
});

app.post("/send", authorized, async (req, res) => {
  try {
    const { to, subject, text } = req.body || {};
    if (![to, subject, text].every((value) => typeof value === "string" && value.trim())) {
      return res.status(400).json({ error: "Se requieren to, subject y text" });
    }
    if (!process.env.GOOGLE_REFRESH_TOKEN || !process.env.GMAIL_SENDER_EMAIL) {
      return res.status(503).json({ error: "Gmail todavía no está autorizado" });
    }
    const gmail = google.gmail({ version: "v1", auth: oauthClient() });
    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: rawMessage({ to, subject, text }) }
    });
    res.json({ ok: true, messageId: result.data.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "No se pudo enviar el correo" });
  }
});

app.listen(port, "0.0.0.0", () => console.log(`Jarvis Gmail Connector escuchando en ${port}`));
