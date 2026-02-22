import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.join(__dirname, "demo-script.json");
const OUTPUT_DIR = path.join(__dirname, "output");

interface VoiceCandidate {
  name: string;
  voiceId: string;
  style: string;
  note: string;
}

interface Scene {
  id: string;
  label: string;
  narration: string;
  screen: string;
  duration_estimate_sec: number;
  tips: string;
}

interface VoiceSettings {
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
}

interface DemoScript {
  title: string;
  voice: {
    candidates: VoiceCandidate[];
    selected: string | null;
    model: string;
    outputFormat: string;
    settings?: VoiceSettings;
  };
  scenes: Scene[];
}

function loadScript(): DemoScript {
  return JSON.parse(readFileSync(SCRIPT_PATH, "utf-8"));
}

function getClient(): ElevenLabsClient {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error("Missing ELEVENLABS_API_KEY environment variable.");
    console.error("Get your key at: https://elevenlabs.io/app/settings/api-keys");
    process.exit(1);
  }
  return new ElevenLabsClient({ apiKey });
}

async function streamToFile(stream: ReadableStream | Readable, filePath: string): Promise<void> {
  const nodeStream = stream instanceof Readable ? stream : Readable.fromWeb(stream as never);
  await pipeline(nodeStream, createWriteStream(filePath));
}

function buildVoiceSettings(script: DemoScript) {
  const s = script.voice.settings;
  if (!s) return undefined;
  return {
    stability: s.stability,
    similarityBoost: s.similarityBoost,
    style: s.style,
    useSpeakerBoost: s.useSpeakerBoost,
  };
}

async function generateSample(client: ElevenLabsClient, voice: VoiceCandidate, script: DemoScript) {
  const sampleText = script.scenes[0]?.narration ?? "";
  const outPath = path.join(OUTPUT_DIR, `sample-${voice.name.toLowerCase()}.mp3`);

  console.log(`  Generating sample for "${voice.name}" → ${outPath}`);
  const audio = await client.textToSpeech.convert(voice.voiceId, {
    text: sampleText,
    modelId: script.voice.model,
    outputFormat: script.voice.outputFormat as never,
    voiceSettings: buildVoiceSettings(script),
  });

  await streamToFile(audio, outPath);
  console.log(`  ✓ ${voice.name} sample saved`);
}

async function generateScene(
  client: ElevenLabsClient,
  scene: Scene,
  voiceId: string,
  script: DemoScript,
  index: number,
) {
  const paddedIndex = String(index + 1).padStart(2, "0");
  const outPath = path.join(OUTPUT_DIR, `${paddedIndex}-${scene.id}.mp3`);

  console.log(`  [${paddedIndex}] "${scene.label}" → ${outPath}`);
  const audio = await client.textToSpeech.convert(voiceId, {
    text: scene.narration,
    modelId: script.voice.model,
    outputFormat: script.voice.outputFormat as never,
    voiceSettings: buildVoiceSettings(script),
  });

  await streamToFile(audio, outPath);
  console.log(`  ✓ Scene ${paddedIndex} saved`);
}

function printRecordingGuide(script: DemoScript) {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║              RECORDING GUIDE                               ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  for (const [i, scene] of script.scenes.entries()) {
    const num = String(i + 1).padStart(2, "0");
    const audioFile = `${num}-${scene.id}.mp3`;

    console.log(`┌─ Scene ${num}: ${scene.label} (~${scene.duration_estimate_sec}s)`);
    console.log(`│  Audio: output/${audioFile}`);
    console.log(`│`);
    console.log(`│  🎤 Narration:`);
    console.log(`│  "${scene.narration}"`);
    console.log(`│`);
    console.log(`│  🖥  Screen:`);
    console.log(`│  ${scene.screen}`);
    console.log(`│`);
    console.log(`│  💡 Tips:`);
    console.log(`│  ${scene.tips}`);
    console.log(`└${"─".repeat(62)}\n`);
  }

  const total = script.scenes.reduce((s, sc) => s + sc.duration_estimate_sec, 0);
  console.log(`Total estimated duration: ${total}s`);
  console.log("\nWorkflow:");
  console.log("  1. Play each audio file in headphones");
  console.log("  2. Record your screen following the instructions above");
  console.log("  3. Drop audio + screen clips into CapCut/DaVinci in order");
  console.log("  4. Add zoom effects on the Slack alert and spend drop");
}

async function listVoices(client: ElevenLabsClient) {
  const response = await client.voices.search();
  const voices = response.voices ?? [];
  console.log(`\nFound ${voices.length} voices:\n`);

  const demoVoices = voices.filter(
    (v) =>
      v.name?.toLowerCase().includes("adam") ||
      v.name?.toLowerCase().includes("brian") ||
      v.name?.toLowerCase().includes("george"),
  );

  if (demoVoices.length > 0) {
    console.log("Matching candidate voices:");
    for (const v of demoVoices) {
      console.log(`  ${v.name} (${v.voiceId}) — ${v.category ?? "unknown category"}`);
    }
  }

  console.log(`\nAll premade voices:`);
  for (const v of voices.filter((v) => v.category === "premade").slice(0, 20)) {
    console.log(`  ${v.name} (${v.voiceId})`);
  }
}

async function main() {
  const command = process.argv[2] ?? "help";
  const script = loadScript();

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  const client = command !== "help" && command !== "guide" ? getClient() : (null as never);

  switch (command) {
    case "samples": {
      console.log("Generating voice samples (opening line with each candidate voice)...\n");
      for (const voice of script.voice.candidates) {
        await generateSample(client, voice, script);
      }
      console.log("\nDone! Listen to the samples in scripts/video/output/ and pick your favorite.");
      console.log("Then run: tsx scripts/video/generate-audio.ts generate <voice-name>");
      break;
    }

    case "generate": {
      const voiceName = process.argv[3];
      const candidate = voiceName
        ? script.voice.candidates.find((v) => v.name.toLowerCase() === voiceName.toLowerCase())
        : script.voice.candidates.find((v) => v.name === script.voice.selected);

      if (!candidate) {
        console.error(
          `Voice "${voiceName ?? "none"}" not found. Available: ${script.voice.candidates.map((v) => v.name).join(", ")}`,
        );
        process.exit(1);
      }

      console.log(`Generating all scenes with voice "${candidate.name}"...\n`);
      for (const [i, scene] of script.scenes.entries()) {
        await generateScene(client, scene, candidate.voiceId, script, i);
      }

      const manifest = script.scenes.map((scene, i) => ({
        file: `${String(i + 1).padStart(2, "0")}-${scene.id}.mp3`,
        label: scene.label,
        narration: scene.narration,
        screen_instruction: scene.screen,
        estimated_seconds: scene.duration_estimate_sec,
      }));
      writeFileSync(path.join(OUTPUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));

      console.log("\nAll scenes generated! Manifest saved to output/manifest.json");
      printRecordingGuide(script);
      break;
    }

    case "voices": {
      console.log("Listing available ElevenLabs voices...");
      await listVoices(client);
      break;
    }

    case "guide": {
      printRecordingGuide(script);
      break;
    }

    default: {
      console.log(`
Usage: tsx scripts/video/generate-audio.ts <command>

Commands:
  samples              Generate voice samples (one per candidate) to compare
  generate <voice>     Generate all scene audio files (e.g., generate Adam)
  voices               List available ElevenLabs voices
  guide                Print the recording guide without generating audio

Environment:
  ELEVENLABS_API_KEY   Your ElevenLabs API key (required for samples/generate/voices)

Workflow:
  1. Set ELEVENLABS_API_KEY in your .env or export it
  2. Run "samples" to hear each voice candidate
  3. Pick a voice, run "generate <name>" to create all scene audio
  4. Run "guide" anytime to see recording instructions
  5. Record your screen following the guide, using the audio as a timing track
      `);
    }
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
