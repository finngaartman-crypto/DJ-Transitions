const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.static(__dirname));
app.use(express.json());

// Zorg dat mappen bestaan
if (!fs.existsSync("./uploads")) fs.mkdirSync("./uploads");
if (!fs.existsSync("./covers")) fs.mkdirSync("./covers");

// Metadata in JSON-bestand
const META_FILE = "./metadata.json";
let tracks = [];

if (fs.existsSync(META_FILE)) {
    try {
        tracks = JSON.parse(fs.readFileSync(META_FILE, "utf8"));
    } catch {
        tracks = [];
    }
}

function saveMetadata() {
    fs.writeFileSync(META_FILE, JSON.stringify(tracks, null, 2));
}

// Multer opslag voor audio + cover
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === "track") cb(null, "uploads/");
        else if (file.fieldname === "cover") cb(null, "covers/");
        else cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Upload endpoint (audio + metadata + cover)
app.post(
    "/upload",
    upload.fields([
        { name: "track", maxCount: 1 },
        { name: "cover", maxCount: 1 }
    ]),
    (req, res) => {
        if (!req.files || !req.files.track) {
            return res.status(400).json({ success: false, error: "Geen track ontvangen" });
        }

        const id = Date.now().toString();
        const audioFile = req.files.track[0].filename;
        const coverFile = req.files.cover ? req.files.cover[0].filename : null;

        const {
            title,
            description,
            genre,
            bpm,
            mood
        } = req.body;

        const track = {
            id,
            title: title || "Ongetitelde transitie",
            description: description || "",
            genre: genre || "Onbekend",
            bpm: bpm || "",
            mood: mood || "",
            audioFile,
            coverFile,
            likes: 0,
            comments: []
        };

        tracks.push(track);
        saveMetadata();

        res.json({ success: true, track });
    }
);

// Alle tracks ophalen
app.get("/tracks", (req, res) => {
    res.json(tracks);
});

// Likes
app.post("/like/:id", (req, res) => {
    const id = req.params.id;
    const track = tracks.find(t => t.id === id);
    if (!track) return res.status(404).json({ error: "Track niet gevonden" });

    track.likes = (track.likes || 0) + 1;
    saveMetadata();
    res.json({ likes: track.likes });
});

// Reactie plaatsen
app.post("/comment/:id", (req, res) => {
    const id = req.params.id;
    const track = tracks.find(t => t.id === id);
    if (!track) return res.status(404).json({ error: "Track niet gevonden" });

    const text = (req.body.text || "").trim();
    if (!text) return res.status(400).json({ error: "Lege reactie" });

    track.comments.push(text);
    saveMetadata();
    res.json({ comments: track.comments });
});

// Reacties ophalen
app.get("/comments/:id", (req, res) => {
    const id = req.params.id;
    const track = tracks.find(t => t.id === id);
    if (!track) return res.json([]);
    res.json(track.comments || []);
});

// Static voor uploads en covers
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/covers", express.static(path.join(__dirname, "covers")));

app.listen(PORT, () => console.log("Server draait op poort " + PORT));