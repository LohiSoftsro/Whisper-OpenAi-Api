# Whisper Audio Transcription App

This application uses the OpenAI Whisper API to convert audio files to text.

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/LohiSoftsro/Whisper-OpenAi-Api.git
   cd Whisper-OpenAi-Api
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with your OpenAI API key:
   ```
   cp .env.example .env
   ```
   
   Edit the `.env` file and enter your own OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

## Usage

1. Place the audio files you want to process in the `source` folder.
   
   Supported formats: `.mp3`, `.mp4`, `.mpeg`, `.mpga`, `.m4a`, `.wav`, `.webm`

2. Run the application:
   ```
   npm start
   ```

3. You will find the processed transcripts in the `transcriptions` folder in `.txt` format.

### Advanced Settings

You can start the application with various options:

```
node index.js [options]
```

Available options:
- `-m, --model <model>`: The model to use (default: `whisper-1`)
- `-l, --language <language>`: Language code (default: `auto`). 
  Use `hu` for Hungarian, `en` for English, etc.
- `-p, --prompt <prompt>`: Helper prompt for more accurate transcription
- `-d, --debug`: Enable debug mode

Example:
```
node index.js --model whisper-1 --language en --prompt "This is an English conversation"
```

## Available Models

- `whisper-1`: OpenAI Whisper (most accurate)
- `whisper-1-quantized`: OpenAI Whisper (optimized)

## Troubleshooting

If you encounter problems, run the application with the `--debug` option to see more detailed error messages:

```
node index.js --debug
``` 