import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Box, Typography, Paper, Fade, LinearProgress } from '@mui/material';
import useFlashcardStore from '../stores/useFlashcardStore';

const GamePage = () => {
  const { gameCards } = useFlashcardStore();
  const [flashcardData, setFlashcardData] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const textRef = useRef(null);
  const [dynamicFontSize, setDynamicFontSize] = useState({ xs: '1.5rem', sm: '2rem', md: '2.5rem' });

  // Varsayılan veri - LingvistFlashcard'dan aynısı
  const defaultData = useMemo(() => [
    {
      sentence: "Friends are very important in life",
      missingWord: "friends",
      translation: "Arkadaşlar hayatta çok önemlidir.",
      translationWithUnderline: "<u>Arkadaşlar</u> hayatta çok önemlidir.",
    },
    {
      sentence: "She is studying for her",
      missingWord: "exam",
      translation: "O sınavı için çalışıyor.",
      translationWithUnderline: "O <u>sınavı</u> için çalışıyor.",
    },
    {
      sentence: "We need to buy some",
      missingWord: "groceries",
      translation: "Biraz market alışverişi yapmamız gerekiyor.",
      translationWithUnderline: "Biraz <u>market alışverişi</u> yapmamız gerekiyor.",
    },
  ], []);

  // Firebase'den game kartlarını yükle
  useEffect(() => {
    if (gameCards && gameCards.length > 0) {
      setFlashcardData(gameCards);
    } else {
      setFlashcardData(defaultData);
    }
  }, [gameCards, defaultData]);

  // Yeni klavye kısayolları
  const handleKeyPress = useCallback((event) => {
    switch (event.key) {
      case ' ': // Space - Kartı çevir
        event.preventDefault(); // Sayfa kaydırmasını engelle
        setIsFlipped(prev => !prev);
        break;
      case 'ArrowRight': // Sağ ok - Sonraki kart
        event.preventDefault();
        setCurrentCardIndex(prev => (prev + 1) % flashcardData.length);
        setIsFlipped(false);
        break;
      case 'ArrowLeft': // Sol ok - Önceki kart
        event.preventDefault();
        setCurrentCardIndex(prev => prev === 0 ? flashcardData.length - 1 : prev - 1);
        setIsFlipped(false);
        break;
      // Enter tuşu artık işlevsiz
      default:
        break;
    }
  }, [flashcardData.length]);

  // Klavye event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Mevcut kartın verisi ve cümleyi parse et
  const currentCard = flashcardData[currentCardIndex] || {};

  // Debug için console log
  useEffect(() => {
    if (currentCard.sentence || currentCard.word) {
      console.log('Current card:', {
        sentence: currentCard.sentence,
        word: currentCard.word || currentCard.missingWord,
        word_mean: currentCard.word_mean || currentCard.translation,
        class: currentCard.class
      });
    }
  }, [currentCard]);

  // Cümleyi parse ederek boş kısmı oluştur
  const parsedSentence = useMemo(() => {
    const sentence = currentCard.sentence;
    const word = currentCard.word || currentCard.missingWord;

    if (!sentence || !word) return '';

    let cleanSentence = sentence.trim();
    const cleanWord = word.trim();

    // Kelimeyi kesikli çizgilerle değiştir (her harf için "_ " formatı)
    const wordLength = cleanWord.length;
    const blank = '_ '.repeat(wordLength).trim(); // "_ _ _ _" formatında

    // Önce kelimeyi sentence içinde arayalım
    const escapedWord = cleanWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordRegex = new RegExp(`\\b${escapedWord}\\b`, 'gi');

    if (wordRegex.test(cleanSentence)) {
      // Kelime cümle içinde bulundu, değiştir
      cleanSentence = cleanSentence.replace(wordRegex, blank);
    } else {
      // Kelime cümle içinde yok, sonuna ekle
      // Cümle noktalama ile bitiyorsa öncesine ekle
      if (cleanSentence.match(/[.!?,:;]$/)) {
        const lastChar = cleanSentence.slice(-1);
        cleanSentence = cleanSentence.slice(0, -1).trim() + ' ' + blank + lastChar;
      } else {
        cleanSentence = cleanSentence.trim() + ' ' + blank;
      }
    }

    // Birden fazla boşluğu tek boşluğa çevir
    cleanSentence = cleanSentence.replace(/\s+/g, ' ').trim();

    return cleanSentence;
  }, [currentCard.sentence, currentCard.word, currentCard.missingWord]);

  // Türkçe anlamı HTML tag'lerinden temizle
  const cleanTranslation = useMemo(() => {
    const translation = currentCard.word_mean || currentCard.translationWithUnderline || currentCard.translation;
    if (!translation) return '';
    return translation.replace(/<[^>]*>/g, '');
  }, [currentCard.word_mean, currentCard.translationWithUnderline, currentCard.translation]);

  // Text overflow kontrolü ve dinamik font size ayarlama
  useEffect(() => {
    const checkTextOverflow = () => {
      if (textRef.current && cleanTranslation) {
        const container = textRef.current.parentElement;
        const containerWidth = container.offsetWidth - 32; // padding hesabı

        // Farklı font boyutlarını test et - Dengeli boyutlar
        const fontSizes = [
          { size: '6rem', xs: '3.6rem', sm: '4.8rem', md: '6rem' },
          { size: '5rem', xs: '3rem', sm: '4rem', md: '5rem' },
          { size: '4.5rem', xs: '2.7rem', sm: '3.6rem', md: '4.5rem' },
          { size: '4rem', xs: '2.4rem', sm: '3.2rem', md: '4rem' },
          { size: '3.5rem', xs: '2.1rem', sm: '2.8rem', md: '3.5rem' },
          { size: '3rem', xs: '1.8rem', sm: '2.4rem', md: '3rem' },
          { size: '2.5rem', xs: '1.5rem', sm: '2rem', md: '2.5rem' },
          { size: '2rem', xs: '1.2rem', sm: '1.6rem', md: '2rem' },
        ];

        for (let i = 0; i < fontSizes.length; i++) {
          const testElement = document.createElement('div');
          testElement.style.position = 'absolute';
          testElement.style.visibility = 'hidden';
          testElement.style.whiteSpace = 'nowrap';
          testElement.style.fontSize = fontSizes[i].size;
          testElement.style.fontWeight = 'bold';
          testElement.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          testElement.textContent = cleanTranslation;
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

        // Eğer hiçbiri uymuyorsa en küçük boyutu kullan
        setDynamicFontSize({
          xs: '1.2rem',
          sm: '1.6rem',
          md: '2rem'
        });
      }
    };

    // Delay ekle - DOM render'ı bekle
    const timeoutId = setTimeout(checkTextOverflow, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [cleanTranslation]);

  // Kelime listesi boş mu kontrol et
  const hasNoCards = flashcardData.length === 0;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
      }}
    >
      {hasNoCards ? (
        // Tebrik Mesajı - Kelimeler Bitti
        <Box
          sx={{
            backgroundColor: 'background.paper',
            borderRadius: 3,
            p: 6,
            border: '1px solid rgba(96, 165, 250, 0.3)',
            maxWidth: 600,
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 8px 25px rgba(96, 165, 250, 0.2)',
          }}
        >
          <Typography
            variant="h2"
            sx={{
              color: 'secondary.main',
              fontWeight: 'bold',
              mb: 3,
              fontSize: { xs: '2rem', sm: '3rem', md: '4rem' }
            }}
          >
            🎉 Tebrikler! 🎉
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color: 'text.primary',
              mb: 2,
              lineHeight: 1.6
            }}
          >
            Bu kelime setini tamamladınız!
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              mb: 4
            }}
          >
            Yeni kelimeler eklemek için "Veri Ekle" sekmesini kullanabilirsiniz.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Typography variant="h6" sx={{ color: 'primary.main' }}>
              📚 Toplam: {flashcardData.length} kelime
            </Typography>
          </Box>
        </Box>
      ) : (
        // Ana Container - Normal Kart Görünümü
        <Box
          sx={{
            backgroundColor: 'background.paper',
            borderRadius: 3,
            p: 4,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            maxWidth: 900,
            width: '100%',
            position: 'relative',
          }}
        >

        {/* Tek Kart */}
        <Fade key={currentCardIndex} in={true} timeout={300}>
          <Paper
            sx={{
              position: 'relative',
              height: '600px',
              width: '100%',
              cursor: 'pointer',
              transformStyle: 'preserve-3d',
              transition: 'transform 0.6s',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              boxShadow: '0 8px 25px rgba(96, 165, 250, 0.2)',
            }}
          >
            {/* Ön Yüz - Word meaning üstte, Cümle altta */}
            <Box
              sx={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backfaceVisibility: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                p: { xs: 3, sm: 4 },
                backgroundColor: 'background.paper',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
                overflow: 'hidden', // Kartın dışına çıkmayı engelle
              }}
            >
              {/* Word Meaning - Türkçe anlamı (Üstte) */}
              <Box
                sx={{
                  width: '100%',
                  maxHeight: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 3
                }}
              >
                <Typography
                  ref={textRef}
                  variant="h3"
                  sx={{
                    color: 'primary.main',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    fontSize: dynamicFontSize,
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    lineHeight: 1.3,
                    wordBreak: 'break-word',
                    whiteSpace: 'normal',
                    overflow: 'visible',
                    maxWidth: '100%',
                    padding: '0 8px',
                    hyphens: 'auto',
                  }}
                >
                  {cleanTranslation}
                </Typography>
              </Box>

              {/* Divider */}
              <Box sx={{ width: '70%', height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.2)', mb: 3 }} />

              {/* Cümle - Boş kelime ile (Altta) */}
              <Box
                sx={{
                  width: '100%',
                  maxHeight: '40%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography
                  variant="h5"
                  sx={{
                    color: 'text.primary',
                    textAlign: 'center',
                    lineHeight: 1.4,
                    fontSize: { xs: '1.33rem', sm: '1.6rem', md: '1.87rem' },
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    wordBreak: 'break-word',
                    hyphens: 'auto',
                    maxWidth: '100%',
                    overflow: 'hidden',
                  }}
                >
                  {parsedSentence}
                </Typography>
              </Box>
            </Box>

            {/* Arka Yüz - Sadece kelime */}
            <Box
              sx={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                p: 4,
                backgroundColor: 'rgba(96, 165, 250, 0.1)',
                border: '1px solid rgba(96, 165, 250, 0.3)',
                borderRadius: 2,
              }}
            >
              {/* Sadece İngilizce Kelime */}
              <Typography
                variant="h1"
                sx={{
                  color: 'secondary.main',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  fontSize: { xs: '6rem', sm: '8rem', md: '10rem' },
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                }}
              >
                {currentCard.word || currentCard.missingWord}
              </Typography>

              {/* Divider */}
              <Box sx={{ width: '60%', height: '2px', backgroundColor: 'rgba(96, 165, 250, 0.3)', mt: 4, mb: 3 }} />

              {/* Klavye kısayol bilgisi */}
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  textAlign: 'center',
                  opacity: 0.8
                }}
              >
                ➡️ Sonraki kart • ⬅️ Önceki kart
              </Typography>
            </Box>
          </Paper>
        </Fade>

        {/* Kontrol Bilgisi */}
        <Typography
          variant="body2"
          sx={{
            mt: 4,
            color: 'text.secondary',
            textAlign: 'center',
            opacity: 0.7
          }}
        >
          Space → Çevir • ➡️ Sonraki • ⬅️ Önceki • {currentCardIndex + 1}/{flashcardData.length}
        </Typography>

        {/* Progress Bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 3 }}>
          <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 'bold', minWidth: 'fit-content' }}>
            {currentCardIndex + 1}/{flashcardData.length}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={((currentCardIndex + 1) / flashcardData.length) * 100}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: 'secondary.main',
                borderRadius: 4,
              },
              flexGrow: 1,
            }}
          />
        </Box>
      </Box>
      )}
    </Box>
  );
};

export default GamePage;