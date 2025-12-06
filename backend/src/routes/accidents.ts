import { Router } from 'express';
import { db } from '../db';
import { accidentReports, aiAnalyses, officialDecisions } from '../db/schema';
import { eq } from 'drizzle-orm';
import { analyzeAccidentReport } from '../services/ai-analyzer';
import type { AccidentReport, ApiResponse, AIRecommendation, OfficialDecision } from '@zant/shared';

const router = Router();

// POST /api/accidents - Submit new accident report
router.post('/', async (req, res) => {
  try {
    const report = req.body as Partial<AccidentReport>;
    
    const newReport = {
      id: report.id || Date.now().toString(),
      citizenId: report.citizenId || 'demo-user',
      dateTime: new Date(report.dateTime || Date.now()),
      location: report.location || '',
      description: report.description || '',
      witnesses: JSON.stringify(report.witnesses || []),
      medicalInfoInjuries: report.medicalInfo?.injuries || '',
      medicalInfoMedicalAid: report.medicalInfo?.medicalAid || '',
      medicalInfoHospital: report.medicalInfo?.hospital || null,
      businessContext: report.businessContext || '',
      extractedEntities: JSON.stringify(report.extractedEntities || {}),
      conversationTranscript: JSON.stringify(report.conversationTranscript || []),
      status: 'submitted',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(accidentReports).values(newReport);

    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id: newReport.id },
      timestamp: new Date(),
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating accident report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create accident report',
      timestamp: new Date(),
    });
  }
});

// GET /api/accidents/pending - Get all pending reports
router.get('/pending', async (req, res) => {
  try {
    const reports = await db
      .select()
      .from(accidentReports)
      .where(eq(accidentReports.status, 'submitted'));

    const response: ApiResponse<any[]> = {
      success: true,
      data: reports.map(r => ({
        ...r,
        witnesses: JSON.parse(r.witnesses),
        extractedEntities: JSON.parse(r.extractedEntities),
        conversationTranscript: JSON.parse(r.conversationTranscript),
      })),
      timestamp: new Date(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching pending reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reports',
      timestamp: new Date(),
    });
  }
});

// POST /api/accidents/:id/analyze - Analyze report with PLLuM
router.post('/:id/analyze', async (req, res) => {
  try {
    const { id } = req.params;

    const report = await db
      .select()
      .from(accidentReports)
      .where(eq(accidentReports.id, id))
      .limit(1);

    if (report.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
        timestamp: new Date(),
      });
    }

    // Call AI analyzer
    const aiRecommendation = await analyzeAccidentReport({
      description: report[0].description,
      businessContext: report[0].businessContext,
      location: report[0].location,
    });

    // Store analysis
    const analysis = {
      id: Date.now().toString(),
      reportId: id,
      verdict: aiRecommendation.verdict,
      confidence: aiRecommendation.confidence,
      suddenEventScore: aiRecommendation.criteria.suddenEvent.score,
      suddenEventReasoning: aiRecommendation.criteria.suddenEvent.reasoning,
      externalCauseScore: aiRecommendation.criteria.externalCause.score,
      externalCauseReasoning: aiRecommendation.criteria.externalCause.reasoning,
      businessConnectionScore: aiRecommendation.criteria.businessConnection.score,
      businessConnectionReasoning: aiRecommendation.criteria.businessConnection.reasoning,
      summary: aiRecommendation.summary,
      reasoning: JSON.stringify(aiRecommendation.reasoning),
      generatedAt: new Date(),
    };

    await db.insert(aiAnalyses).values(analysis);

    // Update report status
    await db
      .update(accidentReports)
      .set({ status: 'reviewing', updatedAt: new Date() })
      .where(eq(accidentReports.id, id));

    const response: ApiResponse<AIRecommendation> = {
      success: true,
      data: aiRecommendation,
      timestamp: new Date(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error analyzing report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze report',
      timestamp: new Date(),
    });
  }
});

// GET /api/accidents/:id - Get single report with analysis
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const report = await db
      .select()
      .from(accidentReports)
      .where(eq(accidentReports.id, id))
      .limit(1);

    if (report.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
        timestamp: new Date(),
      });
    }

    const analysis = await db
      .select()
      .from(aiAnalyses)
      .where(eq(aiAnalyses.reportId, id))
      .limit(1);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        report: {
          ...report[0],
          witnesses: JSON.parse(report[0].witnesses),
          extractedEntities: JSON.parse(report[0].extractedEntities),
          conversationTranscript: JSON.parse(report[0].conversationTranscript),
        },
        analysis: analysis.length > 0 ? {
          ...analysis[0],
          reasoning: JSON.parse(analysis[0].reasoning),
        } : null,
      },
      timestamp: new Date(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch report',
      timestamp: new Date(),
    });
  }
});

// POST /api/accidents/:id/verdict - Submit official decision
router.post('/:id/verdict', async (req, res) => {
  try {
    const { id } = req.params;
    const decision = req.body as Partial<OfficialDecision>;

    const newDecision = {
      id: Date.now().toString(),
      reportId: id,
      officialId: decision.officialId || 'demo-official',
      verdict: decision.verdict || 'REJECT',
      notes: decision.notes || '',
      overriddenAIRecommendation: decision.overriddenAIRecommendation || false,
      decidedAt: new Date(),
    };

    await db.insert(officialDecisions).values(newDecision);

    // Update report status
    const finalStatus = newDecision.verdict === 'APPROVE' ? 'approved' : 'rejected';
    await db
      .update(accidentReports)
      .set({ status: finalStatus, updatedAt: new Date() })
      .where(eq(accidentReports.id, id));

    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id: newDecision.id },
      timestamp: new Date(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error submitting verdict:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit verdict',
      timestamp: new Date(),
    });
  }
});

export default router;
