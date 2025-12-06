import dotenv from 'dotenv';
import type { AIRecommendation, LegalCriteria } from '@zant/shared';

dotenv.config();

const HF_API_KEY = process.env.HF_API_KEY;
const HF_MODEL = process.env.HF_MODEL || 'CYFRAGOVPL/PLLuM-12B-instruct';
const AI_PROVIDER = process.env.AI_PROVIDER || 'huggingface';

interface AccidentContext {
  description: string;
  businessContext: string;
  location: string;
}

const ZUS_LEGAL_CONTEXT = `
ARTYKUŁY ZUS DOTYCZĄCE WYPADKÓW PRZY PRACY:

Art. 12: Wypadek przy pracy musi być NAGŁYM ZDARZENIEM (sudden event).
Art. 13: Wypadek musi być spowodowany PRZYCZYNĄ ZEWNĘTRZNĄ (external cause).
Art. 14: Wypadek musi wykazywać ZWIĄZEK Z DZIAŁALNOŚCIĄ GOSPODARCZĄ (business connection).

Przykłady ZWIĄZKU Z DZIAŁALNOŚCIĄ:
✅ APPROVE: "Naprawiałem maszynę u klienta" - bezpośredni związek z pracą
✅ APPROVE: "Jechałem na spotkanie biznesowe" - czynności służbowe
✅ APPROVE: "Montowałem produkt w siedzibie firmy klienta" - wykonywanie usługi

Przykłady BRAKU ZWIĄZKU:
❌ REJECT: "Robiłem zakupy po drodze do domu" - czynność prywatna
❌ REJECT: "Sprzątałem własne mieszkanie" - nie związane z działalnością
❌ REJECT: "Bawiłem się z dziećmi w domu" - życie prywatne
`;

export async function analyzeAccidentReport(
  context: AccidentContext
): Promise<AIRecommendation> {
  if (AI_PROVIDER === 'huggingface') {
    return await analyzeWithHuggingFace(context);
  }
  
  // Fallback to mock analysis
  return mockAnalysis(context);
}

async function analyzeWithHuggingFace(
  context: AccidentContext
): Promise<AIRecommendation> {
  const prompt = `${ZUS_LEGAL_CONTEXT}

ANALIZA ZGŁOSZENIA WYPADKU:

Opis wypadku: ${context.description}
Kontekst biznesowy: ${context.businessContext}
Miejsce: ${context.location}

Przeanalizuj to zgłoszenie według kryteriów ZUS i zwróć odpowiedź w formacie JSON:

{
  "verdict": "APPROVE" lub "REJECT" lub "AMBIGUOUS",
  "confidence": 0.0-1.0,
  "criteria": {
    "suddenEvent": {
      "score": 0.0-1.0,
      "reasoning": "wyjaśnienie po polsku",
      "citedArticle": "Art. 12"
    },
    "externalCause": {
      "score": 0.0-1.0,
      "reasoning": "wyjaśnienie po polsku",
      "citedArticle": "Art. 13"
    },
    "businessConnection": {
      "score": 0.0-1.0,
      "reasoning": "wyjaśnienie po polsku",
      "citedArticle": "Art. 14"
    }
  },
  "summary": "krótkie podsumowanie",
  "reasoning": ["punkt 1", "punkt 2", "punkt 3"]
}

Odpowiedź (tylko JSON):`;

  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${HF_MODEL}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 1000,
            temperature: 0.3,
            return_full_text: false,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('HuggingFace API error:', response.statusText);
      return mockAnalysis(context);
    }

    const data = await response.json();
    const generatedText = Array.isArray(data) ? data[0].generated_text : data.generated_text;

    // Try to parse JSON from response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        verdict: parsed.verdict || 'AMBIGUOUS',
        confidence: parsed.confidence || 0.5,
        criteria: {
          suddenEvent: parsed.criteria?.suddenEvent || {
            score: 0.5,
            reasoning: 'Brak analizy',
            citedArticle: 'Art. 12',
          },
          externalCause: parsed.criteria?.externalCause || {
            score: 0.5,
            reasoning: 'Brak analizy',
            citedArticle: 'Art. 13',
          },
          businessConnection: parsed.criteria?.businessConnection || {
            score: 0.5,
            reasoning: 'Brak analizy',
            citedArticle: 'Art. 14',
          },
        },
        summary: parsed.summary || 'Analiza nie powiodła się',
        reasoning: parsed.reasoning || ['Brak szczegółów'],
        generatedAt: new Date(),
      };
    }

    // Fallback if JSON parsing fails
    return mockAnalysis(context);
  } catch (error) {
    console.error('Error calling HuggingFace API:', error);
    return mockAnalysis(context);
  }
}

function mockAnalysis(context: AccidentContext): AIRecommendation {
  // Simple keyword-based analysis for demo
  const desc = context.description.toLowerCase();
  const biz = context.businessContext.toLowerCase();
  
  const hasBusinessKeywords = 
    biz.includes('klient') || 
    biz.includes('naprawa') || 
    biz.includes('spotkanie') ||
    biz.includes('montaż') ||
    biz.includes('usługa') ||
    desc.includes('firma');
  
  const hasPrivateKeywords = 
    desc.includes('zakupy') || 
    desc.includes('dom') || 
    desc.includes('prywat') ||
    desc.includes('rodzin');

  const businessScore = hasBusinessKeywords ? 0.85 : (hasPrivateKeywords ? 0.2 : 0.5);
  const verdict = businessScore > 0.7 ? 'APPROVE' : (businessScore < 0.4 ? 'REJECT' : 'AMBIGUOUS');

  return {
    verdict,
    confidence: Math.abs(businessScore - 0.5) * 2,
    criteria: {
      suddenEvent: {
        score: 0.9,
        reasoning: 'Zdarzenie ma charakter nagły i nieoczekiwany.',
        citedArticle: 'Art. 12',
      },
      externalCause: {
        score: 0.85,
        reasoning: 'Przyczyna wypadku była zewnętrzna względem poszkodowanego.',
        citedArticle: 'Art. 13',
      },
      businessConnection: {
        score: businessScore,
        reasoning: hasBusinessKeywords
          ? 'Wypadek miał bezpośredni związek z wykonywaniem działalności gospodarczej.'
          : hasPrivateKeywords
          ? 'Wypadek miał miejsce podczas czynności prywatnych, niezwiązanych z działalnością.'
          : 'Związek z działalnością gospodarczą wymaga dodatkowej weryfikacji.',
        citedArticle: 'Art. 14',
      },
    },
    summary:
      verdict === 'APPROVE'
        ? 'Zgłoszenie spełnia wszystkie kryteria wypadku przy pracy.'
        : verdict === 'REJECT'
        ? 'Zgłoszenie nie spełnia kryterium związku z działalnością gospodarczą.'
        : 'Zgłoszenie wymaga dodatkowej analizy przez urzędnika.',
    reasoning: [
      'Zdarzenie było nagłe i nieoczekiwane',
      hasBusinessKeywords ? 'Wykazano związek z działalnością' : 'Brak wyraźnego związku z działalnością',
      'Zalecana ' + (verdict === 'APPROVE' ? 'akceptacja' : verdict === 'REJECT' ? 'odmowa' : 'dodatkowa weryfikacja'),
    ],
    generatedAt: new Date(),
  };
}
