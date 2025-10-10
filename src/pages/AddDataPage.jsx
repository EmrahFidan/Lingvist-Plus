
import { useState, useRef } from 'react';
import Papa from 'papaparse';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Snackbar,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Visibility as PreviewIcon,
} from '@mui/icons-material';
import useFlashcardStore from '../stores/useFlashcardStore';

// Otomatik veri temizleme fonksiyonları
const cleanSentenceData = (sentence, word) => {
  if (!sentence || !word) return sentence;

  let cleanedSentence = sentence.trim();

  // 1. Pipe (|) sembolü ve sonrasını temizle
  if (cleanedSentence.includes('|')) {
    cleanedSentence = cleanedSentence.split('|')[0].trim();
  }

  // 2. Ekstra boşlukları temizle
  cleanedSentence = cleanedSentence.replace(/\s+/g, ' ').trim();

  // 3. Cümle sonunda nokta yoksa ekle
  if (!cleanedSentence.endsWith('.') && !cleanedSentence.endsWith('!') && !cleanedSentence.endsWith('?')) {
    cleanedSentence += '.';
  }

  return cleanedSentence;
};

const cleanWordData = (word) => {
  if (!word) return word;

  // Kelimeyi temizle ve normalize et
  return word.trim().toLowerCase();
};

const generateWordVariations = (word) => {
  const variations = [];
  const lowerWord = word.toLowerCase();

  // Orijinal kelimeyi ekle
  variations.push(word);

  // Temel çoğul kuralları
  if (lowerWord.endsWith('s')) {
    const singular = lowerWord.slice(0, -1);
    variations.push(singular);
    variations.push(singular.charAt(0).toUpperCase() + singular.slice(1));
  } else {
    const plural = lowerWord + 's';
    variations.push(plural);
    variations.push(plural.charAt(0).toUpperCase() + plural.slice(1));
  }

  // -es ile bitenler
  if (lowerWord.endsWith('es')) {
    const withoutEs = lowerWord.slice(0, -2);
    variations.push(withoutEs);
    variations.push(withoutEs.charAt(0).toUpperCase() + withoutEs.slice(1));
  } else if (!lowerWord.endsWith('s')) {
    const withEs = lowerWord + 'es';
    variations.push(withEs);
    variations.push(withEs.charAt(0).toUpperCase() + withEs.slice(1));
  }

  // -y -> -ies değişimi
  if (lowerWord.endsWith('ies')) {
    const withY = lowerWord.slice(0, -3) + 'y';
    variations.push(withY);
    variations.push(withY.charAt(0).toUpperCase() + withY.slice(1));
  } else if (lowerWord.endsWith('y') && lowerWord.length > 1) {
    const withIes = lowerWord.slice(0, -1) + 'ies';
    variations.push(withIes);
    variations.push(withIes.charAt(0).toUpperCase() + withIes.slice(1));
  }

  // Düzensiz çoğullar
  const irregulars = {
    'child': 'children', 'children': 'child',
    'man': 'men', 'men': 'man',
    'woman': 'women', 'women': 'woman',
    'person': 'people', 'people': 'person',
    'foot': 'feet', 'feet': 'foot',
    'tooth': 'teeth', 'teeth': 'tooth',
    'mouse': 'mice', 'mice': 'mouse'
  };

  if (irregulars[lowerWord]) {
    const irregular = irregulars[lowerWord];
    variations.push(irregular);
    variations.push(irregular.charAt(0).toUpperCase() + irregular.slice(1));
  }

  // Büyük harfli versiyonları ekle
  variations.forEach(variation => {
    const capitalized = variation.charAt(0).toUpperCase() + variation.slice(1);
    if (!variations.includes(capitalized)) {
      variations.push(capitalized);
    }
  });

  return [...new Set(variations)];
};

const optimizeWordMatching = (sentence, word) => {
  if (!sentence || !word) return sentence;

  // Temizlenmiş kelime
  const cleanWord = cleanWordData(word);
  const escapedWord = cleanWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Önce exact match dene
  let wordRegex = new RegExp(`\\b${escapedWord}\\b`, 'gi');

  if (wordRegex.test(sentence)) {
    return sentence.replace(wordRegex, '___');
  }

  // Exact match bulunamazsa varyasyonları dene
  const variations = generateWordVariations(cleanWord);

  for (const variation of variations) {
    const escapedVariation = variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const variationRegex = new RegExp(`\\b${escapedVariation}\\b`, 'gi');

    if (variationRegex.test(sentence)) {
      return sentence.replace(variationRegex, '___');
    }
  }

  return sentence;
};

const AddDataPage = () => {
  const { addPracticeCards, addGameCards } = useFlashcardStore();
  const [csvData, setCsvData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [isUploaded, setIsUploaded] = useState(false);
  const [originalPreviewData, setOriginalPreviewData] = useState([]); // For the preview table content
  const [cleaningStats, setCleaningStats] = useState(null);
  const [dataType, setDataType] = useState('practice'); // 'practice' or 'game'
  const fileInputRef = useRef(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');


  // Dosya yükleme işlemi - Otomatik Temizleme Pipeline
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      setFileName(file.name);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log('📥 Ham veri yüklendi, otomatik temizleme başlıyor...');

          // Önizleme için orijinal veriyi sakla
          setOriginalPreviewData(results.data.slice(0, 5));

          // İstatistik takibi
          let stats = {
            totalRows: results.data.length,
            cleanedSentences: 0,
            pipeCleaned: 0,
            wordMatched: 0,
            failed: 0
          };

          const parsedData = results.data.map((row, index) => {
            if (!row || !row.word || !row.sentence) {
              stats.failed++;
              return null;
            }

            try {
              // 1. HAM VERİ TEMIZLEME
              const originalSentence = row.sentence;
              const originalWord = row.word;

              // 2. CÜMLE TEMİZLEME
              const cleanedSentence = cleanSentenceData(originalSentence, originalWord);
              if (cleanedSentence !== originalSentence) {
                stats.cleanedSentences++;
                if (originalSentence.includes('|')) {
                  stats.pipeCleaned++;
                }
              }

              // 3. KELİME TEMİZLEME VE NORMALİZASYON
              const cleanedWord = cleanWordData(originalWord);

              // 4. GELİŞMİŞ KELİME EŞLEŞTİRME
              const sentenceWithMissingWord = optimizeWordMatching(cleanedSentence, cleanedWord);

              if (sentenceWithMissingWord.includes('___')) {
                stats.wordMatched++;
              }

              // 5. ÇEVİRİ TEMİZLEME
              const cleanedTranslation = (row.word_mean || '').trim();
              const cleanedSentenceTranslation = (row.sentence_translation || '').trim();

              console.log(`✅ Satır ${index + 1} işlendi:`, {
                original: originalSentence,
                cleaned: cleanedSentence,
                word: cleanedWord,
                matched: sentenceWithMissingWord.includes('___')
              });

              return {
                id: index + 1,
                sentence: sentenceWithMissingWord,
                missingWord: cleanedWord,
                translation: cleanedTranslation,
                translationWithUnderline: cleanedTranslation,
                sentenceTranslation: cleanedSentenceTranslation,
                originalSentence: originalSentence, // Debug için
                originalWord: originalWord // Debug için
              };
            } catch (error) {
              console.error(`❌ Satır ${index + 1} işlenirken hata:`, error);
              stats.failed++;
              return null;
            }
          }).filter(Boolean);

          // İstatistikleri güncelle
          setCleaningStats(stats);
          setCsvData(parsedData);
          setIsUploaded(true);

          console.log('🎉 Otomatik temizleme tamamlandı!', {
            toplam: stats.totalRows,
            başarılı: parsedData.length,
            temizlenen: stats.cleanedSentences,
            pipeTemizlenen: stats.pipeCleaned,
            eşleşen: stats.wordMatched,
            başarısız: stats.failed
          });
        },
      });
    } else {
      setSnackbarMessage('Lütfen geçerli bir CSV dosyası seçin.');
      setSnackbarOpen(true);
    }
  };

  // Dosya seçici açma
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Verileri kaydetme (Practice veya Game verisi) - Firebase ile
  const handleSaveData = async () => {
    console.log('💾 Temizlenmiş veriler Firebase\'e kaydediliyor...', `Tip: ${dataType}`);

    let finalCleanedData;

    if (dataType === 'game') {
      // Game verisi için yeni format (word, class, sentence, word_mean)
      finalCleanedData = csvData.map(item => ({
        id: item.id,
        word: item.missingWord, // word field
        class: item.class || 'unknown', // class field (opsiyonel)
        sentence: item.originalSentence || item.sentence, // Tam cümle
        word_mean: item.translation || item.word_mean, // word_mean field
        repeatCount: 0
      }));

      // Firebase'e game kartları olarak ekle
      await addGameCards(finalCleanedData);
    } else {
      // Practice verisi için eski format
      finalCleanedData = csvData.map(item => ({
        id: item.id,
        sentence: item.sentence, // Zaten temizlenmiş
        missingWord: item.missingWord, // Zaten normalize edilmiş
        translation: item.translation.trim(),
        translationWithUnderline: item.translation.trim(),
        sentenceTranslation: item.sentenceTranslation ? item.sentenceTranslation.trim() : '',
        repeatCount: 0 // Reset repeat count
      }));

      // Firebase'e practice kartları olarak ekle
      await addPracticeCards(finalCleanedData);
    }

    console.log('✅ Firebase\'e kaydedilen veri:', {
      tip: dataType,
      yeniVeriSayısı: finalCleanedData.length
    });

    const dataTypeName = dataType === 'game' ? 'Game' : 'Practice';
    setSnackbarMessage(`✨ ${csvData.length} adet ${dataTypeName} verisi başarıyla Firebase'e eklendi!`);
    setSnackbarOpen(true);

    // Form'u temizle
    setCsvData([]);
    setFileName('');
    setIsUploaded(false);
    setCleaningStats(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Verileri temizleme
  const handleClearData = () => {
    setCsvData([]);
    setFileName('');
    setIsUploaded(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1000, mx: 'auto' }}>
      {/* Başlık */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 'bold', mb: 2 }}>
          Veri Ekleme
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
          CSV dosyası yükleyerek flashcard verilerinizi ekleyin
        </Typography>

        {/* Veri Tipi Seçimi */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
          <Button
            variant={dataType === 'practice' ? 'contained' : 'outlined'}
            onClick={() => setDataType('practice')}
            sx={{
              backgroundColor: dataType === 'practice' ? 'primary.main' : 'transparent',
              borderColor: 'primary.main',
              color: dataType === 'practice' ? '#ccc9dc' : 'primary.main',
              '&:hover': {
                backgroundColor: dataType === 'practice' ? 'primary.dark' : 'rgba(96, 165, 250, 0.1)',
              },
            }}
          >
            📚 Practice Data
          </Button>
          <Button
            variant={dataType === 'game' ? 'contained' : 'outlined'}
            onClick={() => setDataType('game')}
            sx={{
              backgroundColor: dataType === 'game' ? 'secondary.main' : 'transparent',
              borderColor: 'secondary.main',
              color: dataType === 'game' ? '#ccc9dc' : 'secondary.main',
              '&:hover': {
                backgroundColor: dataType === 'game' ? 'secondary.dark' : 'rgba(255, 183, 77, 0.1)',
              },
            }}
          >
            🎮 Game Data
          </Button>
        </Box>
      </Box>

      {/* CSV Format Bilgisi */}
      <Paper
        sx={{
          p: 3,
          mb: 4,
          backgroundColor: 'rgba(96, 165, 250, 0.1)',
          border: '1px solid rgba(96, 165, 250, 0.3)',
        }}
      >
        <Typography variant="h6" sx={{ color: 'primary.main', mb: 2, fontWeight: 'bold' }}>
          🤖 Otomatik Temizleme Sistemi - CSV Format:
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace', mb: 2 }}>
          word,sentence,word_mean,sentence_translation
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace', mb: 2 }}>
          "adult","We're adults and we make decisions.","Yetişkin","Biz yetişkiniz ve kararlar veririz."
        </Typography>
        <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }}>
          <Typography variant="caption" sx={{ color: 'secondary.main' }}>
            <strong>✨ Artık otomatik temizleme var!</strong> Ham veri yükleyin, sistem:
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', ml: 2 }}>
            • Pipe (|) sembollerini temizler<br/>
            • Tekil/çoğul kelimeleri otomatik eşleştirir<br/>
            • Büyük/küçük harf sorunlarını düzeltir<br/>
            • Kelime boundary optimizasyonu yapar
          </Typography>
        </Box>
      </Paper>

      {/* Dosya Yükleme Alanı */}
      <Paper
        sx={{
          p: 4,
          mb: 4,
          textAlign: 'center',
          border: '2px dashed rgba(255, 255, 255, 0.3)',
          backgroundColor: 'background.paper',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'rgba(96, 165, 250, 0.05)',
          },
        }}
        onClick={triggerFileInput}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          ref={fileInputRef}
          style={{ display: 'none' }}
        />
        
        <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" sx={{ color: 'text.primary', mb: 1 }}>
          CSV Dosyası Yükleyin
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Dosyanızı sürükleyip bırakın veya tıklayarak seçin
        </Typography>
        
        {fileName && (
          <Chip 
            label={fileName} 
            sx={{ 
              mt: 2,
              backgroundColor: 'rgba(96, 165, 250, 0.2)',
              color: 'primary.main',
            }} 
          />
        )}
      </Paper>

      {/* Yüklenen Veri Önizlemesi */}
      {isUploaded && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 'bold' }}>
              Veri Önizlemesi ({csvData.length} satır)
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<DeleteIcon />}
                onClick={handleClearData}
                sx={{
                  borderColor: 'error.main',
                  color: 'error.main',
                  '&:hover': {
                    borderColor: 'error.main',
                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                  },
                }}
              >
                Temizle
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveData}
                sx={{
                  backgroundColor: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                }}
              >
                Verileri Kaydet
              </Button>
            </Box>
          </Box>

          <TableContainer
            component={Paper}
            sx={{
              backgroundColor: 'background.paper',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', minWidth: 200 }}>
                    Sentence
                  </TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', minWidth: 100 }}>
                    Word
                  </TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', minWidth: 120 }}>
                    Word Mean
                  </TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', minWidth: 200 }}>
                    Sentence Translation
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {originalPreviewData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
                      {row.sentence}
                    </TableCell>
                    <TableCell sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                      {row.word}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>
                      {row.word_mean}
                    </TableCell>
                    <TableCell sx={{ color: 'text.disabled', fontSize: '0.9rem', fontStyle: 'italic' }}>
                      {row.sentence_translation || '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {csvData.length > 5 && (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ textAlign: 'center', color: 'text.secondary', fontStyle: 'italic' }}>
                      ... ve {csvData.length - 5} satır daha
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Otomatik Temizleme Raporu */}
      {isUploaded && cleaningStats && (
        <Box sx={{ mb: 4 }}>
          <Alert
            severity="success"
            sx={{
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              color: 'text.primary',
              border: '1px solid rgba(76, 175, 80, 0.3)',
              mb: 3
            }}
          >
            🎉 Otomatik veri temizleme tamamlandı! {csvData.length} adet flashcard verisi hazır.
          </Alert>

          <Paper
            sx={{
              p: 3,
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}
          >
            <Typography variant="h6" sx={{ color: 'primary.main', mb: 2, fontWeight: 'bold' }}>
              📊 Temizleme İstatistikleri:
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <Box>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  ✅ <strong>Toplam İşlenen:</strong> {cleaningStats.totalRows} satır
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  🧹 <strong>Cümle Temizlenen:</strong> {cleaningStats.cleanedSentences} adet
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  🔗 <strong>Pipe (|) Temizlenen:</strong> {cleaningStats.pipeCleaned} adet
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  🎯 <strong>Kelime Eşleşen:</strong> {cleaningStats.wordMatched} adet
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  ✅ <strong>Başarılı:</strong> {csvData.length} adet
                </Typography>
                {cleaningStats.failed > 0 && (
                  <Typography variant="body2" sx={{ color: 'error.main' }}>
                    ❌ <strong>Başarısız:</strong> {cleaningStats.failed} adet
                  </Typography>
                )}
              </Box>
            </Box>

            <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                <strong>🤖 Otomatik İşlemler:</strong><br/>
                • Pipe (|) sembolleri ve sonrası temizlendi<br/>
                • Tekil/çoğul kelime varyasyonları optimize edildi<br/>
                • Büyük/küçük harf eşleştirme düzeltildi<br/>
                • Kelime boundary sorunları çözüldü<br/>
                • Ekstra boşluklar ve noktalama temizlendi
              </Typography>
            </Box>
          </Paper>
        </Box>
      )}

      {/* Snackbar Bildirimi */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{
          '& .MuiSnackbar-root': {
            top: '24px',
            right: '24px',
          }
        }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          sx={{
            width: '100%',
            boxShadow: 3,
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AddDataPage;