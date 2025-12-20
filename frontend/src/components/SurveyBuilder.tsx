// src/features/surveys/components/SurveyBuilder.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  Radio,
  FormControlLabel,
  FormGroup,
  Grid,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import {
  DragHandle,
  Delete,
  Add,
  Settings,
  Visibility,
  ArrowUpward,
  ArrowDownward
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { surveyAPI } from '@/services/api/survey.api';

export const SurveyBuilder: React.FC<{ surveyId?: string }> = ({ surveyId }) => {
  const [survey, setSurvey] = useState({
    title: '',
    description: '',
    status: 'DRAFT',
    allowAnonymous: false,
    requireLogin: true,
    shuffleQuestions: false,
    showProgress: true
  });
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);

  // Charger l'enquête existante
  useEffect(() => {
    if (surveyId) {
      loadSurvey(surveyId);
    }
  }, [surveyId]);

  const loadSurvey = async (id: string) => {
    setLoading(true);
    try {
      const data = await surveyAPI.getById(id);
      setSurvey(data);
      setQuestions(data.questions || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = (type: string) => {
    const newQuestion: any = {
      id: `temp-${Date.now()}`,
      text: '',
      type,
      required: false,
      position: questions.length,
      options: type.includes('CHOICE') ? [
        { id: '1', label: 'Option 1', value: 'option1' },
        { id: '2', label: 'Option 2', value: 'option2' }
      ] : undefined
    };
    
    setQuestions([...questions, newQuestion]);
    setActiveQuestion(questions.length);
  };

  const handleUpdateQuestion = (index: number, updates: any) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], ...updates };
    setQuestions(newQuestions);
  };

  const handleDeleteQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    // Réordonner les positions
    const reordered = newQuestions.map((q, i) => ({ ...q, position: i }));
    setQuestions(reordered);
    setActiveQuestion(null);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(questions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Mettre à jour les positions
    const reordered = items.map((item, index) => ({
      ...item,
      position: index
    }));
    
    setQuestions(reordered);
  };

  const handleSave = async () => {
    try {
      const data = {
        ...survey,
        questions: questions.map(q => ({
          text: q.text,
          type: q.type,
          required: q.required,
          options: q.options,
          validationRules: q.validationRules
        }))
      };
      
      if (surveyId) {
        await surveyAPI.update(surveyId, data);
      } else {
        await surveyAPI.create(data);
      }
      
      alert('Enquête sauvegardée avec succès');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Panneau de configuration */}
        <Grid xs={3}>
          <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
            <Typography variant="h6" gutterBottom>
              Configuration
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <TextField
                label="Titre de l'enquête"
                fullWidth
                value={survey.title}
                onChange={(e) => setSurvey({ ...survey, title: e.target.value })}
                sx={{ mb: 2 }}
              />
              
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={survey.description}
                onChange={(e) => setSurvey({ ...survey, description: e.target.value })}
                sx={{ mb: 2 }}
              />
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Statut</InputLabel>
                <Select
                  value={survey.status}
                  onChange={(e) => setSurvey({ ...survey, status: e.target.value })}
                  label="Statut"
                >
                  <MenuItem value="DRAFT">Brouillon</MenuItem>
                  <MenuItem value="ACTIVE">Actif</MenuItem>
                  <MenuItem value="PAUSED">En pause</MenuItem>
                </Select>
              </FormControl>
              
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={survey.allowAnonymous}
                      onChange={(e) => setSurvey({ ...survey, allowAnonymous: e.target.checked })}
                    />
                  }
                  label="Autoriser les réponses anonymes"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={survey.requireLogin}
                      onChange={(e) => setSurvey({ ...survey, requireLogin: e.target.checked })}
                    />
                  }
                  label="Nécessite une connexion"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={survey.shuffleQuestions}
                      onChange={(e) => setSurvey({ ...survey, shuffleQuestions: e.target.checked })}
                    />
                  }
                  label="Mélanger les questions"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={survey.showProgress}
                      onChange={(e) => setSurvey({ ...survey, showProgress: e.target.checked })}
                    />
                  }
                  label="Afficher la progression"
                />
              </FormGroup>
            </Box>
            
            <Typography variant="subtitle1" gutterBottom>
              Ajouter une question
            </Typography>
            
            <Grid container spacing={1}>
              <Grid xs={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => handleAddQuestion('SINGLE_CHOICE')}
                  sx={{ mb: 1 }}
                >
                  Choix unique
                </Button>
              </Grid>
              <Grid xs={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => handleAddQuestion('MULTIPLE_CHOICE')}
                  sx={{ mb: 1 }}
                >
                  Choix multiple
                </Button>
              </Grid>
              <Grid xs={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => handleAddQuestion('TEXT')}
                  sx={{ mb: 1 }}
                >
                  Texte court
                </Button>
              </Grid>
              <Grid xs={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => handleAddQuestion('TEXTAREA')}
                  sx={{ mb: 1 }}
                >
                  Texte long
                </Button>
              </Grid>
              <Grid xs={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => handleAddQuestion('LIKERT_SCALE')}
                  sx={{ mb: 1 }}
                >
                  Échelle Likert
                </Button>
              </Grid>
              <Grid xs={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => handleAddQuestion('DATE')}
                  sx={{ mb: 1 }}
                >
                  Date
                </Button>
              </Grid>
            </Grid>
            
            <Button
              variant="contained"
              fullWidth
              onClick={handleSave}
              sx={{ mt: 3 }}
            >
              Sauvegarder
            </Button>
          </Paper>
        </Grid>
        
        {/* Zone de construction */}
        <Grid xs={9}>
          <Paper sx={{ p: 3, minHeight: '80vh' }}>
            <Typography variant="h5" gutterBottom>
              {survey.title || 'Nouvelle enquête'}
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              {survey.description || 'Ajoutez une description...'}
            </Typography>
            
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="questions">
                {(provided) => (
                  <Box {...provided.droppableProps} ref={provided.innerRef}>
                    {questions.map((question, index) => (
                      <Draggable
                        key={question.id}
                        draggableId={question.id}
                        index={index}
                      >
                        {(provided) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            sx={{
                              mb: 2,
                              border: activeQuestion === index ? '2px solid #3f51b5' : '1px solid #e0e0e0'
                            }}
                            onClick={() => setActiveQuestion(index)}
                          >
                            <CardContent>
                              <Box display="flex" alignItems="center" mb={2}>
                                <Box {...provided.dragHandleProps}>
                                  <DragHandle />
                                </Box>
                                <Typography variant="subtitle1" sx={{ ml: 2, flexGrow: 1 }}>
                                  Question {index + 1}
                                </Typography>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteQuestion(index)}
                                >
                                  <Delete />
                                </IconButton>
                              </Box>
                              
                              <QuestionEditor
                                question={question}
                                onChange={(updates) => handleUpdateQuestion(index, updates)}
                              />
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            </DragDropContext>
            
            {questions.length === 0 && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 10,
                  border: '2px dashed #e0e0e0',
                  borderRadius: 2
                }}
              >
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  Aucune question
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Cliquez sur les boutons à gauche pour ajouter des questions
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

// Éditeur de question
const QuestionEditor: React.FC<{ 
  question: any; 
  onChange: (updates: any) => void 
}> = ({ question, onChange }) => {
  
  const handleTextChange = (text: string) => {
    onChange({ text });
  };
  
  const handleRequiredChange = (required: boolean) => {
    onChange({ required });
  };
  
  const handleOptionChange = (index: number, option: any) => {
    const newOptions = [...question.options];
    newOptions[index] = option;
    onChange({ options: newOptions });
  };
  
  const addOption = () => {
    const newOption = {
      id: Date.now().toString(),
      label: `Option ${question.options.length + 1}`,
      value: `option${question.options.length + 1}`
    };
    onChange({ options: [...question.options, newOption] });
  };
  
  const removeOption = (index: number) => {
    const newOptions = question.options.filter((_: any, i: number) => i !== index);
    onChange({ options: newOptions });
  };
  
  return (
    <Box>
      <TextField
        label="Question"
        fullWidth
        value={question.text}
        onChange={(e) => handleTextChange(e.target.value)}
        sx={{ mb: 2 }}
        placeholder="Entrez votre question ici..."
      />
      
      <FormControlLabel
        control={
          <Checkbox
            checked={question.required}
            onChange={(e) => handleRequiredChange(e.target.checked)}
          />
        }
        label="Réponse obligatoire"
        sx={{ mb: 2 }}
      />
      
      {question.type.includes('CHOICE') && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Options
          </Typography>
          {question.options.map((option: any, index: number) => (
            <Box key={option.id} display="flex" alignItems="center" mb={1}>
              {question.type === 'SINGLE_CHOICE' ? (
                <Radio disabled />
              ) : (
                <Checkbox disabled />
              )}
              <TextField
                value={option.label}
                onChange={(e) => handleOptionChange(index, {
                  ...option,
                  label: e.target.value
                })}
                fullWidth
                size="small"
              />
              <IconButton
                size="small"
                onClick={() => removeOption(index)}
                sx={{ ml: 1 }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Button
            startIcon={<Add />}
            onClick={addOption}
            size="small"
          >
            Ajouter une option
          </Button>
        </Box>
      )}
      
      {question.type === 'LIKERT_SCALE' && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Échelle Likert
          </Typography>
          <Box display="flex" justifyContent="space-between" mt={2}>
            {[1, 2, 3, 4, 5, 6, 7].map((value) => (
              <FormControlLabel
                key={value}
                control={<Radio disabled />}
                label={value}
                labelPlacement="top"
              />
            ))}
          </Box>
          <Box display="flex" justifyContent="space-between" mt={1}>
            <Typography variant="caption">Pas du tout d'accord</Typography>
            <Typography variant="caption">Tout à fait d'accord</Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};
