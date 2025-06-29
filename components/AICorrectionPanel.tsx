import React, { useState } from 'react';
import { Card, CardContent, Typography, Button, List, ListItem, ListItemText, Chip, Box, Alert } from '@mui/material';
import { GridRowsProp } from '@mui/x-data-grid';

interface AICorrectionPanelProps {
  validation: any;
  clients: GridRowsProp;
  workers: GridRowsProp;
  tasks: GridRowsProp;
  onClientsChange: (clients: GridRowsProp) => void;
  onWorkersChange: (workers: GridRowsProp) => void;
  onTasksChange: (tasks: GridRowsProp) => void;
}

interface AISuggestion {
  entity: 'clients' | 'workers' | 'tasks';
  row: number;
  column: string;
  issue: string;
  suggestedFix: string;
}

interface AICorrectionResponse {
  suggestions: AISuggestion[];
  generalAdvice: string;
}

const AICorrectionPanel: React.FC<AICorrectionPanelProps> = ({
  validation,
  clients,
  workers,
  tasks,
  onClientsChange,
  onWorkersChange,
  onTasksChange,
}) => {
  const [corrections, setCorrections] = useState<AICorrectionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [appliedCorrections, setAppliedCorrections] = useState<Set<string>>(new Set());

  const getAICorrections = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          validationErrors: validation?.errors,
          clients: [...clients],
          workers: [...workers],
          tasks: [...tasks],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCorrections(data);
      }
    } catch (error) {
      console.error('Error getting AI corrections:', error);
    }
    setLoading(false);
  };

  const applyCorrection = (suggestion: AISuggestion) => {
    const correctionKey = `${suggestion.entity}-${suggestion.row}-${suggestion.column}`;
    
    if (appliedCorrections.has(correctionKey)) {
      return; // Already applied
    }

    // Get the data array based on entity
    let dataArray: GridRowsProp;
    let updateFunction: (data: GridRowsProp) => void;
    
    switch (suggestion.entity) {
      case 'clients':
        dataArray = clients;
        updateFunction = onClientsChange;
        break;
      case 'workers':
        dataArray = workers;
        updateFunction = onWorkersChange;
        break;
      case 'tasks':
        dataArray = tasks;
        updateFunction = onTasksChange;
        break;
      default:
        return;
    }

    // Find the row by index (row is 1-based, so subtract 1)
    const rowIndex = suggestion.row - 1;
    if (rowIndex >= 0 && rowIndex < dataArray.length) {
      const updatedData = [...dataArray];
      const row = updatedData[rowIndex];
      
      // Apply the suggested fix - this is a simplified approach
      // In a real implementation, you might want to parse the suggestedFix
      // and apply it more intelligently
      if (row && suggestion.column) {
        // For now, we'll just mark it as fixed by adding a note
        updatedData[rowIndex] = {
          ...row,
          [`${suggestion.column}_fixed`]: true,
          [`${suggestion.column}_suggestion`]: suggestion.suggestedFix
        };
        updateFunction(updatedData);
        setAppliedCorrections(prev => new Set([...prev, correctionKey]));
      }
    }
  };

  const applyAllCorrections = () => {
    if (!corrections?.suggestions) return;
    
    corrections.suggestions.forEach(suggestion => {
      applyCorrection(suggestion);
    });
  };

  const hasValidationErrors = validation?.summary?.length > 0;

  if (!hasValidationErrors) {
    return null;
  }

  return (
    <Card sx={{ mb: 3, background: '#f8f9fa', border: '1px solid #dee2e6' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom color="error">
          🔧 AI-Powered Data Correction
        </Typography>
        
        <Typography variant="body2" sx={{ mb: 2 }}>
          Found {validation.summary.length} validation issues. Let AI help you fix them automatically!
        </Typography>

        {!corrections && (
          <Button 
            variant="contained" 
            color="primary" 
            onClick={getAICorrections}
            disabled={loading}
            sx={{ mb: 2 }}
          >
            {loading ? 'Analyzing...' : 'Get AI Correction Suggestions'}
          </Button>
        )}

        {corrections && (
          <Box>
            {corrections.generalAdvice && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>AI Advice:</strong> {corrections.generalAdvice}
                </Typography>
              </Alert>
            )}

            <Box sx={{ mb: 2 }}>
              <Button 
                variant="outlined" 
                color="success" 
                onClick={applyAllCorrections}
                sx={{ mr: 1 }}
              >
                Apply All Corrections
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => setCorrections(null)}
              >
                Get New Suggestions
              </Button>
            </Box>

            <Typography variant="subtitle1" gutterBottom>
              Suggested Fixes ({corrections.suggestions.length}):
            </Typography>

            <List dense>
              {corrections.suggestions.map((suggestion, index) => {
                const correctionKey = `${suggestion.entity}-${suggestion.row}-${suggestion.column}`;
                const isApplied = appliedCorrections.has(correctionKey);
                
                return (
                  <ListItem 
                    key={index} 
                    sx={{ 
                      border: '1px solid #e0e0e0', 
                      borderRadius: 1, 
                      mb: 1,
                      background: isApplied ? '#e8f5e8' : 'white'
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box>
                          <Typography variant="body2" component="span">
                            <strong>{suggestion.entity}</strong> - Row {suggestion.row}, {suggestion.column}: 
                          </Typography>
                          <Chip 
                            label={suggestion.entity} 
                            size="small" 
                            sx={{ ml: 1, mb: 0.5 }}
                          />
                          {isApplied && (
                            <Chip 
                              label="Applied" 
                              size="small" 
                              color="success" 
                              sx={{ ml: 1, mb: 0.5 }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                            <strong>Issue:</strong> {suggestion.issue}
                          </Typography>
                          <Typography variant="body2" color="primary">
                            <strong>Suggested Fix:</strong> {suggestion.suggestedFix}
                          </Typography>
                        </Box>
                      }
                    />
                    {!isApplied && (
                      <Button 
                        variant="outlined" 
                        size="small" 
                        onClick={() => applyCorrection(suggestion)}
                        sx={{ ml: 2 }}
                      >
                        Apply Fix
                      </Button>
                    )}
                  </ListItem>
                );
              })}
            </List>

            {corrections.suggestions.length === 0 && (
              <Alert severity="warning">
                No specific suggestions available. Please review the validation errors manually.
              </Alert>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AICorrectionPanel; 