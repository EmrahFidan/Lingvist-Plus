import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Levenshtein from 'fast-levenshtein';
import CompletionScreen from './CompletionScreen';
import useSettingsStore from '../stores/useSettingsStore';
import useFlashcardStore from '../stores/useFlashcardStore';
import { FSRSEngine, DataMigrationHelper } from '../utils/fsrs';
import { WeightedSelectionEngine, SessionProgressManager } from '../utils/weightedSelection';
import CSVHandler from '../utils/csvHandler';
import {
  Box,
  Typography,
  TextField,
  LinearProgress,
  IconButton,
  Paper,
  Fade,
  Button,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  VolumeUp as VolumeUpIcon,
  CheckCircle as CheckIcon,
  Close as CloseIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';




// Function to generate word variations (plural/singular forms)
const generateWordVariations = (word) => {
  const variations = [];
  const lowerWord = word.toLowerCase();

  // Add the original word
  variations.push(word);

  // Handle common plural rules
  if (lowerWord.endsWith('s')) {
    // If word ends with 's', try removing it (plural -> singular)
    const singular = lowerWord.slice(0, -1);
    variations.push(singular);
    variations.push(singular.charAt(0).toUpperCase() + singular.slice(1));
  } else {
    // If word doesn't end with 's', try adding 's' (singular -> plural)
    const plural = lowerWord + 's';
    variations.push(plural);
    variations.push(plural.charAt(0).toUpperCase() + plural.slice(1));
  }

  // Handle words ending with 'es' (e.g., boxes, wishes)
  if (lowerWord.endsWith('es')) {
    const withoutEs = lowerWord.slice(0, -2);
    variations.push(withoutEs);
    variations.push(withoutEs.charAt(0).toUpperCase() + withoutEs.slice(1));
  } else if (!lowerWord.endsWith('s')) {
    const withEs = lowerWord + 'es';
    variations.push(withEs);
    variations.push(withEs.charAt(0).toUpperCase() + withEs.slice(1));
  }

  // Handle words ending with 'y' -> 'ies' (e.g., city -> cities)
  if (lowerWord.endsWith('ies')) {
    const withY = lowerWord.slice(0, -3) + 'y';
    variations.push(withY);
    variations.push(withY.charAt(0).toUpperCase() + withY.slice(1));
  } else if (lowerWord.endsWith('y') && lowerWord.length > 1) {
    const withIes = lowerWord.slice(0, -1) + 'ies';
    variations.push(withIes);
    variations.push(withIes.charAt(0).toUpperCase() + withIes.slice(1));
  }

  // Handle some irregular plurals
  const irregulars = {
    'child': 'children',
    'children': 'child',
    'man': 'men',
    'men': 'man',
    'woman': 'women',
    'women': 'woman',
    'person': 'people',
    'people': 'person',
    'foot': 'feet',
    'feet': 'foot',
    'tooth': 'teeth',
    'teeth': 'tooth',
    'mouse': 'mice',
    'mice': 'mouse',
    'goose': 'geese',
    'geese': 'goose'
  };

  if (irregulars[lowerWord]) {
    const irregular = irregulars[lowerWord];
    variations.push(irregular);
    variations.push(irregular.charAt(0).toUpperCase() + irregular.slice(1));
  }

  // Add capitalized versions of all variations
  variations.forEach(variation => {
    if (variation !== variation.charAt(0).toUpperCase() + variation.slice(1)) {
      variations.push(variation.charAt(0).toUpperCase() + variation.slice(1));
    }
  });

  // Remove duplicates and return
  return [...new Set(variations)];
};

const LingvistFlashcard = () => {
  const navigate = useNavigate();
  const {
    targetGoal,
    currentProgress,
    incrementProgress,
    resetProgress,
    checkDailyReset,
  } = useSettingsStore();

  const { practiceCards, updatePracticeCard } = useFlashcardStore();

  // Component mount olduğunda günlük sıfırlamayı kontrol et
  useEffect(() => {
    checkDailyReset();
  }, [checkDailyReset]);

  const handleNavigateToSettings = () => {
    navigate('/settings');
  };

  // System Integration
  const fsrsEngine = useMemo(() => new FSRSEngine(), []);
  const sessionManager = useMemo(() => new SessionProgressManager(), []);
  const weightedSelection = useMemo(() => new WeightedSelectionEngine(), []);
  const csvHandler = useMemo(() => new CSVHandler(), []);

  const [userInput, setUserInput] = useState('');
  const [isCorrect, setIsCorrect] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentCard, setCurrentCard] = useState(null);
  const [flashcardData, setFlashcardData] = useState([]);
  const [currentSessionProgress, setCurrentSessionProgress] = useState(0);

  // CSV Menu States
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [alertInfo, setAlertInfo] = useState({ open: false, message: '', severity: 'info' });
  const fileInputRef = useRef(null);

  const inputRef = useRef(null);
  const textRef = useRef(null);
  const [dynamicFontSize, setDynamicFontSize] = useState({ xs: '1.8rem', sm: '2rem', md: '2.2rem' });

  // Text overflow kontrolü ve dinamik font size ayarlama
  useEffect(() => {
    const checkTextOverflow = () => {
      if (textRef.current && currentCard?.translationWithUnderline) {
        const container = textRef.current.parentElement;
        const containerWidth = container.offsetWidth - 16; // minimum padding

        // Plain text çıkar (HTML tagları olmadan)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = currentCard.translationWithUnderline;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';

        // Çok daha büyük fontlarla test et
        const fontSizes = [
          { size: '2.2rem', xs: '1.8rem', sm: '2rem', md: '2.2rem' },
          { size: '2rem', xs: '1.6rem', sm: '1.8rem', md: '2rem' },
          { size: '1.8rem', xs: '1.4rem', sm: '1.6rem', md: '1.8rem' },
          { size: '1.6rem', xs: '1.2rem', sm: '1.4rem', md: '1.6rem' },
          { size: '1.4rem', xs: '1rem', sm: '1.2rem', md: '1.4rem' },
          { size: '1.2rem', xs: '0.9rem', sm: '1rem', md: '1.2rem' },
          { size: '1rem', xs: '0.8rem', sm: '0.9rem', md: '1rem' },
        ];

        for (let i = 0; i < fontSizes.length; i++) {
          const testElement = document.createElement('div');
          testElement.style.position = 'absolute';
          testElement.style.visibility = 'hidden';
          testElement.style.whiteSpace = 'nowrap';
          testElement.style.fontSize = fontSizes[i].size;
          testElement.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          testElement.textContent = plainText;
          document.body.appendChild(testElement);

          const textWidth = testElement.offsetWidth;
          document.body.removeChild(testElement);

          if (textWidth <= containerWidth) {
            setDynamicFontSize({
              xs: fontSizes[i].xs,
              sm: fontSizes[i].sm,
              md: fontSizes[i].md
            });
            return;
          }
        }

        // Eğer hiçbiri uymuyorsa minimum boyutu kullan
        setDynamicFontSize({
          xs: '0.9rem',
          sm: '1rem',
          md: '1.1rem'
        });
      }
    };

    // Delay ekle - DOM render'ı bekle
    const timeoutId = setTimeout(checkTextOverflow, 100);

    // Window resize'da kontrol et
    window.addEventListener('resize', checkTextOverflow);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkTextOverflow);
    };
  }, [currentCard]);

  // Her yeni kart yüklendiğinde input alanına odaklan
  useEffect(() => {
    if (!showFeedback && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentCard, showFeedback]);

  // Varsayılan veri - Weighted Selection uyumlu format
  const defaultData = useMemo(() => [
    {
      id: 'friends_001',
      sentence: "Friends are very important in life",
      missingWord: "friends",
      translation: "Arkadaşlar hayatta çok önemlidir.",
      translationWithUnderline: "<u>Arkadaşlar</u> hayatta çok önemlidir.",
      sentenceTranslation: "Arkadaşlar hayatta çok önemlidir.",
      repeatCount: 0, // Legacy
      masteryLevel: 0, // 0-5 progress tracking
      sessionProgress: 0,
      sessionCompleted: false,
      lastPracticed: null,
      fsrs: fsrsEngine.createNewCard()
    },
    {
      id: 'exam_002',
      sentence: "She is studying for her exam",
      missingWord: "exam",
      translation: "O sınavı için çalışıyor.",
      translationWithUnderline: "O <u>sınavı</u> için çalışıyor.",
      sentenceTranslation: "O sınavı için çalışıyor.",
      repeatCount: 0,
      masteryLevel: 0,
      sessionProgress: 0,
      sessionCompleted: false,
      lastPracticed: null,
      fsrs: fsrsEngine.createNewCard()
    },
    {
      id: 'groceries_003',
      sentence: "We need to buy some groceries",
      missingWord: "groceries",
      translation: "Biraz market alışverişi yapmamız gerekiyor.",
      translationWithUnderline: "Biraz <u>market alışverişi</u> yapmamız gerekiyor.",
      sentenceTranslation: "Biraz market alışverişi yapmamız gerekiyor.",
      repeatCount: 0,
      masteryLevel: 0,
      sessionProgress: 0,
      sessionCompleted: false,
      lastPracticed: null,
      fsrs: fsrsEngine.createNewCard()
    },
  ], [fsrsEngine]);

  // Firebase'den veri yükle
  useEffect(() => {
    if (practiceCards && practiceCards.length > 0) {
      // Firebase'den veri varsa migrate et
      const migratedData = practiceCards.map((card, index) => ({
        ...card,
        id: card.id || `${card.missingWord}_${index}`,
        masteryLevel: card.masteryLevel || 0,
        lastPracticed: card.lastPracticed || null,
        fsrs: card.fsrs || fsrsEngine.createNewCard()
      }));
      setFlashcardData(migratedData);
    } else {
      setFlashcardData(defaultData);
    }
  }, [practiceCards, defaultData, fsrsEngine]);

  // İlk kartı ve session progress'i seç
  useEffect(() => {
    if (flashcardData.length > 0 && !currentCard) {
      // Debug: localStorage'daki veriyi kontrol et
      console.log('=== FLASHCARD DATA ANALYSIS ===');
      flashcardData.forEach(card => {
        console.log(`${card.missingWord}: mastery=${card.masteryLevel || 0}, session=${card.sessionProgress || 0}`);
      });

      const nextCard = weightedSelection.getNextCard(flashcardData);
      if (nextCard) {
        setCurrentCard(nextCard);
        setCurrentSessionProgress(nextCard.sessionProgress || 0);
        console.log(`=== INITIAL CARD SELECTED ===`);
        console.log(`Card: ${nextCard.missingWord}, mastery: ${nextCard.masteryLevel || 0}, session: ${nextCard.sessionProgress || 0}`);
      }
    }
  }, [flashcardData, currentCard, weightedSelection]);

  // Mevcut kartın session progress'ini takip et
  useEffect(() => {
    if (currentCard) {
      setCurrentSessionProgress(currentCard.sessionProgress || 0);
    }
  }, [currentCard]);

  const cardData = useMemo(() => {
    if (!currentCard) {
      return {
        sentenceStart: 'Veri yükleniyor...',
        sentenceEnd: '',
        progress: { current: currentProgress, total: targetGoal },
        audioUrl: null
      };
    }

    console.log("Mevcut kart verisi:", currentCard);

    let sentenceStart = 'Veri yükleniyor...';
    let sentenceEnd = '';

    if (currentCard && typeof currentCard.sentence === 'string') {
      let sentenceToProcess = currentCard.sentence;
      const missingWord = currentCard.missingWord;

      if (missingWord) {
        // Gelişmiş kelime eşleştirme - tekil/çoğul varyasyonları da dahil
        const escapedWord = missingWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Önce exact match dene
        let wordRegex = new RegExp(`\\b${escapedWord}\\b`, 'gi');

        if (wordRegex.test(sentenceToProcess)) {
          sentenceToProcess = sentenceToProcess.replace(wordRegex, '___');
        } else {
          // Exact match bulunamazsa, varyasyonları dene
          const variations = generateWordVariations(missingWord);
          console.log(`"${missingWord}" için üretilen varyasyonlar:`, variations);

          for (const variation of variations) {
            const escapedVariation = variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const variationRegex = new RegExp(`\\b${escapedVariation}\\b`, 'gi');

            if (variationRegex.test(sentenceToProcess)) {
              console.log(`Eşleşme bulundu: "${variation}" kelimesi "${sentenceToProcess}" içinde bulundu`);
              sentenceToProcess = sentenceToProcess.replace(variationRegex, '___');
              break;
            }
          }
        }
      }

      let parts;
      if (sentenceToProcess.includes('______')) {
        parts = sentenceToProcess.split('______');
      } else if (sentenceToProcess.includes('___')) {
        parts = sentenceToProcess.split('___');
      } else {
        parts = [sentenceToProcess, ''];
      }
      
      sentenceStart = parts[0].trim();
      sentenceEnd = parts.length > 1 ? parts[1].trim() : '';
      
      console.log("Parsed sentence - Start:", sentenceStart, "End:", sentenceEnd);
    }

    return {
      ...currentCard,
      sentenceStart,
      sentenceEnd,
      progress: { current: currentProgress, total: targetGoal },
      audioUrl: null
    };
  }, [currentCard, currentProgress, targetGoal]);

  const [feedbackColor, setFeedbackColor] = useState('default');

  const handleInputChange = (event) => {
    setUserInput(event.target.value);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !showFeedback) {
      checkAnswer();
    }
  };

  // useCallback fonksiyonlarını useEffect'ten önce tanımla
  const handleNextQuestion = useCallback((isCorrectAnswer = true) => {
    if (!currentCard) return;

    // Session progress güncelle - WeightedSelectionEngine kullan
    const newSessionProgress = weightedSelection.updateSessionProgress(currentCard, isCorrectAnswer);
    const sessionCompleted = newSessionProgress >= 5;

    // Session progress 5'e ulaştıysa kelime mastered olur
    const isMastered = sessionCompleted;

    // Kartı güncelle
    const updatedCard = {
      ...currentCard,
      sessionProgress: newSessionProgress,
      masteryLevel: isMastered ? 5 : (currentCard.masteryLevel || 0),
      sessionCompleted: sessionCompleted,
      lastPracticed: new Date().toISOString()
    };

    // Veriyi güncelle
    const updatedData = flashcardData.map(card =>
      card.id === currentCard.id ? updatedCard : card
    );

    // Sadece doğru cevaplarda global progress'i +1 artır (günlük hedef)
    if (isCorrectAnswer) {
      incrementProgress();
    }

    // Session progress 5'e ulaştıysa kelime mastered oldu (log)
    if (isMastered && !currentCard.sessionCompleted) {
      console.log(`🎉 MASTERED: ${updatedCard.missingWord} (session progress reached 5)`);
    }

    console.log(`💾 SAVING TO FIREBASE - Updated card: ${updatedCard.missingWord} (session: ${updatedCard.sessionProgress}, mastered: ${isMastered})`);

    setFlashcardData(updatedData);

    // Firebase'e kaydet
    updatePracticeCard(updatedCard.id, updatedCard);

    // State'leri temizle
    setUserInput('');
    setIsCorrect(null);
    setShowFeedback(false);
    setFeedbackColor('default');

    // Weighted selection ile sonraki kartı seç
    setTimeout(() => {
      // Debug: Card update sonrasını kontrol et
      console.log(`Debug: Updated card: ${updatedCard.missingWord} -> session: ${updatedCard.sessionProgress}, mastered: ${isMastered}`);

      // Debug: Active cards sayısını kontrol et
      const activeCards = weightedSelection.getActiveCards(updatedData);
      const masteredCards = weightedSelection.getMasteredCards(updatedData);
      console.log(`Debug: Active: ${activeCards.length}, Mastered: ${masteredCards.length}, Total: ${updatedData.length}`);

      if (masteredCards.length > 0) {
        console.log('Mastered cards:', masteredCards.map(c => `${c.missingWord} (session: ${c.sessionProgress})`));
      }

      // Debug: Active cards'ın session progress'lerini göster
      if (activeCards.length > 0) {
        console.log('Active cards:', activeCards.map(c => `${c.missingWord} (session: ${c.sessionProgress || 0})`));
      }

      const nextCard = weightedSelection.getNextCard(updatedData);
      if (nextCard) {
        console.log(`Next card: ${nextCard.missingWord} (session: ${nextCard.sessionProgress || 0})`);
        setCurrentCard(nextCard);
        setCurrentSessionProgress(nextCard.sessionProgress || 0);
      } else {
        // Hiç aktif kart kalmadıysa completion screen'e git
        console.log('Tüm kartlar mastered! Completion screen gösteriliyor...');
      }

      // Input focus'u restore et
      setTimeout(() => {
        if(inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }, 200);
  }, [currentCard, flashcardData, weightedSelection, incrementProgress]);

  const handleShowAnswer = useCallback(() => {
    setUserInput(cardData.missingWord);
    setShowFeedback(true);
    setFeedbackColor('info');
    if(inputRef.current) {
      inputRef.current.focus();
    }
  }, [cardData.missingWord]);

  // CSV Export/Import Functions
  const handleMenuOpen = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleExportCSV = () => {
    try {
      const csvContent = csvHandler.exportToAnkiCSV(flashcardData);
      const filename = `flashcards_export_${new Date().toISOString().split('T')[0]}.csv`;
      csvHandler.downloadCSV(csvContent, filename);

      setAlertInfo({
        open: true,
        message: `${flashcardData.length} kart başarıyla export edildi!`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Export error:', error);
      setAlertInfo({
        open: true,
        message: 'Export sırasında hata oluştu: ' + error.message,
        severity: 'error'
      });
    }
    handleMenuClose();
  };

  const handleExportMasteredCSV = () => {
    try {
      const csvContent = csvHandler.exportMasteredWordsCSV(flashcardData);
      const filename = `mastered_words_${new Date().toISOString().split('T')[0]}.csv`;
      csvHandler.downloadCSV(csvContent, filename);

      const masteredCount = flashcardData.filter(card => (card.sessionProgress || 0) >= 5).length;
      setAlertInfo({
        open: true,
        message: `${masteredCount} öğrenilmiş kelime başarıyla export edildi!`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Export mastered error:', error);
      setAlertInfo({
        open: true,
        message: error.message,
        severity: 'error'
      });
    }
    handleMenuClose();
  };

  const handleImportCSV = () => {
    fileInputRef.current?.click();
    handleMenuClose();
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const importedCards = await csvHandler.readCSVFile(file);

      // FSRS format'a migrate et
      const migratedCards = DataMigrationHelper.migrateOldData(importedCards, fsrsEngine);

      // Mevcut verilerle birleştir ve Firebase'e kaydet
      const combinedData = [...flashcardData, ...migratedCards];
      setFlashcardData(combinedData);

      // Yeni kartları Firebase'e ekle
      const { addPracticeCards } = useFlashcardStore.getState();
      await addPracticeCards(migratedCards);

      setAlertInfo({
        open: true,
        message: `${importedCards.length} kart başarıyla import edildi!`,
        severity: 'success'
      });

      // File input'u temizle
      event.target.value = '';
    } catch (error) {
      console.error('Import error:', error);
      setAlertInfo({
        open: true,
        message: 'Import sırasında hata oluştu: ' + error.message,
        severity: 'error'
      });
    }
  };

  const handleAlertClose = () => {
    setAlertInfo({ ...alertInfo, open: false });
  };

  // Klavye kısayolları
  useEffect(() => {
    const handleKeyPress = (event) => {
      // ESC - Input temizleme (her zaman çalışır)
      if (event.key === 'Escape') {
        if (userInput) {
          setUserInput('');
          event.preventDefault();
        }
        return;
      }

      // TAB - Cevabı göster (sadece feedback gösterilmiyorsa)
      if (event.key === 'Tab' && !showFeedback) {
        handleShowAnswer();
        event.preventDefault();
        return;
      }

      // Input alanına odaklanmış değilse diğer kısayolları kontrol et
      if (document.activeElement !== inputRef.current) {
        // Input alanına otomatik odaklan
        if (inputRef.current && !showFeedback) {
          inputRef.current.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [userInput, showFeedback, handleShowAnswer]);

  const checkAnswer = () => {
    const userAnswer = userInput.toLowerCase().trim();
    const correctAnswer = cardData.missingWord.toLowerCase();

    setShowFeedback(true);

    if (userAnswer === correctAnswer) {
      setIsCorrect(true);
      setFeedbackColor('success');
      setTimeout(() => {
        handleNextQuestion(true); // Doğru cevap
      }, 1000);
    } else {
      setIsCorrect(false);

      const distance = Levenshtein.get(userAnswer, correctAnswer);
      const similarity = 1 - distance / Math.max(userAnswer.length, correctAnswer.length);

      if (similarity > 0.3) {
        setFeedbackColor('warning');
        // Yakın cevap - tekrar şansı ver
        setTimeout(() => {
          setShowFeedback(false);
          setUserInput('');
        }, 1500);
      } else {
        setFeedbackColor('error');
        // Yanlış cevap - FSRS'e yanlış olarak kaydet
        setUserInput(cardData.missingWord);
        setTimeout(() => {
          handleNextQuestion(false); // Yanlış cevap
        }, 2000);
      }
    }
  };



  // Check if there are any active cards left or target goal reached
  const activeCardsCount = weightedSelection.getActiveCards(flashcardData).length;
  const allCardsMastered = activeCardsCount === 0 && flashcardData.length > 0;

  if (currentProgress >= targetGoal || allCardsMastered) {
    return (
      <CompletionScreen
        targetGoal={targetGoal}
        allCardsMastered={allCardsMastered}
        onReset={async () => {
          resetProgress();
          // Reset all mastery levels to start over
          const resetData = flashcardData.map(card => ({
            ...card,
            masteryLevel: 0,
            sessionProgress: 0,
            sessionCompleted: false
          }));
          setFlashcardData(resetData);

          // Tüm kartları Firebase'de güncelle
          for (const card of resetData) {
            await updatePracticeCard(card.id, card);
          }

          setCurrentCard(null);
        }}
        onNavigateToSettings={handleNavigateToSettings}
      />
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 1, sm: 2, md: 3 },
      }}
    >
      {/* Ana Container - Tüm içerik tek alanda */}
      <Box
        sx={{
          backgroundColor: 'background.paper',
          borderRadius: 3,
          p: { xs: 2, sm: 3, md: 4 },
          border: '1px solid rgba(255, 255, 255, 0.1)',
          maxWidth: { xs: '95vw', sm: '90vw', md: 1200 },
          width: '100%',
          position: 'relative',
          minHeight: 'auto',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >

        {/* Kelime Tekrar Progress'i - Üst Orta (5 Aşamalı Session Progress) */}
        <Box sx={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {[0, 1, 2, 3, 4].map(step => (
                <Box
                  key={step}
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: step < currentSessionProgress
                      ? 'secondary.main'
                      : 'rgba(255, 255, 255, 0.2)',
                    border: step === currentSessionProgress
                      ? '2px solid rgba(96, 165, 250, 0.8)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.3s ease',
                    boxShadow: step < currentSessionProgress
                      ? '0 0 8px rgba(76, 175, 80, 0.4)'
                      : 'none',
                  }}
                />
              ))}
            </Box>
          </Box>
        </Box>

        {/* İngilizce Cümle ve Türkçe Çeviri */}
        <Box
          sx={{
            textAlign: 'center',
            mb: 4,
            pb: 3,
            mt: 3,
            px: { xs: 1, sm: 2, md: 3 },
            width: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 100,
          }}
        >
          <Typography
            variant="h5"
            sx={{
              color: 'primary.main',
              fontWeight: 400,
              fontSize: { xs: '1.6rem', sm: '1.8rem', md: '2rem' },
              lineHeight: 1.5,
              mb: 2,
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              maxWidth: '100%',
              margin: '0 auto',
              textAlign: 'center',
            }}
          >
            {cardData.sentenceStart}
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                verticalAlign: 'baseline',
                lineHeight: 1,
                mx: 1.5,
              }}
            >
              {userInput ? (
                <Typography
                  component="span"
                  sx={{
                    fontFamily: 'Roboto Mono, monospace',
                    color: showFeedback
                      ? feedbackColor === 'success'
                        ? 'secondary.main'
                        : feedbackColor === 'error'
                          ? 'error.main'
                          : feedbackColor === 'warning'
                            ? '#ffa726'
                            : feedbackColor === 'info'
                              ? '#29b6f6'
                              : 'primary.main'
                      : 'primary.main',
                    fontWeight: 700,
                    fontSize: '1em',
                    borderBottom: '2px solid rgba(255, 255, 255, 0.7)',
                    paddingBottom: '2px',
                    lineHeight: 'inherit',
                  }}
                >
                  {userInput}
                </Typography>
              ) : (
                <Box component="span" sx={{ display: 'inline-flex', gap: '0.8ch', alignItems: 'center' }}>
                  {cardData.missingWord &&
                    cardData.missingWord.split(' ').map((word, index) => (
                      <span
                        key={index}
                        style={{
                          width: `${word.length}ch`,
                          display: 'inline-block',
                          backgroundImage:
                            'linear-gradient(to right, rgba(255, 255, 255, 0.5) 70%, transparent 30%)',
                          backgroundSize: '1ch 2px',
                          backgroundRepeat: 'repeat-x',
                          backgroundPosition: '0 100%',
                          height: '1.2em',
                          paddingBottom: '2px',
                        }}
                      />
                    ))}
                </Box>
              )}
            </Box>
            {cardData.sentenceEnd}
          </Typography>

          {/* Türkçe Cümle Çevirisi - İngilizce cümlenin altında */}
          {cardData.sentenceTranslation && (
            <Typography
              variant="body2"
              sx={{
                color: '#4ade80',
                textAlign: 'center',
                fontSize: { xs: '0.95rem', sm: '1rem', md: '1.05rem' },
                lineHeight: 1.6,
                fontStyle: 'italic',
                mt: 2,
                wordBreak: 'break-word',
                whiteSpace: 'normal',
                overflow: 'visible',
                maxWidth: '90%',
                opacity: 0.9,
              }}
            >
              {cardData.sentenceTranslation}
            </Typography>
          )}
        </Box>
        
        {/* Divider Line */}
        <Box sx={{ width: '100%', height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)', mb: 4 }} />

        {/* Türkçe Kelime Anlamı */}
        <Box
          sx={{
            mb: 4,
            pb: 3,
            px: { xs: 0.5, sm: 1, md: 1 },
            width: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 80,
          }}
        >
          <Typography
            ref={textRef}
            variant="body1"
            sx={{
              color: 'text.secondary',
              textAlign: 'center',
              fontSize: dynamicFontSize,
              lineHeight: 1.4,
              wordBreak: 'break-word',
              whiteSpace: 'normal',
              overflow: 'visible',
              width: '100%',
              margin: '0',
              padding: '0 8px',
            }}
          >
            {(() => {
              if (!cardData.translationWithUnderline) return '';

              // HTML'i parse et
              const htmlString = cardData.translationWithUnderline;
              const parts = htmlString.split(/<u>|<\/u>/);

              return parts.map((part, index) => {
                if (index % 2 === 1) {
                  // Bu kısım <u> tagları arasında (kelime anlamı)
                  return (
                    <Box
                      key={index}
                      component="span"
                      sx={{
                        color: 'primary.main',
                        fontWeight: 700,
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                        display: 'inline-block',
                        margin: '0 1px',
                      }}
                    >
                      {part}
                    </Box>
                  );
                } else {
                  // Normal text
                  return part;
                }
              });
            })()}
          </Typography>
        </Box>
        
        {/* Divider Line */}
        <Box sx={{ width: '100%', height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)', mb: 4 }} />

        {/* Giriş Alanı */}
        <TextField
          fullWidth
          value={userInput}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Kelimeyi yazın..."
          variant="outlined"
          disabled={showFeedback && isCorrect}
          inputRef={inputRef}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 2,
              fontSize: '1rem',
              transition: 'border-color 0.3s ease-in-out',
              '& fieldset': {
                borderWidth: 2,
                borderColor: showFeedback 
                  ? feedbackColor === 'success' 
                    ? '#4caf50'
                    : feedbackColor === 'error' 
                      ? '#f44336'
                      : feedbackColor === 'warning' 
                        ? '#ffa726'
                        : 'rgba(255, 255, 255, 0.3)'
                  : 'rgba(255, 255, 255, 0.3)',
              },
              '&:hover fieldset': {
                borderColor: showFeedback ? (feedbackColor === 'success' ? '#4caf50' : feedbackColor === 'error' ? '#f44336' : feedbackColor === 'warning' ? '#ffa726' : 'primary.main') : 'primary.main',
              },
              '&.Mui-focused fieldset': {
                borderColor: showFeedback ? (feedbackColor === 'success' ? '#4caf50' : feedbackColor === 'error' ? '#f44336' : feedbackColor === 'warning' ? '#ffa726' : 'primary.main') : 'primary.main',
              },
            },
            '& .MuiOutlinedInput-input': {
              textAlign: 'center',
              py: 2,
              color: 'text.primary',
            },
          }}
          autoFocus
        />
        
        {/* Progress Bar - En Alt */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 4 }}>
          <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 'bold', minWidth: 'fit-content' }}>
            {currentProgress}/{targetGoal}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={(currentProgress / targetGoal) * 100}
            sx={{
              height: 12,
              borderRadius: 6,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: 'secondary.main',
                borderRadius: 6,
              },
              flexGrow: 1,
            }}
          />
        </Box>
      </Box>

      {/* Snackbar for CSV operations */}
      <Snackbar
        open={alertInfo.open}
        autoHideDuration={4000}
        onClose={handleAlertClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleAlertClose}
          severity={alertInfo.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {alertInfo.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LingvistFlashcard;
