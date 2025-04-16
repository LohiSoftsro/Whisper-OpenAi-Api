import 'dotenv/config';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import OpenAI from 'openai';
import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

// Konstansok
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SOURCE_DIR = path.join(__dirname, 'source');
const OUTPUT_DIR = path.join(__dirname, 'transcriptions');

// API-modellek
const MODELS = {
  'whisper-1': 'OpenAI Whisper (legpontosabb)',
  'whisper-1-quantized': 'OpenAI Whisper (optimalizált)',
};

// CLI opciók beállítása
program
  .version('1.0.0')
  .option('-m, --model <model>', 'A használni kívánt modell', 'whisper-1')
  .option('-l, --language <language>', 'Nyelv (auto, hu, en, stb)', 'auto')
  .option('-p, --prompt <prompt>', 'Segítő prompt a pontosabb átirathoz')
  .option('-d, --debug', 'Debug mód bekapcsolása')
  .parse(process.argv);

const options = program.opts();

// OpenAI kliens inicializálása
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Támogatott audio formátumok
const SUPPORTED_FORMATS = ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm'];

/**
 * Hangfájl szöveggé alakítása
 * @param {string} filePath - A hangfájl elérési útja
 * @param {string} model - A használandó modell
 * @param {string} language - A nyelv kódja vagy 'auto'
 * @param {string} prompt - Segítő prompt (opcionális)
 * @returns {Promise<string>} - A felismert szöveg
 */
async function transcribeAudio(filePath, model, language, prompt) {
  try {
    // File stream létrehozása a teljes fájl betöltése helyett
    const fileStream = fs.createReadStream(filePath);
    
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: model,
      language: language !== 'auto' ? language : undefined,
      prompt: prompt,
    });
    
    return transcription.text;
  } catch (error) {
    console.error(chalk.red(`Hiba a(z) ${path.basename(filePath)} átiratának készítésekor:`));
    console.error(chalk.red(error.message));
    if (options.debug) {
      console.error(error);
    }
    return null;
  }
}

/**
 * Hangfájlok keresése rekurzívan
 * @param {string} dir - A vizsgálandó könyvtár
 * @returns {Promise<string[]>} - A talált hangfájlok listája
 */
async function findAudioFiles(dir) {
  const files = await fsPromises.readdir(dir, { withFileTypes: true });
  const audioFiles = [];
  
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      const nestedFiles = await findAudioFiles(filePath);
      audioFiles.push(...nestedFiles);
    } else if (SUPPORTED_FORMATS.includes(path.extname(file.name).toLowerCase())) {
      audioFiles.push(filePath);
    }
  }
  
  return audioFiles;
}

/**
 * Fő függvény
 */
async function main() {
  console.log(chalk.blue('='.repeat(50)));
  console.log(chalk.blue.bold('Whisper Hangfelismerő Alkalmazás'));
  console.log(chalk.blue('='.repeat(50)));
  
  // API kulcs ellenőrzése
  if (!process.env.OPENAI_API_KEY) {
    console.error(chalk.red('Hiba: Az OPENAI_API_KEY nincs beállítva a .env fájlban!'));
    process.exit(1);
  }
  
  // Modell ellenőrzése
  if (!MODELS[options.model]) {
    console.error(chalk.red(`Hiba: Érvénytelen modell: ${options.model}`));
    console.log(chalk.yellow('Elérhető modellek:'));
    Object.entries(MODELS).forEach(([id, description]) => {
      console.log(chalk.yellow(`  - ${id}: ${description}`));
    });
    process.exit(1);
  }
  
  // Debug információk megjelenítése
  if (options.debug) {
    console.log(chalk.yellow('Debug információk:'));
    console.log(chalk.yellow(`  - Modell: ${options.model} (${MODELS[options.model]})`));
    console.log(chalk.yellow(`  - Nyelv: ${options.language}`));
    console.log(chalk.yellow(`  - Prompt: ${options.prompt || 'nincs'}`));
    console.log(chalk.yellow(`  - Forrásmappa: ${SOURCE_DIR}`));
    console.log(chalk.yellow(`  - Célmappa: ${OUTPUT_DIR}`));
  }

  try {
    // Ellenőrizzük és létrehozzuk a könyvtárakat, ha szükséges
    await fsPromises.mkdir(SOURCE_DIR, { recursive: true });
    await fsPromises.mkdir(OUTPUT_DIR, { recursive: true });
    
    // Hangfájlok keresése
    const spinner = ora('Hangfájlok keresése...').start();
    const audioFiles = await findAudioFiles(SOURCE_DIR);
    spinner.succeed(`${audioFiles.length} hangfájl található`);
    
    if (audioFiles.length === 0) {
      console.log(chalk.yellow('Nincs feldolgozható hangfájl a source mappában.'));
      console.log(chalk.yellow(`Támogatott formátumok: ${SUPPORTED_FORMATS.join(', ')}`));
      process.exit(0);
    }
    
    // Feldolgozás
    console.log(chalk.blue('\nFeldolgozás kezdése...'));
    let successCount = 0;
    
    for (let i = 0; i < audioFiles.length; i++) {
      const audioFile = audioFiles[i];
      const relativePath = path.relative(SOURCE_DIR, audioFile);
      const outputFile = path.join(OUTPUT_DIR, `${path.basename(audioFile, path.extname(audioFile))}.txt`);
      
      const spinner = ora(`Feldolgozás (${i+1}/${audioFiles.length}): ${relativePath}`).start();
      
      const transcription = await transcribeAudio(
        audioFile,
        options.model,
        options.language,
        options.prompt
      );
      
      if (transcription) {
        await fsPromises.writeFile(outputFile, transcription, 'utf-8');
        spinner.succeed(`Átirat elkészült: ${path.basename(outputFile)}`);
        successCount++;
      } else {
        spinner.fail(`Nem sikerült átiratot készíteni: ${relativePath}`);
      }
    }
    
    // Összegzés
    console.log(chalk.blue('='.repeat(50)));
    console.log(chalk.blue.bold('Feldolgozás befejezve'));
    console.log(chalk.blue(`  - Összes fájl: ${audioFiles.length}`));
    console.log(chalk.green(`  - Sikeres: ${successCount}`));
    
    if (successCount < audioFiles.length) {
      console.log(chalk.red(`  - Sikertelen: ${audioFiles.length - successCount}`));
    }
    
    console.log(chalk.blue('='.repeat(50)));
    
  } catch (error) {
    console.error(chalk.red('Hiba történt:'));
    console.error(chalk.red(error.message));
    if (options.debug) {
      console.error(error);
    }
    process.exit(1);
  }
}

// Program indítása
main(); 