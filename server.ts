import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Shared Gemini client instance (lazy helper)
  function getGenAI() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // Health route
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', app: 'KNFG ATC Training Aid' });
  });

  // Evaluate Phraseology API Endpoint
  app.post('/api/ai/evaluate-phraseology', async (req, res) => {
    try {
      const { command, position, callsign, context } = req.body;

      if (!command) {
        return res.status(400).json({ error: 'Command text is required' });
      }

      const ai = getGenAI();
      if (!ai) {
        // Rule-based fallback if no API key set
        const lowerCmd = command.toLowerCase();
        let score = 85;
        let feedback = 'Standard phraseology recognized.';
        let readback = `${callsign || 'DEVIL 11'}, ROGER.`;

        if (lowerCmd.includes('cleared to land') || lowerCmd.includes('cleared touch and go')) {
          score = 95;
          feedback = 'Proper clearance phrasing used per FAA JO 7110.65.';
          readback = `CLEARED TO LAND RUNWAY 21, ${callsign || 'DEVIL 11'}.`;
        } else if (lowerCmd.includes('hold short')) {
          score = 90;
          feedback = 'Proper hold short directive. Ensure pilot readback includes runway designator.';
          readback = `HOLDING SHORT RUNWAY 03, ${callsign || 'DEVIL 11'}.`;
        } else if (lowerCmd.includes('taxi via')) {
          score = 92;
          feedback = 'Good taxi routing.';
          readback = `TAXI VIA ALPHA, BRAVO TO RUNWAY 21, ${callsign || 'KNIGHT 22'}.`;
        }

        return res.json({
          score,
          feedback,
          readback,
          corrections: [],
          source: 'local-rules',
        });
      }

      const prompt = `You are a Senior MCAS Camp Pendleton (KNFG Munn Field) Air Traffic Control Evaluator & Standardization Officer.
Evaluate the following ATC controller transmission against FAA JO 7110.65 Air Traffic Control standards and KNFG Local Operating Procedures (LOPs).

ATC Control Position: ${position || 'Local Control / Tower'}
Aircraft Callsign: ${callsign || 'DEVIL 11'}
Current Scenario/Context: ${context || 'Normal VFR/IFR operations at KNFG'}
Transmitted Command: "${command}"

Respond ONLY in JSON format with the following fields:
- "score": number (0 to 100)
- "feedback": short summary evaluation
- "readback": realistic pilot readback in standard military/civil radio phraseology
- "corrections": array of strings listing any standard phraseology defects or safety omissions (or empty array if perfect)
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      res.json({ ...parsed, source: 'gemini-3.6-flash' });
    } catch (err: any) {
      console.error('Error evaluating phraseology:', err);
      res.status(500).json({ error: 'Failed to evaluate phraseology: ' + (err.message || 'Unknown error') });
    }
  });

  // Generate Scenario API Endpoint
  app.post('/api/ai/generate-scenario', async (req, res) => {
    try {
      const { position, difficulty, focusArea } = req.body;

      const ai = getGenAI();
      if (!ai) {
        // Fallback default scenario
        return res.json({
          title: 'Morning Marine Layer & Helo Operations',
          position: position || 'Local Control',
          weather: 'Special VFR - Visibility 1.5 SM, Ceiling 600 ft OVC (Coastal Fog)',
          runwayInUse: '21',
          wind: '240 at 8 knots',
          altimeter: '29.92',
          objective: 'Manage SVFR arrival of MV-22 Osprey division while holding departure of AH-1Z at Helipad H2.',
          trafficList: [
            {
              callsign: 'DEVIL 11',
              type: 'MV-22B',
              location: 'Oceanside Pier (VFR Waypoint)',
              altitude: 1000,
              heading: 30,
              speed: 120,
              intent: 'Inbound for SVFR full stop runway 21',
              squawk: '4211',
            },
            {
              callsign: 'VIPER 02',
              type: 'AH-1Z',
              location: 'Hot Cargo Pad / Helipad H2',
              altitude: 0,
              heading: 210,
              speed: 0,
              intent: 'Request departure to R-2503 via North Corridor',
              squawk: '4202',
            },
          ],
          source: 'local-rules',
        });
      }

      const prompt = `Generate an authentic Air Traffic Control training scenario for MCAS Camp Pendleton (KNFG Munn Field).
Target Control Position: ${position || 'Tower / Local Control'}
Difficulty: ${difficulty || 'Intermediate'}
Focus Area: ${focusArea || 'Special VFR & Mixed Osprey / Helicopter Traffic'}

Respond strictly in JSON format with:
- "title": scenario name
- "position": control position name
- "weather": realistic weather briefing (e.g. CAVU or Marine Layer Fog)
- "runwayInUse": "03" or "21"
- "wind": wind string e.g. "210 at 10 knots"
- "altimeter": altimeter setting e.g. "29.95"
- "objective": core learning objective for controller trainee
- "trafficList": array of 2-4 aircraft objects with keys (callsign, type, location, altitude, heading, speed, intent, squawk)
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.4,
        },
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      res.json({ ...parsed, source: 'gemini-3.6-flash' });
    } catch (err: any) {
      console.error('Error generating scenario:', err);
      res.status(500).json({ error: 'Failed to generate scenario: ' + (err.message || 'Unknown error') });
    }
  });

  // Vite Middleware or Production Static Serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KNFG ATC Training Aid server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
