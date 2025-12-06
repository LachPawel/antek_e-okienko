import { ElevenLabsProvider, useConversation } from '@elevenlabs/react-native';
import type { ConversationStatus, ConversationEvent, Role } from '@elevenlabs/react-native';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import Constants from 'expo-constants';
import type { AccidentReport, ExtractedEntities } from '@zant/shared';

const ConversationScreen = () => {
  const [extractedData, setExtractedData] = useState<Partial<ExtractedEntities>>({});
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  // API URL for backend
  const apiUrl = 'http://172.20.10.4:3001';

  // Function to extract data from conversation history
  const extractDataFromConversation = (history: string[]): {
    date?: string;
    time?: string;
    location?: string;
    description?: string;
    injuries?: string;
    businessContext?: string;
  } => {
    const fullText = history.join(' ').toLowerCase();
    const extracted: any = {};
    
    // Extract date - look for patterns like "5 grudnia", "dzisiaj", dates
    const datePatterns = [
      /(\d{1,2})\s*(stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|października|listopada|grudnia)/i,
      /(\d{1,2})[./-](\d{1,2})[./-]?(\d{2,4})?/,
    ];
    for (const pattern of datePatterns) {
      const match = fullText.match(pattern);
      if (match) {
        extracted.date = match[0];
        break;
      }
    }
    
    // Extract time - look for patterns like "18:00", "godzina 18"
    const timeMatch = fullText.match(/(\d{1,2})[:.h](\d{2})?|godzin[aę]?\s*(\d{1,2})/i);
    if (timeMatch) {
      extracted.time = timeMatch[0];
    }
    
    // Extract location - look for street names, addresses
    const locationPatterns = [
      /(?:ul\.?|ulica)\s*[\w\sąćęłńóśźż]+\s*\d*/i,
      /[\w\sąćęłńóśźż]+\s+\d+[a-z]?(?:\s*\/\s*\d+)?/i, // "Brzeszka 25"
    ];
    for (const line of history) {
      if (line.includes('user:')) {
        const userText = line.replace('user:', '').trim();
        // Check if it looks like an address (contains number after text)
        if (/^[\w\sąćęłńóśźż]+\s+\d+/.test(userText) && userText.length < 50) {
          extracted.location = userText;
          break;
        }
      }
    }
    
    // Extract injury description - look for body parts, injury types
    const injuryKeywords = ['złaman', 'uraz', 'ból', 'skalecz', 'oparz', 'stłucz', 'zwichn', 'noga', 'ręka', 'głowa', 'plecy', 'kręgosłup', 'spadł', 'uderzył'];
    for (const line of history) {
      const lowerLine = line.toLowerCase();
      if (injuryKeywords.some(k => lowerLine.includes(k))) {
        if (line.includes('user:')) {
          extracted.injuries = line.replace('user:', '').trim();
        }
      }
    }
    
    // Extract business context - work-related keywords
    const workKeywords = ['praca', 'pracował', 'montaż', 'naprawa', 'służbow', 'obowiązk', 'zleceni', 'rusztowani', 'wysokości'];
    for (const line of history) {
      const lowerLine = line.toLowerCase();
      if (workKeywords.some(k => lowerLine.includes(k)) && line.includes('user:')) {
        extracted.businessContext = line.replace('user:', '').trim();
        break;
      }
    }
    
    // Build description from key user statements
    const userStatements = history
      .filter(line => line.includes('user:') && line.length > 15)
      .map(line => line.replace('user:', '').trim())
      .filter(text => text !== '...' && text.length > 5);
    
    if (userStatements.length > 0) {
      extracted.description = userStatements.join('. ');
    }
    
    return extracted;
  };

  // Function to submit accident report
  const submitAccidentReportWithData = async (data: {
    business_context?: string;
    location?: string;
    date?: string;
    time?: string;
    description?: string;
    injuries?: string;
  }) => {
    if (formSubmitted) return; // Prevent double submission
    setFormSubmitted(true);
    setIsSubmitting(true);
    
    console.log('📋 Wysyłanie zgłoszenia z danymi:', data);
    
    // Extract real data from conversation
    const extractedFromConversation = extractDataFromConversation(conversationHistory);
    console.log('📋 Extracted from conversation:', extractedFromConversation);

    const report: Partial<AccidentReport> = {
      id: Date.now().toString(),
      citizenId: 'demo-user',
      dateTime: new Date(),
      location: data.location || extractedFromConversation.location || 'Lokalizacja z rozmowy',
      description: extractedFromConversation.description || conversationHistory.filter(l => l.includes('user:')).map(l => l.replace('user:', '').trim()).join('. ') || 'Opis z rozmowy telefonicznej',
      witnesses: [],
      medicalInfo: {
        injuries: data.injuries || extractedFromConversation.injuries || 'Do ustalenia na podstawie dokumentacji medycznej',
        medicalAid: 'Informacja z rozmowy',
      },
      businessContext: data.business_context || extractedFromConversation.businessContext || 'Związek z pracą potwierdzony w rozmowie',
      extractedEntities: {
        date: data.date || extractedFromConversation.date || new Date().toLocaleDateString('pl-PL'),
        time: data.time || extractedFromConversation.time || '',
        location: data.location || extractedFromConversation.location || '',
        businessConnection: data.business_context || extractedFromConversation.businessContext || '',
      } as ExtractedEntities,
      conversationTranscript: conversationHistory,
      status: 'submitted',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const response = await fetch(`${apiUrl}/api/accidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      });

      if (response.ok) {
        console.log('✅ Zgłoszenie wysłane pomyślnie!');
        setExtractedData({});
        setConversationHistory([]);
      } else {
        console.error('❌ Błąd wysyłania zgłoszenia:', response.status);
      }
    } catch (error) {
      console.error('❌ Błąd sieci:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const conversation = useConversation({
    onConnect: ({ conversationId }: { conversationId: string }) => {
      console.log('✅ Połączono z agentem', conversationId);
      setFormSubmitted(false); // Reset on new connection
    },
    onDisconnect: (details: string) => {
      console.log('❌ Rozłączono', details);
    },
    onError: (message: string, context?: Record<string, unknown>) => {
      console.error('❌ Błąd:', message, context);
      if (message.includes('Network')) {
        console.log('💡 Sprawdź połączenie internetowe lub kredyty w Eleven Labs');
      }
    },
    onMessage: ({ message, source }: { message: ConversationEvent; source: Role }) => {
      console.log(`💬 Wiadomość od ${source}:`, message);
      console.log('📝 Full message object:', JSON.stringify(message));
      
      // Extract text from message - handle different message formats
      let text = '';
      if (typeof message === 'string') {
        text = message;
      } else if (message && typeof message === 'object') {
        // Try different possible text fields
        text = (message as any).text || (message as any).content || (message as any).message || '';
      }
      
      console.log('📝 Extracted text:', text);
      
      if (text) {
        setConversationHistory(prev => [...prev, `${source}: ${text}`]);
        
        // FALLBACK: Detect when agent says it's generating/submitting the form
        const lowerText = text.toLowerCase();
        console.log('📝 Lower text:', lowerText);
        
        const hasKeyword = 
          lowerText.includes('generuję') ||
          lowerText.includes('generuje') ||
          lowerText.includes('wysyłam') ||
          lowerText.includes('przesyłam') ||
          lowerText.includes('rejestruję') ||
          lowerText.includes('zgłoszenie zostało') ||
          lowerText.includes('formularz został') ||
          lowerText.includes('karta wypadku') ||
          lowerText.includes('projekt karty');
          
        console.log('📝 Has keyword?', hasKeyword);
        
        if (hasKeyword && !formSubmitted) {
          console.log('🎯 WYKRYTO SŁOWO KLUCZOWE! Wysyłam zgłoszenie...');
          submitAccidentReportWithData({});
        }
        
        // Extract entities from user messages
        if (source === 'user') {
          const lowerText = text.toLowerCase();
          if (lowerText.includes('data') || lowerText.includes('dzisiaj') || lowerText.includes('wczoraj')) {
            setExtractedData(prev => ({ ...prev, date: text }));
          }
          if (lowerText.includes('godzina') || lowerText.includes(':')) {
            setExtractedData(prev => ({ ...prev, time: text }));
          }
          if (lowerText.includes('warszawa') || lowerText.includes('miejsce') || lowerText.includes('gdzie')) {
            setExtractedData(prev => ({ ...prev, location: text }));
          }
        }
      }
    },
    onModeChange: ({ mode }: { mode: 'speaking' | 'listening' }) => {
      console.log(`🔊 Tryb: ${mode === 'speaking' ? 'Mówię' : 'Słucham'}`);
    },
    onStatusChange: ({ status }: { status: ConversationStatus }) => {
      console.log(`📡 Status: ${status}`);
    },
    // CLIENT TOOLS - handle fill_accident_form from ElevenLabs agent
    clientTools: {
      fill_accident_form: async (params: { business_context?: string }) => {
        console.log('🔧 CLIENT TOOL CALLED: fill_accident_form', params);
        await submitAccidentReportWithData(params);
        return 'Zgłoszenie zostało pomyślnie zarejestrowane w systemie.';
      },
    },
  });

  const [isStarting, setIsStarting] = useState(false);

  const startConversation = async () => {
    if (isStarting) return;

    // In Expo, EXPO_PUBLIC_ prefix makes env vars available at build time
    const agentId = ''; // TODO: Load from secure config
    
    if (!agentId) {
      console.error('❌ Brak EXPO_PUBLIC_AGENT_ID w konfiguracji');
      return;
    }
    
    console.log('✅ Łączenie z agentem...');

    setIsStarting(true);
    try {
      await conversation.startSession({
        agentId,
        dynamicVariables: {
          platform: Platform.OS,
        },
      });
    } catch (error: any) {
      console.error('Błąd uruchamiania rozmowy:', error);
      console.log('💡 Możliwe przyczyny:');
      console.log('  - Brak internetu na urządzeniu');
      console.log('  - Brak kredytów w Eleven Labs');
      console.log('  - Problem z API Eleven Labs');
    } finally {
      setIsStarting(false);
    }
  };

  const endConversation = async () => {
    try {
      await conversation.endSession();
    } catch (error) {
      console.error('Błąd kończenia rozmowy:', error);
    }
  };

  // Keep legacy function for manual submit button (calls the new one)
  const submitAccidentReport = async () => {
    await submitAccidentReportWithData({});
  };

  const getStatusColor = (status: ConversationStatus): string => {
    switch (status) {
      case 'connected':
        return '#10B981';
      case 'connecting':
        return '#F59E0B';
      case 'disconnected':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: ConversationStatus): string => {
    const statusMap = {
      connected: 'Połączono',
      connecting: 'Łączenie...',
      disconnected: 'Rozłączono',
    };
    return statusMap[status] || status;
  };

  const canStart = conversation.status === 'disconnected' && !isStarting;
  const canEnd = conversation.status === 'connected';
  const canSubmit = conversationHistory.length > 0 && conversation.status === 'disconnected';

  return (
    <View style={styles.mainContainer}>
      {/* Modern Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>Z</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Antek</Text>
            <Text style={styles.headerSubtitle}>Asystent Głosowy</Text>
          </View>
        </View>
        <View style={styles.headerBadge}>
           <Text style={styles.headerBadgeText}>BETA</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <View style={styles.statusCard}>
           <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(conversation.status) }]} />
           <Text style={styles.statusLabel}>Status:</Text>
           <Text style={styles.statusValue}>{getStatusText(conversation.status)}</Text>
        </View>

        {/* Main Action Area */}
        <View style={styles.actionArea}>
           {conversation.status === 'connected' ? (
              <View style={styles.activeCallCard}>
                 <View style={[styles.pulseRing, conversation.isSpeaking && styles.pulseActive]}>
                    <Text style={styles.pulseIcon}>{conversation.isSpeaking ? '🔊' : '👂'}</Text>
                 </View>
                 <Text style={styles.activeCallTitle}>
                    {conversation.isSpeaking ? 'Asystent mówi...' : 'Słucham Cię...'}
                 </Text>
                 <Text style={styles.activeCallSubtitle}>
                    Opowiadaj swobodnie o zdarzeniu.
                 </Text>
                 
                 <TouchableOpacity
                    style={styles.hangupButton}
                    onPress={endConversation}
                 >
                    <Text style={styles.hangupButtonText}>Zakończ Rozmowę</Text>
                 </TouchableOpacity>
              </View>
           ) : (
              <TouchableOpacity
                style={[styles.startCard, !canStart && styles.disabledCard]}
                onPress={startConversation}
                disabled={!canStart}
              >
                 <View style={styles.startIconContainer}>
                    <Text style={styles.startIcon}>🎙️</Text>
                 </View>
                 <Text style={styles.startTitle}>
                    {isStarting ? 'Łączenie...' : 'Rozpocznij Zgłoszenie'}
                 </Text>
                 <Text style={styles.startSubtitle}>
                    Kliknij, aby połączyć się z asystentem AI i opisać wypadek.
                 </Text>
              </TouchableOpacity>
           )}
        </View>

        {/* Live Data Preview */}
        {Object.keys(extractedData).length > 0 && (
           <View style={styles.dataCard}>
              <Text style={styles.sectionTitle}>📋 Zebrane Dane</Text>
              {extractedData.date && (
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Data:</Text>
                  <Text style={styles.dataValue}>{extractedData.date}</Text>
                </View>
              )}
              {extractedData.location && (
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Miejsce:</Text>
                  <Text style={styles.dataValue}>{extractedData.location}</Text>
                </View>
              )}
              {extractedData.businessConnection && (
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Związek:</Text>
                  <Text style={styles.dataValue}>{extractedData.businessConnection}</Text>
                </View>
              )}
           </View>
        )}

        {/* Submit Action */}
        {canSubmit && (
           <TouchableOpacity
              style={styles.submitButton}
              onPress={submitAccidentReport}
              disabled={isSubmitting}
           >
              <Text style={styles.submitButtonText}>
                 {isSubmitting ? 'Wysyłanie...' : '✓ Wyślij Zgłoszenie'}
              </Text>
           </TouchableOpacity>
        )}
        
        {/* Transcript Preview */}
        {conversationHistory.length > 0 && (
          <View style={styles.transcriptContainer}>
             <Text style={styles.transcriptTitle}>Ostatnie wiadomości</Text>
             {conversationHistory.slice(-3).map((msg, i) => (
                <Text key={i} style={styles.transcriptText} numberOfLines={2}>{msg}</Text>
             ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default function App() {
  return (
    <ElevenLabsProvider>
      <View style={styles.appContainer}>
        <ConversationScreen />
      </View>
    </ElevenLabsProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingTop: Constants.statusBarHeight + 16,
    paddingBottom: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#005226',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#005226',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#475569',
    letterSpacing: 0.5,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 32,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    marginRight: 6,
  },
  statusValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: 'bold',
  },
  actionArea: {
    marginBottom: 32,
  },
  startCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 48,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#005226',
    ...Platform.select({
      ios: {
        shadowColor: '#005226',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  disabledCard: {
    opacity: 0.5,
    borderColor: '#CBD5E1',
  },
  startIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: '#BBF7D0',
  },
  startIcon: {
    fontSize: 48,
  },
  startTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  startSubtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  activeCallCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderRadius: 32,
    padding: 48,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  pulseRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 4,
    borderColor: '#10B981',
    ...Platform.select({
      ios: {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  pulseActive: {
    borderColor: '#059669',
  },
  pulseIcon: {
    fontSize: 56,
  },
  activeCallTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  activeCallSubtitle: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 32,
    textAlign: 'center',
  },
  hangupButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  hangupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dataCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 16,
  },
  dataRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dataLabel: {
    width: 100,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  dataValue: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#005226',
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#005226',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  transcriptContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  transcriptTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transcriptText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 8,
  },
});
