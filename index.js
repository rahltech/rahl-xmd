const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("🔥 RAHL XMD is running");
});

app.listen(PORT, () => {
    console.log("Web server running on port " + PORT);
});

const P = require("pino");
const chalk = require("chalk");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason,
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");

const config = require("./config");

async function startBot() {

    const { state, saveCreds } = await useMultiFileAuthState("session");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: P({ level: "silent" }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P({ level: "silent" }))
        },
        browser: ["RAHL-XMD", "Chrome", "1.0.0"]
    });

    sock.ev.on("creds.update", saveCreds);

    // 🔥 PAIRING CODE LOGIN
    if (!sock.authState?.creds?.registered) {
        const phoneNumber = process.env.PAIR_NUMBER;
        if (!phoneNumber) {
            console.log("PAIR_NUMBER not set in environment variables!");
        } else {
            const code = await sock.requestPairingCode(phoneNumber);
            console.log("=======================================");
            console.log("PAIRING CODE:", code);
            console.log("Go to WhatsApp → Linked Devices →");
            console.log("Link with phone number and enter code");
            console.log("=======================================");
        }
    }

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "close") {
            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

            if (shouldReconnect) {
                console.log(chalk.red("Reconnecting..."));
                startBot();
            } else {
                console.log(chalk.red("Logged Out"));
            }
        }

        if (connection === "open") {
            console.log(chalk.green(`${config.botName} Connected ✅`));
        }
    });

    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;
        if (msg.key.fromMe) return;

        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text;

        if (!text) return;
        if (!text.startsWith(config.prefix)) return;

        const args = text.slice(config.prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (command === "menu") {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `
🔥 ${config.botName} PUBLIC BOT 🔥

.menu
.ping
.owner
`
            });
        }

        if (command === "ping") {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "🏓 Pong!"
            });
        }

        if (command === "owner") {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `👑 wa.me/${config.owner[0]}`
            });
        }
    });
}

startBot();
