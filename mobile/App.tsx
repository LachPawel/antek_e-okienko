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

  const conversation = useConversation({
    onConnect: ({ conversationId }: { conversationId: string }) => {
      console.log('✅ Połączono z agentem', conversationId);
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
      
      if (message.type === 'text' && 'text' in message) {
        setConversationHistory(prev => [...prev, `${source}: ${message.text}`]);
        
        // Extract entities from conversation
        if (source === 'user' && 'text' in message) {
          const text = message.text.toLowerCase();
          
          // Simple extraction logic (in production, backend should do this)
          if (text.includes('data') || text.includes('dzisiaj') || text.includes('wczoraj')) {
            setExtractedData(prev => ({ ...prev, date: message.text }));
          }
          if (text.includes('godzina') || text.includes(':')) {
            setExtractedData(prev => ({ ...prev, time: message.text }));
          }
          if (text.includes('warszawa') || text.includes('miejsce') || text.includes('gdzie')) {
            setExtractedData(prev => ({ ...prev, location: message.text }));
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

  const submitAccidentReport = async () => {
    setIsSubmitting(true);
    
    const apiUrl = 'http://localhost:3001';
    
    const report: Partial<AccidentReport> = {
      id: Date.now().toString(),
      citizenId: 'demo-user',
      dateTime: new Date(),
      location: extractedData.location || 'Nie określono',
      description: conversationHistory.join('\n'),
      witnesses: extractedData.witnesses || [],
      medicalInfo: {
        injuries: extractedData.medicalInfo || 'Nie określono',
        medicalAid: 'Nie określono',
      },
      businessContext: extractedData.businessConnection || 'Nie określono',
      extractedEntities: extractedData as ExtractedEntities,
      conversationTranscript: [],
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
        console.log('✅ Zgłoszenie wysłane');
        // Reset state
        setExtractedData({});
        setConversationHistory([]);
      } else {
        console.error('❌ Błąd wysyłania zgłoszenia');
      }
    } catch (error) {
      console.error('❌ Błąd sieci:', error);
    } finally {
      setIsSubmitting(false);
    }
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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>ZANT</Text>
        <Text style={styles.subtitle}>Zgłoszenie Wypadku przy Pracy</Text>
      </View>

      <View style={styles.statusContainer}>
        <View
          style={[styles.statusDot, { backgroundColor: getStatusColor(conversation.status) }]}
        />
        <Text style={styles.statusText}>{getStatusText(conversation.status)}</Text>
      </View>

      {conversation.status === 'connected' && (
        <View style={styles.speakingContainer}>
          <View
            style={[
              styles.speakingDot,
              {
                backgroundColor: conversation.isSpeaking ? '#3B82F6' : '#93C5FD',
              },
            ]}
          />
          <Text
            style={[
              styles.speakingText,
              { color: conversation.isSpeaking ? '#1E40AF' : '#60A5FA' },
            ]}
          >
            {conversation.isSpeaking ? '🎤 Agent mówi...' : '👂 Słucham Cię...'}
          </Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.startButton, !canStart && styles.disabledButton]}
          onPress={startConversation}
          disabled={!canStart}
        >
          <Text style={styles.buttonText}>
            {isStarting ? 'Uruchamianie...' : 'Rozpocznij Zgłoszenie'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.endButton, !canEnd && styles.disabledButton]}
          onPress={endConversation}
          disabled={!canEnd}
        >
          <Text style={styles.buttonText}>Zakończ Rozmowę</Text>
        </TouchableOpacity>
      </View>

      {/* Accident Card Preview */}
      {Object.keys(extractedData).length > 0 && (
        <View style={styles.cardPreview}>
          <Text style={styles.cardTitle}>📋 Karta Wypadku (Podgląd)</Text>
          
          {extractedData.date && (
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Data:</Text>
              <Text style={styles.cardValue}>{extractedData.date}</Text>
            </View>
          )}
          
          {extractedData.time && (
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Godzina:</Text>
              <Text style={styles.cardValue}>{extractedData.time}</Text>
            </View>
          )}
          
          {extractedData.location && (
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Miejsce:</Text>
              <Text style={styles.cardValue}>{extractedData.location}</Text>
            </View>
          )}
          
          {extractedData.businessConnection && (
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Związek z pracą:</Text>
              <Text style={styles.cardValue}>{extractedData.businessConnection}</Text>
            </View>
          )}
        </View>
      )}

      {/* Submit Button */}
      {canSubmit && (
        <TouchableOpacity
          style={[styles.button, styles.submitButton, isSubmitting && styles.disabledButton]}
          onPress={submitAccidentReport}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonText}>
            {isSubmitting ? 'Wysyłanie...' : '✓ Wyślij Zgłoszenie'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Conversation History */}
      {conversationHistory.length > 0 && (
        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>Historia rozmowy:</Text>
          {conversationHistory.slice(-5).map((msg, index) => (
            <Text key={index} style={styles.historyMessage}>
              {msg}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

export default function App() {
  return (
    <ElevenLabsProvider>
      <ConversationScreen />
    </ElevenLabsProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFF6FF', // Light blue background
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1E3A8A', // Dark blue
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#3B82F6', // Blue
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    backgroundColor: '#DBEAFE',
    padding: 12,
    borderRadius: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
  },
  speakingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    backgroundColor: '#BFDBFE',
    padding: 12,
    borderRadius: 12,
  },
  speakingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  speakingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 24,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#3B82F6', // Blue
  },
  endButton: {
    backgroundColor: '#64748B', // Gray
  },
  submitButton: {
    backgroundColor: '#10B981', // Green
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#CBD5E1',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cardPreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 16,
  },
  cardRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    width: 140,
  },
  cardValue: {
    fontSize: 14,
    color: '#1E40AF',
    flex: 1,
  },
  historyContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
  },
  historyMessage: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
    lineHeight: 18,
  },
});
