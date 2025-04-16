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

// Constants
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SOURCE_DIR = path.join(__dirname, 'source');
const OUTPUT_DIR = path.join(__dirname, 'transcriptions');

// API models
const MODELS = {
  'whisper-1': 'OpenAI Whisper (most accurate)',
  'whisper-1-quantized': 'OpenAI Whisper (optimized)',
};

// CLI options setup
program
  .version('1.0.0')
  .option('-m, --model <model>', 'Model to use', 'whisper-1')
  .option('-l, --language <language>', 'Language (auto, en, hu, etc)', 'auto')
  .option('-p, --prompt <prompt>', 'Helper prompt for more accurate transcription')
  .option('-d, --debug', 'Enable debug mode')
  .parse(process.argv);

const options = program.opts();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Supported audio formats
const SUPPORTED_FORMATS = ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm'];

/**
 * Transcribe audio file to text
 * @param {string} filePath - Path to the audio file
 * @param {string} model - Model to use
 * @param {string} language - Language code or 'auto'
 * @param {string} prompt - Helper prompt (optional)
 * @returns {Promise<string>} - Recognized text
 */
async function transcribeAudio(filePath, model, language, prompt) {
  try {
    // Create file stream instead of loading the entire file
    const fileStream = fs.createReadStream(filePath);
    
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: model,
      language: language !== 'auto' ? language : undefined,
      prompt: prompt,
    });
    
    return transcription.text;
  } catch (error) {
    console.error(chalk.red(`Error transcribing ${path.basename(filePath)}:`));
    console.error(chalk.red(error.message));
    if (options.debug) {
      console.error(error);
    }
    return null;
  }
}

/**
 * Find audio files recursively
 * @param {string} dir - Directory to search
 * @returns {Promise<string[]>} - List of found audio files
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
 * Main function
 */
async function main() {
  console.log(chalk.blue('='.repeat(50)));
  console.log(chalk.blue.bold('Whisper Audio Transcription App'));
  console.log(chalk.blue('='.repeat(50)));
  
  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    console.error(chalk.red('Error: OPENAI_API_KEY is not set in the .env file!'));
    process.exit(1);
  }
  
  // Check model
  if (!MODELS[options.model]) {
    console.error(chalk.red(`Error: Invalid model: ${options.model}`));
    console.log(chalk.yellow('Available models:'));
    Object.entries(MODELS).forEach(([id, description]) => {
      console.log(chalk.yellow(`  - ${id}: ${description}`));
    });
    process.exit(1);
  }
  
  // Display debug information
  if (options.debug) {
    console.log(chalk.yellow('Debug information:'));
    console.log(chalk.yellow(`  - Model: ${options.model} (${MODELS[options.model]})`));
    console.log(chalk.yellow(`  - Language: ${options.language}`));
    console.log(chalk.yellow(`  - Prompt: ${options.prompt || 'none'}`));
    console.log(chalk.yellow(`  - Source folder: ${SOURCE_DIR}`));
    console.log(chalk.yellow(`  - Output folder: ${OUTPUT_DIR}`));
  }

  try {
    // Check and create directories if needed
    await fsPromises.mkdir(SOURCE_DIR, { recursive: true });
    await fsPromises.mkdir(OUTPUT_DIR, { recursive: true });
    
    // Search for audio files
    const spinner = ora('Searching for audio files...').start();
    const audioFiles = await findAudioFiles(SOURCE_DIR);
    spinner.succeed(`Found ${audioFiles.length} audio files`);
    
    if (audioFiles.length === 0) {
      console.log(chalk.yellow('No audio files to process in the source folder.'));
      console.log(chalk.yellow(`Supported formats: ${SUPPORTED_FORMATS.join(', ')}`));
      process.exit(0);
    }
    
    // Processing
    console.log(chalk.blue('\nStarting processing...'));
    let successCount = 0;
    
    for (let i = 0; i < audioFiles.length; i++) {
      const audioFile = audioFiles[i];
      const relativePath = path.relative(SOURCE_DIR, audioFile);
      const outputFile = path.join(OUTPUT_DIR, `${path.basename(audioFile, path.extname(audioFile))}.txt`);
      
      const spinner = ora(`Processing (${i+1}/${audioFiles.length}): ${relativePath}`).start();
      
      const transcription = await transcribeAudio(
        audioFile,
        options.model,
        options.language,
        options.prompt
      );
      
      if (transcription) {
        await fsPromises.writeFile(outputFile, transcription, 'utf-8');
        spinner.succeed(`Transcript completed: ${path.basename(outputFile)}`);
        successCount++;
      } else {
        spinner.fail(`Failed to create transcript: ${relativePath}`);
      }
    }
    
    // Summary
    console.log(chalk.blue('='.repeat(50)));
    console.log(chalk.blue.bold('Processing completed'));
    console.log(chalk.blue(`  - Total files: ${audioFiles.length}`));
    console.log(chalk.green(`  - Successful: ${successCount}`));
    
    if (successCount < audioFiles.length) {
      console.log(chalk.red(`  - Failed: ${audioFiles.length - successCount}`));
    }
    
    console.log(chalk.blue('='.repeat(50)));
    
  } catch (error) {
    console.error(chalk.red('An error occurred:'));
    console.error(chalk.red(error.message));
    if (options.debug) {
      console.error(error);
    }
    process.exit(1);
  }
}

// Start program
main(); 