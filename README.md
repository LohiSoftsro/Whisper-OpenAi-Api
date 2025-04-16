# Whisper Hangfelismerő Alkalmazás

Ez az alkalmazás az OpenAI Whisper API-t használja hangfájlok szöveggé alakítására.

## Telepítés

1. Klónozd le ezt a repositoryt:
   ```
   git clone [repository URL]
   cd whisper-transcriber
   ```

2. Telepítsd a függőségeket:
   ```
   npm install
   ```

3. Hozz létre egy `.env` fájlt az OpenAI API kulcsoddal:
   ```
   cp .env.example .env
   ```
   
   Szerkeszd a `.env` fájlt és add meg a saját OpenAI API kulcsodat:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

## Használat

1. Helyezd a feldolgozni kívánt hangfájlokat a `source` mappába.
   
   Támogatott formátumok: `.mp3`, `.mp4`, `.mpeg`, `.mpga`, `.m4a`, `.wav`, `.webm`

2. Futtasd az alkalmazást:
   ```
   npm start
   ```

3. A feldolgozott átiratokat a `transcriptions` mappában találod meg `.txt` formátumban.

### Haladó beállítások

Az alkalmazást különböző opciókkal indíthatod:

```
node index.js [opciók]
```

Elérhető opciók:
- `-m, --model <model>`: A használni kívánt modell (alapértelmezett: `whisper-1`)
- `-l, --language <language>`: Nyelv kódja (alapértelmezett: `auto`). 
  Használj `hu` értéket magyar nyelvhez, `en` értéket angol nyelvhez, stb.
- `-p, --prompt <prompt>`: Segítő prompt a pontosabb átirathoz
- `-d, --debug`: Debug mód bekapcsolása

Példa:
```
node index.js --model whisper-1 --language hu --prompt "Ez egy magyar nyelvű beszélgetés"
```

## Elérhető modellek

- `whisper-1`: OpenAI Whisper (legpontosabb)
- `whisper-1-quantized`: OpenAI Whisper (optimalizált)

## Hibaelhárítás

Ha problémába ütközöl, futtasd az alkalmazást `--debug` opcióval a részletesebb hibaüzenetek megtekintéséhez:

```
node index.js --debug
``` 