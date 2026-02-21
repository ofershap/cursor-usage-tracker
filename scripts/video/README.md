# Demo Video Generator

Generate AI-narrated demo videos for cursor-usage-tracker using ElevenLabs text-to-speech.

## Setup

1. Get an API key from [ElevenLabs](https://elevenlabs.io/app/settings/api-keys) (Starter plan at $5/mo gives 30 min of audio)
2. Add to your `.env`:
   ```
   ELEVENLABS_API_KEY=your_key_here
   ```

## Workflow

```bash
# 1. Generate voice samples to compare candidates
source .env && tsx scripts/video/generate-audio.ts samples

# 2. Listen to samples in scripts/video/output/, pick your favorite

# 3. Generate all scene audio with your chosen voice
source .env && tsx scripts/video/generate-audio.ts generate Adam

# 4. Print the recording guide
tsx scripts/video/generate-audio.ts guide
```

## Recording

The generator outputs:

- One MP3 per scene (`01-hook.mp3`, `02-problem.mp3`, etc.)
- A `manifest.json` with narration text + screen instructions
- A printed recording guide with timing and tips

To record:

1. Run mock data: `npm run generate:mock`
2. Start the dev server: `DATABASE_PATH=data/mock.db npm run dev -- -p 3456`
3. Pre-open all pages in browser tabs
4. Play each scene's audio in headphones while screen recording
5. Combine audio + screen clips in CapCut or DaVinci Resolve

## Script

The demo script (`demo-script.json`) tells "The $6,000 Save" story in ~90 seconds:

| Scene       | Duration | What's shown                                            |
| ----------- | -------- | ------------------------------------------------------- |
| Hook        | ~7s      | Dashboard home — "$25k/month on Cursor"                 |
| Problem     | ~15s     | Elena's user page — spend spike from long conversations |
| Detection   | ~12s     | Anomalies page — automatic detection with MTTD metrics  |
| Slack Alert | ~6s      | The Slack notification (USP hero shot)                  |
| Recovery    | ~9s      | Elena's spend chart — 8x cost drop after intervention   |
| Montage     | ~13s     | Quick cuts: model switch, plan exhaustion, unused seats |
| CTA         | ~7s      | GitHub repo page — "Open source, deploy in 5 minutes"   |

## Voice Candidates

| Voice  | Style                                | Voice ID               |
| ------ | ------------------------------------ | ---------------------- |
| Adam   | Deep neutral American (most popular) | `pNInz6obpgDQGcFmaJgB` |
| Brian  | Warm conversational American         | `nPczCjzI2devNBz1zQrb` |
| George | Warm articulate British              | `JBFqnCBsd6RMkjVDRZzb` |

## Transcript

Full narration text (doubles as a textual walkthrough):

> Your team is spending twenty-five thousand dollars a month on Cursor. Do you know why?
>
> Three developers weren't starting new conversations. Their context windows grew to fifteen million tokens. Cost per request went from seventy-two cents to over six dollars — and nobody noticed.
>
> This dashboard caught it automatically. It runs anomaly detection on every team member — static thresholds, statistical z-scores, and trend analysis.
>
> And it sent a Slack notification the moment it happened.
>
> After we told them, costs dropped eight-x overnight. That's six thousand dollars saved from a single alert.
>
> It also catches expensive model switches — fourteen dollars per request instead of forty-two cents — plan exhaustion on day one, and unused seats burning three-sixty a month.
>
> Open source. Self-hosted. Deploy with Docker in five minutes.
