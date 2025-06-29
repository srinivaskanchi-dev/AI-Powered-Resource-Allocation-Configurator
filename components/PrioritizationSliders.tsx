import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Slider, 
  Box, 
  Tabs, 
  Tab, 
  Button, 
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';

export type Weights = {
  priority: number;
  fulfillment: number;
  fairness: number;
  cost: number;
  duration: number;
  quality: number;
  efficiency: number;
};

interface PrioritizationSlidersProps {
  weights: Weights;
  onChange: (weights: Weights) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`prioritization-tabpanel-${index}`}
      aria-labelledby={`prioritization-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const PRESET_PROFILES = {
  'maximize-fulfillment': {
    name: 'Maximize Fulfillment',
    description: 'Prioritize completing as many tasks as possible',
    weights: { priority: 8, fulfillment: 10, fairness: 6, cost: 4, duration: 7, quality: 5, efficiency: 6 }
  },
  'fair-distribution': {
    name: 'Fair Distribution',
    description: 'Ensure equal workload distribution across workers',
    weights: { priority: 6, fulfillment: 7, fairness: 10, cost: 5, duration: 6, quality: 6, efficiency: 5 }
  },
  'minimize-workload': {
    name: 'Minimize Workload',
    description: 'Reduce overall workload and stress on workers',
    weights: { priority: 5, fulfillment: 6, fairness: 8, cost: 7, duration: 8, quality: 6, efficiency: 7 }
  },
  'cost-optimization': {
    name: 'Cost Optimization',
    description: 'Minimize costs while maintaining quality',
    weights: { priority: 6, fulfillment: 5, fairness: 4, cost: 10, duration: 8, quality: 6, efficiency: 8 }
  },
  'quality-focus': {
    name: 'Quality Focus',
    description: 'Prioritize high-quality outcomes over speed',
    weights: { priority: 7, fulfillment: 6, fairness: 5, cost: 4, duration: 5, quality: 10, efficiency: 6 }
  },
  'balanced': {
    name: 'Balanced Approach',
    description: 'Equal consideration for all factors',
    weights: { priority: 7, fulfillment: 7, fairness: 7, cost: 7, duration: 7, quality: 7, efficiency: 7 }
  }
};

const CRITERIA_LABELS = {
  priority: 'Priority Level',
  fulfillment: 'Task Fulfillment',
  fairness: 'Fair Distribution',
  cost: 'Cost Efficiency',
  duration: 'Duration Optimization',
  quality: 'Quality Standards',
  efficiency: 'Overall Efficiency'
};

const PrioritizationSliders: React.FC<PrioritizationSlidersProps> = ({ weights, onChange }) => {
  const [tabValue, setTabValue] = useState(0);
  const [dragOrder, setDragOrder] = useState<Array<keyof Weights>>([
    'priority', 'fulfillment', 'fairness', 'cost', 'duration', 'quality', 'efficiency'
  ]);
  const [pairwiseDialog, setPairwiseDialog] = useState(false);
  const [pairwiseMatrix, setPairwiseMatrix] = useState<Record<string, Record<string, number>>>({});
  const [currentPair, setCurrentPair] = useState<[keyof Weights, keyof Weights] | null>(null);

  const handleChange = (key: keyof Weights, value: number) => {
    onChange({ ...weights, [key]: value });
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(dragOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setDragOrder(items);
    
    // Update weights based on new order (higher position = higher weight)
    const newWeights = { ...weights };
    items.forEach((key, index) => {
      newWeights[key] = 10 - index; // 10 for first, 9 for second, etc.
    });
    onChange(newWeights);
  };

  const applyPreset = (presetKey: string) => {
    const preset = PRESET_PROFILES[presetKey as keyof typeof PRESET_PROFILES];
    if (preset) {
      onChange(preset.weights);
    }
  };

  const startPairwiseComparison = () => {
    const criteria = Object.keys(weights) as Array<keyof Weights>;
    const matrix: Record<string, Record<string, number>> = {};
    
    criteria.forEach(c1 => {
      matrix[c1] = {};
      criteria.forEach(c2 => {
        if (c1 === c2) {
          matrix[c1][c2] = 1;
        } else {
          matrix[c1][c2] = 0; // Not compared yet
        }
      });
    });
    
    setPairwiseMatrix(matrix);
    setCurrentPair([criteria[0], criteria[1]]);
    setPairwiseDialog(true);
  };

  const handlePairwiseChoice = (choice: number) => {
    if (!currentPair) return;
    
    const [c1, c2] = currentPair;
    setPairwiseMatrix(prev => ({
      ...prev,
      [c1]: { ...prev[c1], [c2]: choice },
      [c2]: { ...prev[c2], [c1]: 1 / choice }
    }));
    
    // Move to next pair
    const criteria = Object.keys(weights) as Array<keyof Weights>;
    const currentIndex = criteria.indexOf(c1);
    const nextIndex = (currentIndex + 1) % criteria.length;
    const nextC1 = criteria[nextIndex];
    const nextC2 = criteria[(nextIndex + 1) % criteria.length];
    
    if (nextC1 === criteria[0] && nextC2 === criteria[1]) {
      // All pairs compared, calculate weights
      calculateWeightsFromMatrix();
      setPairwiseDialog(false);
    } else {
      setCurrentPair([nextC1, nextC2]);
    }
  };

  const calculateWeightsFromMatrix = () => {
    const criteria = Object.keys(weights) as Array<keyof Weights>;
    const totals: Record<string, number> = {};
    
    criteria.forEach(c => {
      totals[c] = Object.values(pairwiseMatrix[c]).reduce((sum, val) => sum + val, 0);
    });
    
    const totalSum = Object.values(totals).reduce((sum, val) => sum + val, 0);
    const newWeights: Weights = { ...weights };
    
    criteria.forEach(c => {
      newWeights[c] = Math.round((totals[c] / totalSum) * 10);
    });
    
    onChange(newWeights);
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          🎯 Prioritization & Weights Configuration
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Configure how the resource allocator should balance different criteria
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="prioritization methods">
            <Tab label="Sliders" />
            <Tab label="Drag & Drop" />
            <Tab label="Pairwise Comparison" />
            <Tab label="Preset Profiles" />
          </Tabs>
        </Box>

        {/* Sliders Tab */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant="subtitle1" gutterBottom>
            Adjust weights using sliders (1-10 scale)
          </Typography>
          {Object.entries(weights).map(([key, value]) => (
            <Box key={key} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2">
                  {CRITERIA_LABELS[key as keyof Weights]}
                </Typography>
                <Chip label={value} size="small" color="primary" />
              </Box>
              <Slider
                value={value}
                onChange={(_, newValue) => handleChange(key as keyof Weights, newValue as number)}
                min={1}
                max={10}
                marks
                valueLabelDisplay="auto"
              />
            </Box>
          ))}
        </TabPanel>

        {/* Drag & Drop Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="subtitle1" gutterBottom>
            Drag to reorder criteria by importance (top = highest priority)
          </Typography>
          <Paper sx={{ p: 2 }}>
            <List>
              {dragOrder.map((key, index) => (
                <ListItem
                  key={key}
                  sx={{
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    mb: 1,
                    cursor: 'grab',
                    '&:hover': { backgroundColor: '#f5f5f5' }
                  }}
                >
                  <ListItemIcon>
                    ⋮⋮
                  </ListItemIcon>
                  <ListItemText
                    primary={CRITERIA_LABELS[key]}
                    secondary={`Weight: ${weights[key]} (Rank: ${index + 1})`}
                  />
                  <Chip label={`${10 - index}`} color="primary" />
                </ListItem>
              ))}
            </List>
          </Paper>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Note: Drag and drop functionality is simulated. Use the sliders tab for actual weight adjustment.
          </Typography>
        </TabPanel>

        {/* Pairwise Comparison Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="subtitle1" gutterBottom>
            Compare criteria two at a time to build a weight matrix
          </Typography>
          <Button 
            variant="contained" 
            onClick={startPairwiseComparison}
            sx={{ mb: 2 }}
          >
            Start Pairwise Comparison
          </Button>
          <Typography variant="body2" color="text.secondary">
            This method uses the Analytic Hierarchy Process (AHP) to determine optimal weights.
          </Typography>
        </TabPanel>

        {/* Preset Profiles Tab */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="subtitle1" gutterBottom>
            Choose from predefined optimization profiles
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(PRESET_PROFILES).map(([key, profile]) => (
              <Grid item xs={12} sm={6} md={4} key={key}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: '#f5f5f5' }
                  }}
                  onClick={() => applyPreset(key)}
                >
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {profile.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {profile.description}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {Object.entries(profile.weights).map(([criteria, weight]) => (
                        <Chip 
                          key={criteria}
                          label={`${CRITERIA_LABELS[criteria as keyof Weights]}: ${weight}`}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Pairwise Comparison Dialog */}
        <Dialog open={pairwiseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Pairwise Comparison</DialogTitle>
          <DialogContent>
            {currentPair && (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Which is more important?
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', my: 3 }}>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => handlePairwiseChoice(9)}
                    sx={{ minWidth: 120 }}
                  >
                    {CRITERIA_LABELS[currentPair[0]]}
                    <br />
                    <small>Extremely</small>
                  </Button>
                  <Typography variant="h4">vs</Typography>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => handlePairwiseChoice(1/9)}
                    sx={{ minWidth: 120 }}
                  >
                    {CRITERIA_LABELS[currentPair[1]]}
                    <br />
                    <small>Extremely</small>
                  </Button>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Choose the criterion that is more important for your resource allocation strategy
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPairwiseDialog(false)}>Cancel</Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default PrioritizationSliders; 