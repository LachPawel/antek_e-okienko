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

  // Fetch pending reports
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
    
    // Try to fetch existing analysis
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
        headers: {
          'Content-Type': 'application/json',
        },
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      {/* Header */}
      <header className="bg-emerald-800 text-white shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold">ZANT - Panel Urzędnika ZUS</h1>
          <p className="text-emerald-200 mt-1">System wsparcia decyzji w sprawach wypadków przy pracy</p>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Reports List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-emerald-800 mb-4">
                Oczekujące zgłoszenia ({reports.length})
              </h2>
              
              {reports.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Brak nowych zgłoszeń</p>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => handleSelectReport(report)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        selectedReport?.id === report.id
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="font-semibold text-gray-900">
                        Zgłoszenie #{report.id.slice(-8)}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        📍 {report.location}
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        {new Date(report.createdAt).toLocaleString('pl-PL')}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Report Details */}
          <div className="lg:col-span-2">
            {!selectedReport ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-gray-700">
                  Wybierz zgłoszenie z listy
                </h3>
                <p className="text-gray-500 mt-2">
                  Aby rozpocząć analizę i podjąć decyzję
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Report Details Card */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-emerald-800 mb-4">
                    Szczegóły zgłoszenia
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-sm font-semibold text-gray-600">Data zdarzenia:</span>
                      <p className="text-gray-900">{new Date(selectedReport.dateTime).toLocaleString('pl-PL')}</p>
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-gray-600">Miejsce:</span>
                      <p className="text-gray-900">{selectedReport.location}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="text-sm font-semibold text-gray-600">Opis wypadku:</span>
                    <p className="text-gray-900 mt-1 whitespace-pre-wrap">{selectedReport.description}</p>
                  </div>

                  <div className="mb-4">
                    <span className="text-sm font-semibold text-gray-600">Kontekst działalności:</span>
                    <p className="text-gray-900 mt-1">{selectedReport.businessContext}</p>
                  </div>

                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isAnalyzing ? '🔄 Analizuję...' : '🤖 Analiza AI (PLLuM)'}
                  </button>
                </div>

                {/* AI Analysis Card */}
                {aiAnalysis && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-2xl font-bold text-emerald-800 mb-4">
                      Rekomendacja AI
                    </h2>
                    
                    <div className={`p-4 rounded-lg mb-4 ${
                      aiAnalysis.verdict === 'APPROVE' 
                        ? 'bg-green-50 border-2 border-green-500'
                        : aiAnalysis.verdict === 'REJECT'
                        ? 'bg-red-50 border-2 border-red-500'
                        : 'bg-yellow-50 border-2 border-yellow-500'
                    }`}>
                      <div className="text-lg font-bold mb-2">
                        {aiAnalysis.verdict === 'APPROVE' && '✅ UZNAĆ'}
                        {aiAnalysis.verdict === 'REJECT' && '❌ ODMÓWIĆ'}
                        {aiAnalysis.verdict === 'AMBIGUOUS' && '⚠️ WYMAGA WERYFIKACJI'}
                      </div>
                      <div className="text-sm">
                        Pewność: {(aiAnalysis.confidence * 100).toFixed(0)}%
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="border-l-4 border-emerald-500 pl-4">
                        <div className="font-semibold">Nagłość zdarzenia:</div>
                        <div className="text-sm text-gray-700">{aiAnalysis.criteria.suddenEvent.reasoning}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Ocena: {(aiAnalysis.criteria.suddenEvent.score * 100).toFixed(0)}%
                        </div>
                      </div>

                      <div className="border-l-4 border-emerald-500 pl-4">
                        <div className="font-semibold">Przyczyna zewnętrzna:</div>
                        <div className="text-sm text-gray-700">{aiAnalysis.criteria.externalCause.reasoning}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Ocena: {(aiAnalysis.criteria.externalCause.score * 100).toFixed(0)}%
                        </div>
                      </div>

                      <div className="border-l-4 border-emerald-500 pl-4">
                        <div className="font-semibold">Związek z działalnością:</div>
                        <div className="text-sm text-gray-700">{aiAnalysis.criteria.businessConnection.reasoning}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Ocena: {(aiAnalysis.criteria.businessConnection.score * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Decision Card */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-emerald-800 mb-4">
                    Decyzja urzędnika
                  </h2>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Werdykt:
                    </label>
                    <div className="flex gap-4">
                      <button
                        onClick={() => setVerdict('APPROVE')}
                        className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                          verdict === 'APPROVE'
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        ✅ Uznać
                      </button>
                      <button
                        onClick={() => setVerdict('REJECT')}
                        className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                          verdict === 'REJECT'
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        ❌ Odmówić
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Uzasadnienie:
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      rows={4}
                      placeholder="Wpisz uzasadnienie decyzji..."
                    />
                  </div>

                  <button
                    onClick={handleSubmitVerdict}
                    disabled={isSubmitting || !notes.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? '⏳ Zapisuję...' : '✓ Zatwierdź decyzję'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
