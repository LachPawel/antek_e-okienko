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
    
    // Use your Mac's local IP instead of localhost when testing on physical device
    const apiUrl = 'http://172.20.10.4:3001';
    
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
        <Text style={styles.title}>Antek E-Okienko</Text>
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
                backgroundColor: conversation.isSpeaking ? '#406835' : '#86EFAC',
              },
            ]}
          />
          <Text
            style={[
              styles.speakingText,
              { color: conversation.isSpeaking ? '#14532D' : '#166534' },
            ]}
          >
            {conversation.isSpeaking ? '🎤 Asystent mówi...' : '👂 Słucham Cię...'}
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
      <View style={styles.appContainer}>
        <ConversationScreen />
      </View>
    </ElevenLabsProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#406835',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  speakingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  speakingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  speakingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 30,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  startButton: {
    backgroundColor: '#406835',
  },
  endButton: {
    backgroundColor: '#EF4444',
  },
  submitButton: {
    backgroundColor: '#059669',
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardPreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#406835',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  cardRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  cardLabel: {
    width: 100,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  cardValue: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  historyContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4B5563',
    marginBottom: 8,
  },
  historyMessage: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
});
