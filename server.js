const express = require("express");
const multer = require("multer");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({
    storage: multer.memoryStorage()
});

const PORT = 3000;

// IMPORTANT:
// இங்கே API key-ஐ இப்போ hard-code செய்யாதே.
// கீழே environment variable மூலம் எடுத்துக்கொள்வோம்.
const API_KEY = process.env.ELEVENLABS_API_KEY;


// Generate voice
app.post("/api/generate", upload.single("voice"), async (req, res) => {

    try {

        if (!API_KEY) {
            return res.status(500).json({
                error: "ElevenLabs API key missing"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                error: "Voice sample missing"
            });
        }

        const text = req.body.text;

        if (!text || !text.trim()) {
            return res.status(400).json({
                error: "Tamil text missing"
            });
        }


        // STEP 1:
        // Upload voice sample and create Instant Voice Clone

        const formData = new FormData();

        const voiceBlob = new Blob(
            [req.file.buffer],
            { type: req.file.mimetype }
        );

        formData.append(
            "files",
            voiceBlob,
            req.file.originalname
        );

        formData.append(
            "name",
            "Tamil Voice Clone"
        );


        const cloneResponse = await fetch(
            "https://api.elevenlabs.io/v1/voices/add",
            {
                method: "POST",
                headers: {
                    "xi-api-key": API_KEY
                },
                body: formData
            }
        );


        if (!cloneResponse.ok) {

            const errorText = await cloneResponse.text();

            return res.status(cloneResponse.status).json({
                error: "Voice cloning failed",
                details: errorText
            });
        }


        const cloneData = await cloneResponse.json();

        const voiceId = cloneData.voice_id;


        // STEP 2:
        // Generate Tamil speech using cloned voice

        const speechResponse = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
            {
                method: "POST",

                headers: {
                    "xi-api-key": API_KEY,
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    text: text,
                    model_id: "eleven_multilingual_v2"
                })
            }
        );


        if (!speechResponse.ok) {

            const errorText = await speechResponse.text();

            return res.status(speechResponse.status).json({
                error: "Speech generation failed",
                details: errorText
            });
        }


        const audioBuffer = Buffer.from(
            await speechResponse.arrayBuffer()
        );


        res.setHeader(
            "Content-Type",
            "audio/mpeg"
        );

        res.setHeader(
            "Content-Disposition",
            "inline; filename=tamil-voice.mp3"
        );

        res.send(audioBuffer);

    }

    catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Server error",
            details: error.message
        });

    }

});


app.listen(PORT, () => {

    console.log(
        `Tamil Voice Backend running on port ${PORT}`
    );

});