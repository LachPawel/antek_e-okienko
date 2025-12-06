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
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-[#406835] text-white shadow-md border-b-4 border-[#659A41]">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-wide">Antek E-Okienko</h1>
            <p className="text-emerald-100 text-sm mt-0.5 font-light">Panel Urzędnika ZUS</p>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded text-sm font-medium">
            System Wspierania Decyzji
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Reports List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-800">
                  Oczekujące zgłoszenia <span className="ml-2 bg-[#406835] text-white text-xs px-2 py-1 rounded-full">{reports.length}</span>
                </h2>
              </div>
              
              {reports.length === 0 ? (
                <p className="text-gray-500 text-center py-12">Brak nowych zgłoszeń</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {reports.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => handleSelectReport(report)}
                      className={`w-full text-left p-4 transition-colors hover:bg-gray-50 ${
                        selectedReport?.id === report.id
                          ? 'bg-emerald-50 border-l-4 border-[#406835]'
                          : 'border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-gray-900 text-sm">#{report.id.slice(-6)}</span>
                        <span className="text-xs text-gray-500">{new Date(report.createdAt).toLocaleDateString('pl-PL')}</span>
                      </div>
                      <div className="text-sm text-gray-700 font-medium mb-1">
                        {report.location}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {report.description}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Report Details */}
          <div className="lg:col-span-2 space-y-6">
            {!selectedReport ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-16 text-center">
                <div className="text-6xl mb-6 opacity-20">📋</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Wybierz zgłoszenie z listy
                </h3>
                <p className="text-gray-500">
                  Wybierz sprawę z panelu po lewej stronie, aby rozpocząć proces weryfikacji.
                </p>
              </div>
            ) : (
              <>
                {/* Report Details Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800">
                      Szczegóły zgłoszenia
                    </h2>
                    <span className="text-sm text-gray-500">ID: {selectedReport.id}</span>
                  </div>
                  
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Data zdarzenia</label>
                        <p className="text-gray-900 font-medium">{new Date(selectedReport.dateTime).toLocaleString('pl-PL')}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Miejsce</label>
                        <p className="text-gray-900 font-medium">{selectedReport.location}</p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Opis wypadku</label>
                      <div className="bg-gray-50 p-4 rounded border border-gray-100 text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                        {selectedReport.description}
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Kontekst działalności</label>
                      <p className="text-gray-900 text-sm">{selectedReport.businessContext}</p>
                    </div>

                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="w-full bg-[#406835] hover:bg-[#2e4c25] text-white font-semibold py-3 px-6 rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                    >
                      {isAnalyzing ? (
                        <>🔄 Trwa analiza...</>
                      ) : (
                        <>🤖 Uruchom analizę AI (PLLuM)</>
                      )}
                    </button>
                  </div>
                </div>

                {/* AI Analysis Card */}
                {aiAnalysis && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100 flex justify-between items-center">
                      <h2 className="text-lg font-bold text-[#406835]">
                        Rekomendacja Systemu
                      </h2>
                      <div className="text-sm font-medium text-[#406835]">
                        Pewność: {(aiAnalysis.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className={`p-4 rounded mb-6 flex items-center gap-4 ${
                        aiAnalysis.verdict === 'APPROVE' 
                          ? 'bg-green-50 border border-green-200 text-green-800'
                          : aiAnalysis.verdict === 'REJECT'
                          ? 'bg-red-50 border border-red-200 text-red-800'
                          : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                      }`}>
                        <div className="text-3xl">
                          {aiAnalysis.verdict === 'APPROVE' && '✅'}
                          {aiAnalysis.verdict === 'REJECT' && '❌'}
                          {aiAnalysis.verdict === 'AMBIGUOUS' && '⚠️'}
                        </div>
                        <div>
                          <div className="font-bold text-lg">
                            {aiAnalysis.verdict === 'APPROVE' && 'REKOMENDACJA: UZNAĆ'}
                            {aiAnalysis.verdict === 'REJECT' && 'REKOMENDACJA: ODMÓWIĆ'}
                            {aiAnalysis.verdict === 'AMBIGUOUS' && 'WYMAGA WERYFIKACJI'}
                          </div>
                          <div className="text-sm opacity-80">
                            Na podstawie analizy kryteriów ustawowych
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {[
                          { label: 'Nagłość zdarzenia (Art. 12)', data: aiAnalysis.criteria.suddenEvent },
                          { label: 'Przyczyna zewnętrzna (Art. 13)', data: aiAnalysis.criteria.externalCause },
                          { label: 'Związek z działalnością (Art. 14)', data: aiAnalysis.criteria.businessConnection }
                        ].map((item, idx) => (
                          <div key={idx} className="border border-gray-100 rounded p-4">
                            <div className="flex justify-between items-center mb-2">
                              <div className="font-semibold text-gray-800">{item.label}</div>
                              <div className={`text-xs font-bold px-2 py-1 rounded ${
                                item.data.score > 0.7 ? 'bg-green-100 text-green-800' : 
                                item.data.score < 0.3 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                Zgodność: {(item.data.score * 100).toFixed(0)}%
                              </div>
                            </div>
                            <p className="text-sm text-gray-600">{item.data.reasoning}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Decision Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-bold text-gray-800">
                      Decyzja Końcowa
                    </h2>
                  </div>
                  
                  <div className="p-6">
                    <div className="mb-6">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                        Werdykt Urzędnika
                      </label>
                      <div className="flex gap-4">
                        <button
                          onClick={() => setVerdict('APPROVE')}
                          className={`flex-1 py-3 px-4 rounded border-2 font-semibold transition-all flex items-center justify-center gap-2 ${
                            verdict === 'APPROVE'
                              ? 'bg-green-600 border-green-600 text-white shadow-md'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-green-300 hover:bg-green-50'
                          }`}
                        >
                          ✅ UZNAĆ
                        </button>
                        <button
                          onClick={() => setVerdict('REJECT')}
                          className={`flex-1 py-3 px-4 rounded border-2 font-semibold transition-all flex items-center justify-center gap-2 ${
                            verdict === 'REJECT'
                              ? 'bg-red-600 border-red-600 text-white shadow-md'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-red-300 hover:bg-red-50'
                          }`}
                        >
                          ❌ ODMÓWIĆ
                        </button>
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Uzasadnienie Decyzji
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#406835] focus:border-transparent text-sm"
                        rows={4}
                        placeholder="Wpisz uzasadnienie decyzji..."
                      />
                    </div>

                    <button
                      onClick={handleSubmitVerdict}
                      disabled={isSubmitting || !notes.trim()}
                      className="w-full bg-gray-800 hover:bg-gray-900 text-white font-semibold py-4 px-6 rounded transition-colors disabled:opacity-50 shadow-sm"
                    >
                      {isSubmitting ? '⏳ Zapisywanie...' : '✓ Zatwierdź i Zakończ Sprawę'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
