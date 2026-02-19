const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const QRCode = require("qrcode")
const pino = require("pino")

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason
} = require("@whiskeysockets/baileys")

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static("public"))

let sock

async function startBot() {

    const { state, saveCreds } = await useMultiFileAuthState("./auth")

    sock = makeWASocket({
        logger: pino({ level: "silent" }),
        auth: state,
        printQRInTerminal: false
    })

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("connection.update", async (update) => {

        const { connection, qr, lastDisconnect } = update

        if (qr) {
            const qrImage = await QRCode.toDataURL(qr)
            io.emit("qr", qrImage)
        }

        if (connection === "open") {
            io.emit("connected")
            console.log("RAHL XMD Connected ✅")
        }

        if (connection === "close") {
            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

            if (shouldReconnect) {
                startBot()
            }
        }
    })
}

io.on("connection", (socket) => {
    console.log("User connected to dashboard")
})

startBot()

server.listen(3000, () => {
    console.log("Server running on port 3000")
})
