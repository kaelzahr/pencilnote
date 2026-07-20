# PencilNote — Tablet/Mobil Not Alma Uygulaması
## Mimari Klasör Yapısı (React Native + Skia + WatermelonDB)

Neden bu stack:
- **React Native + @shopify/react-native-skia** → GPU hızlandırmalı, 120Hz ProMotion / S-Pen'e uygun native-seviye çizim.
- **perfect-freehand** → Basınç/hız duyarlı, doğal mürekkep hissi veren stroke üretimi.
- **react-native-pdf + pdfium** → Büyük PDF'lerde sayfa bazlı lazy-render.
- **WatermelonDB (SQLite üzerinde)** → Reaktif, milyonlarca satırda bile indeksli local-first veritabanı.
- **Lexical (Meta)** → Blok tabanlı, tablet klavyesine tam uyumlu zengin metin editörü.

Klasör yapısı, kodların GitHub deposunda `src/` altında organize edildiği şekilde kurulmuştur: database/models, components/canvas, components/toolbar.
