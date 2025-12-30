# Alternative Lingvist

> **🔒 Security Note:** Firebase API keys in this project are intentionally public. This is by design - Firebase security is enforced through Security Rules, not by hiding API keys. [Learn more](https://firebase.google.com/docs/projects/api-keys)

🌍 Lingvist benzeri dil öğrenme uygulaması

## 📋 İçindekiler

- [Kurulum](#kurulum)
- [Veri Seti Hazırlama](#veri-seti-hazırlama)
- [Dosya Yükleme](#dosya-yükleme)

## 🛠️ Teknolojiler

- **Frontend**: React 18+
- **Build Tool**: Vite
- **Linting**: ESLint

## 🚀 Kurulum

### Ön Gereksinimler

- Node.js (v16 veya üzeri)
- npm veya yarn

### Adımlar

1. **Projeyi klonlayın**
   ```bash
   git clone https://github.com/EmrahFidan/Alternative-Lingvist.git
   cd Alternative-Lingvist
   ```

2. **Bağımlılıkları yükleyin**
   ```bash
   npm install
   ```

3. **Geliştirme sunucusunu başlatın**
   ```bash
   npm run dev
   ```

4. **Uygulamayı açın**
   
   Tarayıcınızda `http://localhost:5173` adresine gidin

## 📊 Veri Seti Hazırlama

### Veri Formatı

Uygulamanın çalışması için kelime verileri JSON formatında hazırlanmalıdır:

```json
{
  "words": [
    {
      "id": 1,
      "word": "hello",
      "translation": "merhaba",
      "sentence": "Hello, how are you?",
      "sentenceTranslation": "Merhaba, nasılsın?",
      "level": "beginner",
      "audio": "audio/hello.mp3"
    }
  ]
}
```

### Veri Seti Yapısı

```
src/data/
├── languages/
│   ├── english.json
│   ├── spanish.json
│   └── french.json
└── audio/
    ├── hello.mp3
    └── goodbye.mp3
```

### Yeni Kelime Ekleme

1. İlgili dil dosyasını açın (örn: `src/data/languages/english.json`)
2. Yeni kelimeyi JSON formatında ekleyin
3. Gerekirse ses dosyasını `src/data/audio/` klasörüne ekleyin

## 📁 Dosya Yükleme

### CSV Dosyası Yükleme

CSV formatında kelime listesi yükleyebilirsiniz:

```csv
word,translation,sentence,sentenceTranslation,level
hello,merhaba,"Hello, how are you?","Merhaba, nasılsın?",beginner
goodbye,hoşçakal,Goodbye my friend,Hoşçakal arkadaşım,beginner
```

### Excel Dosyası Yükleme

Excel (.xlsx) dosyalarını da destekler. Şu sütunları kullanın:
- **A Sütunu**: word (kelime)
- **B Sütunu**: translation (çeviri)
- **C Sütunu**: sentence (örnek cümle)
- **D Sütunu**: sentenceTranslation (cümle çevirisi)
- **E Sütunu**: level (seviye: beginner/intermediate/advanced)

### Ses Dosyaları

- Format: MP3, WAV
- Maksimum boyut: 5MB
- Dosya adı: kelimenin kendisi (örn: hello.mp3)
- Klasör: `src/data/audio/`

---

Daha fazla bilgi için [GitHub](https://github.com/EmrahFidan/Alternative-Lingvist) sayfasını ziyaret edin.
