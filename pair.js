const express = require("express");
const fs = require("fs");
const axios = require("axios");
const { makeid } = require("./id");
const pino = require("pino");
const {
    default: Maher_Zubair,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore
} = require("maher-zubair-baileys");

let router = express.Router();

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get("/", async (req, res) => {
    const id = makeid();
    let num = req.query.number;
    let imageUrl = req.query.image;

    if (!num || !imageUrl) {
        return res.status(400).json({ success: false, message: "Missing parameters" });
    }

    async function SIGMA_MD_PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState("./temp/" + id);
        try {
            let Pair_Code_By_Maher_Zubair = Maher_Zubair({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: ["Chrome (Linux)", "", ""]
            });

            if (!Pair_Code_By_Maher_Zubair.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, "");
                const code = await Pair_Code_By_Maher_Zubair.requestPairingCode(num);
                return res.json({ success: true, pairingCode: code });
            }

            Pair_Code_By_Maher_Zubair.ev.on("creds.update", saveCreds);
            Pair_Code_By_Maher_Zubair.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === "open") {
                    await delay(5000);

                    try {
                        // Download the image from the URL
                        const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
                        const buffer = Buffer.from(response.data, "binary");

                        // Update profile picture using the Baileys method
                        await Pair_Code_By_Maher_Zubair.updateProfilePicture(Pair_Code_By_Maher_Zubair.user.id, { img: buffer });
                        console.log("✅ Profile Picture Updated Successfully!");

                        // Send success response
                        await res.json({ success: true, message: "Profile picture updated successfully" });
                    } catch (error) {
                        console.error("❌ Failed to update profile picture:", error);
                        await res.status(500).json({ success: false, message: "Failed to update profile picture" });
                    }

                    await delay(100);
                    await Pair_Code_By_Maher_Zubair.ws.close();
                    return await removeFile("./temp/" + id);
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode !== 401) {
                    await delay(10000);
                    SIGMA_MD_PAIR_CODE();
                }
            });
        } catch (err) {
            console.log("Service restarted");
            await removeFile("./temp/" + id);
            return res.status(500).json({ success: false, message: "Service Unavailable" });
        }
    }

    return await SIGMA_MD_PAIR_CODE();
});

const app = express();
const PORT = process.env.PORT || 5000;

app.use("/update-profile", router);

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
