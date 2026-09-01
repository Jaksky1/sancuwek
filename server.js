
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const webpush = require("web-push");
const { Server } = require("socket.io");
const supabase = require("./supabase");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, "data", "donations.json");
const CONFIG_FILE = path.join(__dirname, "data", "config.json");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const QRIS_DIR = path.join(__dirname, "data", "qris");
const QRIS_FILE = path.join(QRIS_DIR, "current");
const PUSH_FILE = path.join(__dirname, "data", "push-subscriptions.json");
const VAPID_FILE = path.join(__dirname, "data", "vapid.json");

for (const dir of [path.dirname(DATA_FILE), UPLOAD_DIR, QRIS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");
if (!fs.existsSync(PUSH_FILE)) fs.writeFileSync(PUSH_FILE, "[]");
if (!fs.existsSync(CONFIG_FILE)) fs.writeFileSync(CONFIG_FILE, JSON.stringify({ adminPasswordHash: "" }, null, 2));

function sha256(text) {
  return crypto.createHash("sha256").update(String(text)).digest("hex");
}

function readConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")); }
  catch { return { adminPasswordHash: "" }; }
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function ensureDefaultPassword() {
  const config = readConfig();
  if (!config.adminPasswordHash) {
    const initial = process.env.ADMIN_PASSWORD || "admin123";
    config.adminPasswordHash = sha256(initial);
    writeConfig(config);
    console.log("Password admin awal sudah dibuat.");
    if (!process.env.ADMIN_PASSWORD) {
      console.log("Password awal: admin123 (segera ubah dari dashboard admin)");
    }
  }
}

ensureDefaultPassword();

function ensureVapidKeys() {
  let vapid = null;
  try {
    if (fs.existsSync(VAPID_FILE)) {
      vapid = JSON.parse(fs.readFileSync(VAPID_FILE, "utf8"));
    }
  } catch {}

  if (!vapid || !vapid.publicKey || !vapid.privateKey) {
    vapid = webpush.generateVAPIDKeys();
    fs.writeFileSync(VAPID_FILE, JSON.stringify(vapid, null, 2));
    console.log("VAPID keys dibuat.");
  }

  webpush.setVapidDetails(
    "mailto:admin@sancuwek.local",
    vapid.publicKey,
    vapid.privateKey
  );

  return vapid;
}

const VAPID_KEYS = ensureVapidKeys();

function readPushSubs() {
  try { return JSON.parse(fs.readFileSync(PUSH_FILE, "utf8")); }
  catch { return []; }
}

function writePushSubs(data) {
  fs.writeFileSync(PUSH_FILE, JSON.stringify(data, null, 2));
}

async function sendPushToAdmins(payload) {
  let subs = readPushSubs();
  const alive = [];

  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub.subscription, JSON.stringify(payload));
      alive.push(sub);
    } catch (err) {
      if (err && (err.statusCode === 404 || err.statusCode === 410)) {
        continue;
      }
      console.error("Push error:", err.message);
      alive.push(sub);
    }
  }

  if (alive.length !== subs.length) writePushSubs(alive);
}


async function readDonations() {
  const { data, error } = await supabase
    .from("donations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase read error:", error.message);
    return [];
  }

  return data.map(x => ({
    id: x.id,
    ffId: x.ff_id,
    amount: x.amount,
    note: x.note,
    proof: x.proof_url,
    status: x.status,
    createdAt: x.created_at
  }));
}

async function writeDonations(data) {
  return true;
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Bukti transfer harus JPG, PNG, atau WEBP."));
    }
    cb(null, true);
  }
});

const qrisStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, QRIS_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `current${ext}`);
  }
});

const qrisUpload = multer({
  storage: qrisStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("QRIS harus JPG, PNG, atau WEBP."));
    }
    cb(null, true);
  }
});

function getCurrentQrisFile() {
  if (!fs.existsSync(QRIS_DIR)) return null;
  const files = fs.readdirSync(QRIS_DIR).filter(f => /^current\.(png|jpg|jpeg|webp)$/i.test(f));
  return files.length ? path.join(QRIS_DIR, files[0]) : null;
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(UPLOAD_DIR));

function adminAuth(req, res, next) {
  const password = req.headers["x-admin-password"] || "";
  const config = readConfig();
  if (!password || sha256(password) !== config.adminPasswordHash) {
    return res.status(401).json({ error: "Password admin salah." });
  }
  next();
}



app.get("/api/push/public-key", adminAuth, (req, res) => {
  res.json({ publicKey: VAPID_KEYS.publicKey });
});

app.post("/api/admin/push/subscribe", adminAuth, (req, res) => {
  const subscription = req.body.subscription;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: "Subscription tidak valid." });
  }

  const subs = readPushSubs();
  const exists = subs.find(x => x.subscription?.endpoint === subscription.endpoint);

  if (!exists) {
    subs.push({
      id: crypto.randomUUID(),
      subscription,
      createdAt: new Date().toISOString()
    });
    writePushSubs(subs);
  }

  res.json({ ok: true, message: "Push notification admin aktif." });
});

app.post("/api/admin/push/unsubscribe", adminAuth, (req, res) => {
  const endpoint = req.body.endpoint;
  if (!endpoint) return res.status(400).json({ error: "Endpoint tidak ditemukan." });

  const subs = readPushSubs().filter(x => x.subscription?.endpoint !== endpoint);
  writePushSubs(subs);
  res.json({ ok: true });
});

app.get("/api/qris", (req, res) => {
  const file = getCurrentQrisFile();
  if (file) return res.sendFile(file);
  return res.sendFile(path.join(__dirname, "public", "qris-placeholder.svg"));
});

app.post("/api/admin/qris", adminAuth, (req, res, next) => {
  const old = getCurrentQrisFile();
  qrisUpload.single("qris")(req, res, (err) => {
    if (err) return next(err);
    if (!req.file) return res.status(400).json({ error: "Pilih gambar QRIS terlebih dahulu." });

    // Remove older QRIS if extension changed
    if (old && old !== req.file.path && fs.existsSync(old)) {
      try { fs.unlinkSync(old); } catch {}
    }

    res.json({
      ok: true,
      message: "QRIS berhasil diperbarui.",
      url: `/api/qris?t=${Date.now()}`
    });
  });
});

app.post("/api/donations", upload.single("proof"), async (req, res) => {
  const { ffId, amount, note } = req.body;

  if (!ffId || !amount || !req.file) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "ID FF, nominal, dan bukti transfer wajib diisi." });
  }

  const amountNumber = Number(String(amount).replace(/[^\d]/g, ""));
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "Nominal tidak valid." });
  }

  const fileName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${path.extname(req.file.originalname).toLowerCase()}`;

  const fileBuffer = fs.readFileSync(req.file.path);

  const { error: uploadError } = await supabase.storage
    .from("proofs")
    .upload(fileName, fileBuffer, {
      contentType: req.file.mimetype,
      upsert: false
    });

  if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

  if (uploadError) {
    console.error("Storage upload error:", uploadError.message);
    return res.status(500).json({ error: "Upload bukti gagal." });
  }

  const { data: publicUrl } = supabase.storage
    .from("proofs")
    .getPublicUrl(fileName);

  const item = {
    ffId: String(ffId).trim(),
    amount: amountNumber,
    note: String(note || "").trim(),
    proof: publicUrl.publicUrl,
    status: "Menunggu"
  };
  const { error } = await supabase
    .from("donations")
    .insert({
      ff_id: item.ffId,
      amount: item.amount,
      note: item.note,
      proof_url: item.proof,
      status: item.status
    });

  if (error) {
    console.error("Insert Supabase error:", error.message);
    return res.status(500).json({ error: "Gagal menyimpan donasi." });
  }

  sendPushToAdmins({
    title: "Pembayaran baru masuk",
    body: `ID FF ${item.ffId} • Rp${Number(item.amount).toLocaleString("id-ID")}`,
    url: "/admin.html",
    id: item.id
  }).catch(err => console.error("Push send failed:", err.message));

  io.emit("new-payment", item);
  res.json({ ok: true, message: "Bukti berhasil dikirim." });
});

app.get("/api/admin/donations", adminAuth, async (_, res) => {
  res.json(await readDonations());
});

app.get("/api/admin/stats", adminAuth, async (_, res) => {
  const data = await readDonations();
  const totalAmount = data.reduce((a, b) => a + Number(b.amount || 0), 0);
  const pending = data.filter(x => x.status === "Menunggu").length;
  const done = data.filter(x => x.status === "Selesai").length;
  res.json({ count: data.length, totalAmount, pending, done });
});

app.patch("/api/admin/donations/:id", adminAuth, async (req, res) => {
  const allowed = ["Menunggu", "Dicek", "Selesai"];

  if (!allowed.includes(req.body.status)) {
    return res.status(400).json({ error: "Status tidak valid." });
  }

  const { error } = await supabase
    .from("donations")
    .update({ status: req.body.status })
    .eq("id", req.params.id);

  if (error) {
    console.error("Update error:", error.message);
    return res.status(500).json({ error: error.message });
  }

  res.json({ ok: true });
});

app.delete("/api/admin/donations/:id", adminAuth, async (req, res) => {

  const { error } = await supabase
    .from("donations")
    .delete()
    .eq("id", req.params.id);

  if (error) {
    console.error("Delete error:", error.message);
    return res.status(500).json({ error: error.message });
  }

  res.json({ ok: true });
});

app.post("/api/admin/change-password", adminAuth, (req, res) => {
  const { newPassword, confirmPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "Password baru minimal 6 karakter." });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: "Konfirmasi password tidak sama." });
  }

  const config = readConfig();
  config.adminPasswordHash = sha256(newPassword);
  writeConfig(config);
  res.json({ ok: true, message: "Password admin berhasil diubah." });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || "Terjadi kesalahan." });
});

const server = app.listen(PORT, () => {
  console.log(`SANCUWEK CEO: http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin.html`);
});

const io = new Server(server);

io.on("connection", (socket) => {
  console.log("Socket admin connected:", socket.id);
});
