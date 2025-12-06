import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const accidentReports = sqliteTable('accident_reports', {
  id: text('id').primaryKey(),
  citizenId: text('citizen_id').notNull(),
  dateTime: integer('date_time', { mode: 'timestamp' }).notNull(),
  location: text('location').notNull(),
  description: text('description').notNull(),
  witnesses: text('witnesses').notNull(), // JSON array as string
  medicalInfoInjuries: text('medical_info_injuries').notNull(),
  medicalInfoMedicalAid: text('medical_info_medical_aid').notNull(),
  medicalInfoHospital: text('medical_info_hospital'),
  businessContext: text('business_context').notNull(),
  extractedEntities: text('extracted_entities').notNull(), // JSON as string
  conversationTranscript: text('conversation_transcript').notNull(), // JSON as string
  status: text('status').notNull(), // draft, submitted, reviewing, approved, rejected
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const aiAnalyses = sqliteTable('ai_analyses', {
  id: text('id').primaryKey(),
  reportId: text('report_id').notNull().unique(),
  verdict: text('verdict').notNull(), // APPROVE, REJECT, AMBIGUOUS
  confidence: real('confidence').notNull(),
  suddenEventScore: real('sudden_event_score').notNull(),
  suddenEventReasoning: text('sudden_event_reasoning').notNull(),
  externalCauseScore: real('external_cause_score').notNull(),
  externalCauseReasoning: text('external_cause_reasoning').notNull(),
  businessConnectionScore: real('business_connection_score').notNull(),
  businessConnectionReasoning: text('business_connection_reasoning').notNull(),
  summary: text('summary').notNull(),
  reasoning: text('reasoning').notNull(), // JSON array as string
  generatedAt: integer('generated_at', { mode: 'timestamp' }).notNull(),
});

export const officialDecisions = sqliteTable('official_decisions', {
  id: text('id').primaryKey(),
  reportId: text('report_id').notNull().unique(),
  officialId: text('official_id').notNull(),
  verdict: text('verdict').notNull(), // APPROVE, REJECT
  notes: text('notes').notNull(),
  overriddenAIRecommendation: integer('overridden_ai_recommendation', { mode: 'boolean' }).notNull(),
  decidedAt: integer('decided_at', { mode: 'timestamp' }).notNull(),
});

// Relations
export const accidentReportsRelations = relations(accidentReports, ({ one }) => ({
  aiAnalysis: one(aiAnalyses, {
    fields: [accidentReports.id],
    references: [aiAnalyses.reportId],
  }),
  officialDecision: one(officialDecisions, {
    fields: [accidentReports.id],
    references: [officialDecisions.reportId],
  }),
}));

export const aiAnalysesRelations = relations(aiAnalyses, ({ one }) => ({
  report: one(accidentReports, {
    fields: [aiAnalyses.reportId],
    references: [accidentReports.id],
  }),
}));

export const officialDecisionsRelations = relations(officialDecisions, ({ one }) => ({
  report: one(accidentReports, {
    fields: [officialDecisions.reportId],
    references: [accidentReports.id],
  }),
}));
