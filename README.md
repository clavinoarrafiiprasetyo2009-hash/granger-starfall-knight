# 🚀 Mobile Legends: Starfall Runner // 2D Action Platformer 🤖🔥

Game aksi 2D arcade run 'n gun bergaya **Metal Slug** x **Hollow Knight** dengan karakter terinspirasi dari skin legendaris **Mobile Legends: Bang Bang**. Dibuat murni menggunakan HTML5 Canvas 60 FPS + Web Audio API synthesizer tanpa lag dan bisa langsung dibuka di browser!

---

## 🛡️ Roster 5 Hero yang Tersedia

1. **Granger - Starfall Knight** (Marksman)
   - *Senjata*: Supernova Beam Cannon & Dual Pulse Blasters
   - *Gaya Serang*: Laser emas raksasa menembus seluruh layar secara instan.
2. **Valir - Dragon Tamer** (Mage / Pyromancer)
   - *Senjata*: Draconic Fireburst & Twin Flame Cannons
   - *Gaya Serang*: Lontaran bola naga api kembar yang meledak dengan percikan api area (AoE).
3. **Saber - Onimaru Mecha** (Assassin)
   - *Senjata*: Twin High-Frequency Lightning Katanas
   - *Gaya Serang*: Tebasan gelombang sabit petir sonik berkecepatan tinggi dengan cooldown dash super singkat.
4. **Leomord - Spectral Revenant** (Fighter)
   - *Senjata*: Frost Nether Halberd & Aegis
   - *Gaya Serang*: Tusukan gelombang tombak es menembus banyak musuh sekaligus dengan pertahanan HP tebal.
5. **Gusion - Cosmic Starblade** (Rapid Ninja)
   - *Senjata*: Orbiting Star-Daggers & Cosmic Shards
   - *Gaya Serang*: Rentetan 3 pisau belati kosmik bercahaya yang menusuk musuh secara beruntun.

---

## 🏛️ Arsitektur Level & Stage Modular

Game kini dilengkapi dengan sistem pemilihan stage modular:

### 🌿 Level 1: The Origin (Ruins of Verdant Glade)
- **Tema & Bioma**: Desa alam purba dan kuil kuno yang hancur akibat anomali makhluk misterius.
- **Visual**: Pixel art hutan berkabut pagi (*Misty Woodland Morning*), platforming bata batu kuno (*Cobblestone Masonry*), karpet rumput zamrud bertingkat, serta jamur hutan.
- **Rintangan & Traversal**:
  - Jembatan tali gantung di atas jurang (*Rope Bridges*).
  - Lift kayu bergerak (*Moving Wooden Lifts*) naik-turun dan mendatar.
  - Tali & sulur panjat (*Hanging Ropes & Vines*).
  - Jurang maut (*Abyss Pitfalls*) dengan deteksi jatuh dan reset aman ke checkpoint.
- **Musuh Baru**:
  - *Blight Hound*: Anjing buas dengan terkaman menerkam cepat (*Feral Lunge*).
  - *Spore Spitter*: Jamur meriam peludah bola spora beracun parabola (*Spore Ball*).
  - *Wood Stalker*: Roh bayangan bertopeng kayu penyabit racun (*Cursed Slash*).
  - *Bramble Drone*: Drone polong terbang penembak duri (*Bramble Thorn*).
- **Mini-Boss Encounter**: *Blight Fang Behemoth* (950 HP) — Saat didekati, arena terkunci otomatis oleh dinding akar berduri raksasa (*Cursed Bramble Wall*)!
- **Main Boss Encounter**: *The Blight Chimera* (1,800 HP) — Apex chimera bersayap bayangan yang menyegel arena kuil purba dengan tiang kristal (*Abyssal Thorn Spires*).

### 🌌 Level 2: Metropolis & Astral Citadel
- **Tema & Bioma**: Ekspedisi masif 15,000px melintasi 5 sektor: Kota Siber, Reruntuhan Kuno, Lembah Lahar, Koloseum Baja, dan Takhta Kosmik.
- **Multi-Boss**: 5 Boss & Mini-Boss tingkat lanjut dengan mekanisme pertarungan unik.

---

## 🪦 Mekanik Hollow Knight: Mayat & Checkpoint

- **Mayat Musuh Permanen**: Setiap musuh yang dibunuh meninggalkan mayat unik di platform.
- **Anti Endless-Spawn**: Musuh tidak akan terus menerus respawn mengganggu pemain.
- **Siklus Checkpoint**: Saat pemain gugur dan respawn di tiang kuil Checkpoint, musuh biasa akan bangkit kembali, sedangkan Boss/Mini-Boss yang telah dikalahkan tetap mati!

---

## 🎮 Kontrol Permainan

- **`A` / `D`** atau **Panah Kiri / Kanan**: Bergerak (Akselerasi halus, lereng & platforming)
- **`W` / `S`**: Panjat naik / turun tali dan sulur gantung (*Ropes & Vines*)
- **`W` / `Spasi`**: Double Jump (Lompat ganda dengan thruster) / Lepas dari tali
- **`J` / Klik Kiri**: Serangan Senjata Karakter Utama
- **`K` / `Shift`**: Cyber Dash (i-Frames / kebal serangan saat melesat cepat)
- **`ESC` / `P`**: Pause & In-Game Menu (Ganti Hero, Restart, & Level Select)
- **Mobile Touch**: Virtual joystick dan tombol aksi otomatis muncul di layar sentuh.

---

## 📂 Struktur Project

```
granger-starfall-knight/
├── assets/                  # Karakter & Thumbnail Portrait Hero
├── audio.js                 # Web Audio API Synthesizer (BGM + All SFX)
├── game.js                  # Engine Inti, Modular Stage, Fisika, & Boss AI
├── index.html               # Main Shell, Lobby Arcade, Stage Select Modal, & HUD
├── styles.css               # Arcade Retro-Cyber Styling & UI Responsive
├── granger_reference.png    # Art Reference Granger Starfall Knight
└── README.md                # Dokumentasi Proyek
```

---

## 🚀 Cara Menjalankan

1. Clone repositori ini:
   ```bash
   git clone https://github.com/clavinoarrafiiprasetyo2009-hash/granger-starfall-knight.git
   ```
2. Buka folder dan jalankan server lokal sederhana (misal menggunakan Python):
   ```bash
   python -m http.server 8080
   ```
3. Buka browser di `http://localhost:8080`.
