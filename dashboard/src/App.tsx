import { useState, useEffect } from 'react';
import type { AccidentReport, AIRecommendation, ApiResponse } from '@zant/shared';

const API_URL = 'http://localhost:3001';

export default function App() {
  const [reports, setReports] = useState<AccidentReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<AccidentReport | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIRecommendation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verdict, setVerdict] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchPendingReports();
  }, []);

  const fetchPendingReports = async () => {
    try {
      const response = await fetch(`${API_URL}/api/accidents/pending`);
      const data: ApiResponse<AccidentReport[]> = await response.json();
      if (data.success && data.data) {
        setReports(data.data);
      }
    } catch (error) {
      console.error('Błąd pobierania zgłoszeń:', error);
    }
  };

  const handleSelectReport = async (report: AccidentReport) => {
    setSelectedReport(report);
    setAiAnalysis(null);
    setNotes('');
    
    try {
      const response = await fetch(`${API_URL}/api/accidents/${report.id}`);
      const data: ApiResponse<any> = await response.json();
      if (data.success && data.data?.analysis) {
        setAiAnalysis(data.data.analysis);
      }
    } catch (error) {
      console.error('Błąd pobierania analizy:', error);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedReport) return;
    
    setIsAnalyzing(true);
    try {
      const response = await fetch(`${API_URL}/api/accidents/${selectedReport.id}/analyze`, {
        method: 'POST',
      });
      const data: ApiResponse<AIRecommendation> = await response.json();
      if (data.success && data.data) {
        setAiAnalysis(data.data);
        setVerdict(data.data.verdict === 'APPROVE' ? 'APPROVE' : 'REJECT');
      }
    } catch (error) {
      console.error('Błąd analizy:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmitVerdict = async () => {
    if (!selectedReport) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/accidents/${selectedReport.id}/verdict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verdict,
          notes,
          officialId: 'demo-official',
          overriddenAIRecommendation: aiAnalysis ? verdict !== aiAnalysis.verdict : false,
        }),
      });
      
      if (response.ok) {
        alert('Decyzja została zapisana');
        setSelectedReport(null);
        setAiAnalysis(null);
        fetchPendingReports();
      }
    } catch (error) {
      console.error('Błąd zapisu decyzji:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif', margin: 0, padding: 0 }}>
      {/* Header */}
      <header style={{ 
        backgroundColor: '#fff', 
        borderBottom: '1px solid #e2e8f0',
        padding: '0 32px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            backgroundColor: '#005226',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '16px'
          }}>A</div>
          <div>
            <div style={{ fontWeight: '600', fontSize: '16px', color: '#0f172a' }}>Antek</div>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Panel Urzędnika</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', color: '#64748b' }}>Administrator</span>
          <div style={{ width: '32px', height: '32px', backgroundColor: '#e2e8f0', borderRadius: '50%' }}></div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '32px', height: 'calc(100vh - 64px)', boxSizing: 'border-box' }}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0, marginBottom: '8px' }}>
            Centrum Decyzyjne
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0, marginBottom: '24px' }}>
            Wybierz zgłoszenie, przeanalizuj i podejmij decyzję.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '32px', flex: 1, minHeight: 0 }}>
            {/* Left Panel - Reports List */}
            <div style={{ 
              backgroundColor: '#fff', 
              borderRadius: '12px', 
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ 
                padding: '16px 20px', 
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0
              }}>
                <span style={{ fontWeight: '600', fontSize: '14px', color: '#0f172a' }}>Zgłoszenia</span>
                <span style={{ 
                  backgroundColor: '#f1f5f9', 
                  padding: '4px 10px', 
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#475569'
                }}>{reports.length}</span>
              </div>
              
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {reports.length === 0 ? (
                  <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      backgroundColor: '#f1f5f9', 
                      borderRadius: '12px',
                      margin: '0 auto 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                      </svg>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>Brak zgłoszeń</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>Wszystkie sprawy zostały rozpatrzone</div>
                  </div>
                ) : (
                reports.map((report) => {
                  const isActive = selectedReport?.id === report.id;
                  return (
                    <div
                      key={report.id}
                      onClick={() => handleSelectReport(report)}
                      style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        backgroundColor: isActive ? '#f0fdf4' : '#fff',
                        borderLeft: isActive ? '3px solid #005226' : '3px solid transparent',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = '#fff';
                      }}
                    >
                      <div style={{ fontWeight: '500', fontSize: '14px', color: '#0f172a', marginBottom: '4px' }}>
                        {report.location}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {new Date(report.createdAt).toLocaleDateString('pl-PL')} • #{report.id.slice(-4)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel - Details */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {!selectedReport ? (
              <div style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                border: '2px dashed #e2e8f0',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  backgroundColor: '#f1f5f9', 
                  borderRadius: '16px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                    <path d="M15 19l-7-7 7-7"/>
                  </svg>
                </div>
                <div style={{ fontSize: '16px', color: '#64748b', fontWeight: '500' }}>
                  Wybierz zgłoszenie z listy
                </div>
                <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                  Kliknij na zgłoszenie aby zobaczyć szczegóły
                </div>
              </div>
            ) : (
              <div style={{ 
                backgroundColor: '#fff', 
                borderRadius: '12px', 
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                flex: 1,
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Green Header */}
                <div style={{
                  background: 'linear-gradient(135deg, #005226 0%, #059669 100%)',
                  padding: '24px',
                  color: '#fff'
                }}>
                  <div style={{ 
                    display: 'inline-block',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    marginBottom: '8px'
                  }}>ZGŁOSZENIE #{selectedReport.id.slice(-6)}</div>
                  <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>Analiza Wypadku</h2>
                </div>

                <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
                  {/* Info Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Data</div>
                      <div style={{ fontSize: '14px', color: '#0f172a' }}>{new Date(selectedReport.dateTime).toLocaleString('pl-PL')}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Miejsce</div>
                      <div style={{ fontSize: '14px', color: '#0f172a' }}>{selectedReport.location}</div>
                    </div>
                  </div>

                  {/* Description */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Opis zdarzenia</div>
                    <div style={{ 
                      backgroundColor: '#f8fafc', 
                      padding: '16px', 
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#334155',
                      lineHeight: '1.6'
                    }}>
                      {selectedReport.description}
                    </div>
                  </div>

                  {/* AI Analysis */}
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '24px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <circle cx="15.5" cy="8.5" r="1.5"/>
                          <path d="M9 15h6"/>
                        </svg>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>Analiza AI</span>
                      </div>
                      {!aiAnalysis && (
                        <button
                          onClick={handleAnalyze}
                          disabled={isAnalyzing}
                          style={{
                            backgroundColor: '#0f172a',
                            color: '#fff',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                            opacity: isAnalyzing ? 0.6 : 1
                          }}
                        >
                          {isAnalyzing ? 'Analizuję...' : 'Uruchom analizę'}
                        </button>
                      )}
                    </div>

                    {aiAnalysis && (
                      <div>
                        <div style={{
                          padding: '16px',
                          borderRadius: '8px',
                          backgroundColor: aiAnalysis.verdict === 'APPROVE' ? '#f0fdf4' : '#fef2f2',
                          border: `1px solid ${aiAnalysis.verdict === 'APPROVE' ? '#bbf7d0' : '#fecaca'}`,
                          marginBottom: '16px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '10px',
                              backgroundColor: aiAnalysis.verdict === 'APPROVE' ? '#dcfce7' : '#fee2e2',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {aiAnalysis.verdict === 'APPROVE' ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                                  <path d="M20 6L9 17l-5-5"/>
                                </svg>
                              ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5">
                                  <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                              )}
                            </div>
                            <div>
                              <div style={{ 
                                fontWeight: '600', 
                                color: aiAnalysis.verdict === 'APPROVE' ? '#166534' : '#991b1b',
                                fontSize: '14px'
                              }}>
                                {aiAnalysis.verdict === 'APPROVE' ? 'Rekomendacja: UZNAĆ' : 'Rekomendacja: ODMÓWIĆ'}
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748b' }}>
                                Pewność: {(aiAnalysis.confidence * 100).toFixed(0)}%
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Criteria */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {[
                            { label: 'Nagłość zdarzenia', val: aiAnalysis.criteria.suddenEvent },
                            { label: 'Przyczyna zewnętrzna', val: aiAnalysis.criteria.externalCause },
                            { label: 'Związek z pracą', val: aiAnalysis.criteria.businessConnection },
                          ].map((c, i) => (
                            <div key={i} style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              padding: '12px',
                              backgroundColor: '#f8fafc',
                              borderRadius: '6px'
                            }}>
                              <span style={{ fontSize: '13px', color: '#475569' }}>{c.label}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ 
                                  width: '80px', 
                                  height: '6px', 
                                  backgroundColor: '#e2e8f0', 
                                  borderRadius: '3px',
                                  overflow: 'hidden'
                                }}>
                                  <div style={{
                                    width: `${c.val.score * 100}%`,
                                    height: '100%',
                                    backgroundColor: c.val.score > 0.5 ? '#22c55e' : '#ef4444',
                                    borderRadius: '3px'
                                  }}></div>
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', width: '32px' }}>
                                  {(c.val.score * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Decision Section */}
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', marginBottom: '16px' }}>Twoja decyzja</div>
                    
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                      <button
                        onClick={() => setVerdict('APPROVE')}
                        style={{
                          flex: 1,
                          padding: '14px',
                          borderRadius: '8px',
                          border: verdict === 'APPROVE' ? '2px solid #005226' : '2px solid #e2e8f0',
                          backgroundColor: verdict === 'APPROVE' ? '#005226' : '#fff',
                          color: verdict === 'APPROVE' ? '#fff' : '#64748b',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        ✓ Uznaj wypadek
                      </button>
                      <button
                        onClick={() => setVerdict('REJECT')}
                        style={{
                          flex: 1,
                          padding: '14px',
                          borderRadius: '8px',
                          border: verdict === 'REJECT' ? '2px solid #dc2626' : '2px solid #e2e8f0',
                          backgroundColor: verdict === 'REJECT' ? '#dc2626' : '#fff',
                          color: verdict === 'REJECT' ? '#fff' : '#64748b',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        ✗ Odmów uznania
                      </button>
                    </div>

                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Uzasadnienie decyzji..."
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '14px',
                        minHeight: '80px',
                        resize: 'vertical',
                        outline: 'none',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#005226'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />

                    <button
                      onClick={handleSubmitVerdict}
                      disabled={isSubmitting}
                      style={{
                        width: '100%',
                        marginTop: '16px',
                        padding: '14px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#0f172a',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        opacity: isSubmitting ? 0.6 : 1,
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => { if (!isSubmitting) e.currentTarget.style.backgroundColor = '#1e293b'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0f172a'; }}
                    >
                      {isSubmitting ? 'Zapisywanie...' : 'Zatwierdź decyzję'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
