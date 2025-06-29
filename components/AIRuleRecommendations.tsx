import React, { useState } from 'react';
import { Card, CardContent, Typography, Button, List, ListItem, ListItemText, Chip, Box, Alert, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { GridRowsProp } from '@mui/x-data-grid';

interface AIRuleRecommendationsProps {
  clients: GridRowsProp;
  workers: GridRowsProp;
  tasks: GridRowsProp;
  existingRules: any[];
  onAddRule: (rule: any) => void;
}

interface RuleRecommendation {
  type: 'coRun' | 'slotRestriction' | 'loadLimit' | 'phaseWindow';
  reason: string;
  rule: any;
  confidence: 'high' | 'medium' | 'low';
  impact: string;
}

interface AIRuleResponse {
  recommendations: RuleRecommendation[];
  insights: string[];
}

const AIRuleRecommendations: React.FC<AIRuleRecommendationsProps> = ({
  clients,
  workers,
  tasks,
  existingRules,
  onAddRule,
}) => {
  const [recommendations, setRecommendations] = useState<AIRuleResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [appliedRecommendations, setAppliedRecommendations] = useState<Set<string>>(new Set());

  const getAIRuleRecommendations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-rule-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clients: [...clients],
          workers: [...workers],
          tasks: [...tasks],
          existingRules,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRecommendations(data);
      }
    } catch (error) {
      console.error('Error getting AI rule recommendations:', error);
    }
    setLoading(false);
  };

  const applyRecommendation = (recommendation: RuleRecommendation) => {
    const recommendationKey = `${recommendation.type}-${JSON.stringify(recommendation.rule)}`;
    
    if (appliedRecommendations.has(recommendationKey)) {
      return; // Already applied
    }

    onAddRule(recommendation.rule);
    setAppliedRecommendations(prev => new Set([...prev, recommendationKey]));
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'success';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getRuleTypeColor = (type: string) => {
    switch (type) {
      case 'coRun': return 'primary';
      case 'slotRestriction': return 'secondary';
      case 'loadLimit': return 'warning';
      case 'phaseWindow': return 'info';
      default: return 'default';
    }
  };

  return (
    <Card sx={{ mb: 3, background: '#f0f8ff', border: '1px solid #b3d9ff' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom color="primary">
          🤖 AI Rule Recommendations
        </Typography>
        
        <Typography variant="body2" sx={{ mb: 2 }}>
          Let AI analyze your data patterns and suggest business rules to optimize resource allocation!
        </Typography>

        {!recommendations && (
          <Button 
            variant="contained" 
            color="primary" 
            onClick={getAIRuleRecommendations}
            disabled={loading}
            sx={{ mb: 2 }}
          >
            {loading ? 'Analyzing Data Patterns...' : 'Get AI Rule Recommendations'}
          </Button>
        )}

        {recommendations && (
          <Box>
            {recommendations.insights && recommendations.insights.length > 0 && (
              <Accordion sx={{ mb: 2 }}>
                <AccordionSummary>
                  <Typography variant="subtitle1">
                    📊 Data Insights ({recommendations.insights.length}) ▼
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {recommendations.insights.map((insight, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={insight} />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            )}

            <Box sx={{ mb: 2 }}>
              <Button 
                variant="outlined" 
                onClick={() => setRecommendations(null)}
              >
                Get New Recommendations
              </Button>
            </Box>

            <Typography variant="subtitle1" gutterBottom>
              Recommended Rules ({recommendations.recommendations.length}):
            </Typography>

            <List>
              {recommendations.recommendations.map((recommendation, index) => {
                const recommendationKey = `${recommendation.type}-${JSON.stringify(recommendation.rule)}`;
                const isApplied = appliedRecommendations.has(recommendationKey);
                
                return (
                  <ListItem 
                    key={index} 
                    sx={{ 
                      border: '1px solid #e0e0e0', 
                      borderRadius: 1, 
                      mb: 2,
                      background: isApplied ? '#e8f5e8' : 'white',
                      flexDirection: 'column',
                      alignItems: 'stretch'
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip 
                          label={recommendation.type} 
                          color={getRuleTypeColor(recommendation.type)}
                          size="small"
                        />
                        <Chip 
                          label={`${recommendation.confidence} confidence`} 
                          color={getConfidenceColor(recommendation.confidence)}
                          size="small"
                        />
                        {isApplied && (
                          <Chip 
                            label="Applied" 
                            color="success" 
                            size="small"
                          />
                        )}
                      </Box>
                      <Button
                        variant="contained"
                        size="small"
                        color="success"
                        onClick={() => applyRecommendation(recommendation)}
                        disabled={isApplied}
                      >
                        {isApplied ? 'Applied' : 'Add Rule'}
                      </Button>
                    </Box>

                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Reason:</strong> {recommendation.reason}
                    </Typography>

                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Expected Impact:</strong> {recommendation.impact}
                    </Typography>

                    <Alert severity="info" sx={{ mt: 1 }}>
                      <Typography variant="body2">
                        <strong>Rule:</strong> {JSON.stringify(recommendation.rule, null, 2)}
                      </Typography>
                    </Alert>
                  </ListItem>
                );
              })}
            </List>

            {recommendations.recommendations.length === 0 && (
              <Alert severity="info">
                <Typography variant="body2">
                  No specific rule recommendations found. Your data patterns look good, or try uploading more data for better analysis.
                </Typography>
              </Alert>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AIRuleRecommendations; 