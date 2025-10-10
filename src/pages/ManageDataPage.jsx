import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Checkbox,
  Tooltip,
  Chip,
  TablePagination,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from '@mui/icons-material';
import useFlashcardStore from '../stores/useFlashcardStore';

const ManageDataPage = () => {
  const {
    practiceCards,
    gameCards,
    deletePracticeCard,
    deleteGameCard,
    deletePracticeCardsBatch,
    deleteGameCardsBatch
  } = useFlashcardStore();
  const [flashcards, setFlashcards] = useState([]);
  const [gameFlashcards, setGameFlashcards] = useState([]);
  const [selected, setSelected] = useState([]);
  const [revealedIndex, setRevealedIndex] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tabValue, setTabValue] = useState(0); // 0: Practice, 1: Game
  const [progressFilter, setProgressFilter] = useState('all'); // all, 0, 1, 2, 3, 4, 5
  const [isDeleting, setIsDeleting] = useState(false);

  // Firebase'den veri yükle
  useEffect(() => {
    setFlashcards(practiceCards || []);
    setGameFlashcards(gameCards || []);
  }, [practiceCards, gameCards]);

  // Aktif veri setini belirle
  const currentData = tabValue === 0 ? flashcards : gameFlashcards;
  const currentStorageKey = tabValue === 0 ? 'flashcardData' : 'gameFlashcardData';

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelecteds = currentData.map((n, index) => index);
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  };

  const handleClick = (event, index) => {
    const selectedIndex = selected.indexOf(index);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, index);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }
    setSelected(newSelected);
  };

  const handleDeleteSelected = async () => {
    const dataTypeName = tabValue === 0 ? 'Practice' : 'Game';
    const isConfirmed = window.confirm(`${selected.length} adet ${dataTypeName} verisini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`);
    if (isConfirmed) {
      setIsDeleting(true);
      try {
        // Silinecek kartların ID'lerini al
        const cardsToDelete = selected.map(index => currentData[index]);
        const idsToDelete = cardsToDelete.map(card => card.id);

        // Batch delete ile Firebase'den sil (çok daha hızlı!)
        if (tabValue === 0) {
          await deletePracticeCardsBatch(idsToDelete);
        } else {
          await deleteGameCardsBatch(idsToDelete);
        }

        // Local state'i güncelle
        const remaining = currentData.filter((_, index) => !selected.includes(index));
        if (tabValue === 0) {
          setFlashcards(remaining);
        } else {
          setGameFlashcards(remaining);
        }

        setSelected([]);
      } catch (error) {
        console.error('Silme hatası:', error);
        alert('Veri silinirken bir hata oluştu. Lütfen tekrar deneyin.');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Progress istatistikleri hesapla (0-5 ayrı ayrı)
  const getProgressStats = (data) => {
    if (tabValue !== 0) return null; // Sadece practice data için

    const stats = {
      0: 0,
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };

    data.forEach(card => {
      const progress = card.sessionProgress || 0;
      if (progress >= 0 && progress <= 5) {
        stats[progress]++;
      }
    });

    return stats;
  };

  // Filtrelenmiş veriler (progress filtresi)
  const filteredFlashcards = useMemo(() => {
    let filtered = currentData;

    // Progress filter uygula (sadece practice data için)
    if (tabValue === 0 && progressFilter !== 'all') {
      filtered = filtered.filter(card => {
        const progress = card.sessionProgress || 0;
        return progress === parseInt(progressFilter);
      });
    }

    return filtered;
  }, [currentData, tabValue, progressFilter]);

  // Sayfalama için veriler
  const paginatedFlashcards = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredFlashcards.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredFlashcards, page, rowsPerPage]);

  const isSelected = (index) => selected.indexOf(index) !== -1;

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setSelected([]);
    setProgressFilter('all');
    setPage(0);
  };

  const handleProgressFilterChange = (filter) => {
    setProgressFilter(filter);
    setPage(0);
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      {/* Başlık */}
      <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 'bold', mb: 3, textAlign: 'center' }}>
        Veri Yönetimi
      </Typography>

      {/* Tab Sistemi */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={tabValue} onChange={handleTabChange} centered>
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                📚 Practice Data ({flashcards.length})
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                🎮 Game Data ({gameFlashcards.length})
              </Box>
            }
          />
        </Tabs>
      </Box>

      {/* Başlık ve İstatistikler */}
      <Box sx={{ mb: 4 }}>
        {/* Filtre Chip'leri - Ortalanmış */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Chip
              label={`Toplam: ${currentData.length}`}
              color="primary"
              variant={progressFilter === 'all' ? 'filled' : 'outlined'}
              size="medium"
              onClick={() => handleProgressFilterChange('all')}
              sx={{
                fontWeight: 'bold',
                minWidth: 85,
                cursor: 'pointer',
                '&:hover': {
                  transform: 'scale(1.05)',
                  transition: 'transform 0.2s'
                }
              }}
            />
            {tabValue === 0 && (() => {
              const stats = getProgressStats(currentData);
              const getStarDisplay = (level) => {
                return '⭐'.repeat(level) + (level < 5 ? '☆'.repeat(5 - level) : '');
              };
              return stats ? (
                <>
                  <Typography variant="caption" sx={{ color: 'text.secondary', mx: 0.5 }}>
                    Progress:
                  </Typography>
                  {[0, 1, 2, 3, 4, 5].map(level => (
                    <Chip
                      key={level}
                      icon={
                        <Box sx={{ display: 'flex', alignItems: 'center', fontSize: '14px', ml: 0.5 }}>
                          {level === 0 ? '☆☆☆☆☆' : getStarDisplay(level)}
                        </Box>
                      }
                      label={stats[level]}
                      color={
                        level === 5 ? 'success' :
                        level >= 3 ? 'warning' :
                        level === 0 ? 'default' :
                        'error'
                      }
                      variant={progressFilter === String(level) ? 'filled' : 'outlined'}
                      size="medium"
                      onClick={() => handleProgressFilterChange(progressFilter === String(level) ? 'all' : String(level))}
                      sx={{
                        cursor: 'pointer',
                        minWidth: 85,
                        fontWeight: 'bold',
                        '&:hover': {
                          transform: 'scale(1.05)',
                          transition: 'transform 0.2s'
                        },
                        '& .MuiChip-icon': {
                          marginLeft: '8px',
                          marginRight: '-4px'
                        }
                      }}
                    />
                  ))}
                </>
              ) : null;
            })()}
            {selected.length > 0 && (
              <Chip
                label={`Seçili: ${selected.length}`}
                color="warning"
                variant="outlined"
                size="medium"
                sx={{ fontWeight: 'bold' }}
              />
            )}
          </Box>
        </Box>

        {/* Silme Butonu */}
        {selected.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Tooltip title="Seçili olan tüm verileri kalıcı olarak sil.">
              <Button
                variant="contained"
                color="error"
                startIcon={isDeleting ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                sx={{
                  minWidth: 150,
                  '&.Mui-disabled': {
                    backgroundColor: 'rgba(244, 67, 54, 0.5)',
                    color: 'rgba(255, 255, 255, 0.7)',
                  }
                }}
              >
                {isDeleting ? 'Siliniyor...' : `${selected.length} Öğeyi Sil`}
              </Button>
            </Tooltip>
          </Box>
        )}
      </Box>

      <TableContainer component={Paper} sx={{ backgroundColor: 'background.paper', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>İngilizce Cümle</TableCell>
              <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>
                {tabValue === 0 ? 'Aranan Kelime' : 'Kelime'}
              </TableCell>
              <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>
                {tabValue === 0 ? 'Kelime Anlamı' : 'Kelime Anlamı'}
              </TableCell>
              {tabValue === 0 && (
                <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>
                  Cümle Çevirisi
                </TableCell>
              )}
              {tabValue === 0 && (
                <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', textAlign: 'center' }}>
                  Progress
                </TableCell>
              )}
              <TableCell padding="checkbox" align="right">
                <Checkbox
                  color="primary"
                  indeterminate={selected.length > 0 && selected.length < currentData.length}
                  checked={currentData.length > 0 && selected.length === currentData.length}
                  onChange={handleSelectAllClick}
                  inputProps={{ 'aria-label': 'tüm öğeleri seç' }}
                />
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedFlashcards.map((card, index) => {
              const globalIndex = page * rowsPerPage + index; // Gerçek index'i hesapla
              const isItemSelected = isSelected(globalIndex);
              const labelId = `enhanced-table-checkbox-${globalIndex}`;

              // Progress hesapla
              const masteryLevel = card.masteryLevel || 0;

              // Session progress kullan
              const sessionProgress = card.sessionProgress || 0;

              return (
                <TableRow
                  hover
                  onClick={(event) => handleClick(event, globalIndex)}
                  role="checkbox"
                  aria-checked={isItemSelected}
                  tabIndex={-1}
                  key={globalIndex}
                  selected={isItemSelected}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
                    {card.sentence}
                  </TableCell>
                  <TableCell
                    sx={{
                      color: 'primary.main',
                      fontWeight: 'bold',
                      filter: revealedIndex === globalIndex ? 'none' : 'blur(5px)',
                      transition: 'filter 0.2s ease-in-out',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={() => setRevealedIndex(globalIndex)}
                    onMouseLeave={() => setRevealedIndex(null)}
                  >
                    {tabValue === 0 ? card.missingWord : card.word}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>
                    {tabValue === 0 ? card.translation : card.word_mean}
                  </TableCell>
                  {tabValue === 0 && (
                    <TableCell sx={{ color: 'text.disabled', fontSize: '0.85rem', fontStyle: 'italic' }}>
                      {card.sentenceTranslation || '-'}
                    </TableCell>
                  )}
                  {tabValue === 0 && (
                    <TableCell sx={{ textAlign: 'center', py: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Box
                            key={star}
                            sx={{
                              width: 16,
                              height: 16,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {star <= sessionProgress ? (
                              <StarIcon
                                sx={{
                                  fontSize: 16,
                                  color: sessionProgress >= 5
                                    ? 'success.main'
                                    : sessionProgress >= 3
                                      ? 'warning.main'
                                      : 'error.main'
                                }}
                              />
                            ) : (
                              <StarBorderIcon
                                sx={{
                                  fontSize: 16,
                                  color: 'rgba(255, 255, 255, 0.3)'
                                }}
                              />
                            )}
                          </Box>
                        ))}
                      </Box>
                    </TableCell>
                  )}
                  <TableCell padding="checkbox" align="right">
                    <Checkbox
                      color="primary"
                      checked={isItemSelected}
                      inputProps={{ 'aria-labelledby': labelId }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredFlashcards.length === 0 && flashcards.length > 0 && (
              <TableRow>
                <TableCell colSpan={tabValue === 0 ? 6 : 4} sx={{ textAlign: 'center', color: 'text.secondary', fontStyle: 'italic', p: 4 }}>
                  Arama kriterinize uygun veri bulunamadı. Farklı terimlerle arama yapın.
                </TableCell>
              </TableRow>
            )}
            {flashcards.length === 0 && (
              <TableRow>
                <TableCell colSpan={tabValue === 0 ? 6 : 4} sx={{ textAlign: 'center', color: 'text.secondary', fontStyle: 'italic', p: 4 }}>
                  Görüntülenecek veri bulunamadı. Lütfen 'Veri Ekleme' sayfasından CSV dosyası yükleyin.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Sayfalama */}
        {filteredFlashcards.length > 0 && (
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={filteredFlashcards.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Sayfa başına:"
            labelDisplayedRows={({ from, to, count }) => 
              `${from}-${to} / ${count !== -1 ? count : `${to}'dan fazla`}`
            }
            sx={{
              borderTop: '1px solid rgba(148, 163, 184, 0.12)',
              '& .MuiTablePagination-toolbar': {
                color: 'text.secondary',
              },
              '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                color: 'text.secondary',
              },
            }}
          />
        )}
      </TableContainer>
    </Box>
  );
};

export default ManageDataPage;