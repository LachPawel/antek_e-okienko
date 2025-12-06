import dotenv from 'dotenv';
import OpenAI from 'openai';
import type { AIRecommendation, LegalCriteria } from '@zant/shared';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const AI_PROVIDER = process.env.AI_PROVIDER || 'openai';

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

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
  if (AI_PROVIDER === 'openai' && openai) {
    return await analyzeWithOpenAI(context);
  }
  
  // Fallback to mock analysis
  return mockAnalysis(context);
}

async function analyzeWithOpenAI(
  context: AccidentContext
): Promise<AIRecommendation> {
  const systemPrompt = `${ZUS_LEGAL_CONTEXT}

Jesteś ekspertem ZUS analizującym zgłoszenia wypadków przy pracy. Analizuj według trzech kryteriów:
1. Nagłość zdarzenia (Art. 12)
2. Przyczyna zewnętrzna (Art. 13)
3. Związek z działalnością gospodarczą (Art. 14)

Zwróć odpowiedź WYŁĄCZNIE w formacie JSON bez dodatkowego tekstu.`;

  const userPrompt = `Przeanalizuj zgłoszenie wypadku:

Opis: ${context.description}
Kontekst biznesowy: ${context.businessContext}
Miejsce: ${context.location}

Zwróć JSON:
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
}`;

  try {
    const response = await openai!.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      console.error('Empty response from OpenAI');
      return mockAnalysis(context);
    }

    const parsed = JSON.parse(content);
    
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
      summary: parsed.summary || 'Analiza zakończona',
      reasoning: parsed.reasoning || [],
      generatedAt: new Date(),
    };
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
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
