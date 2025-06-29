import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Box, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  Chip,
  IconButton,
  Grid,
  Divider,
  Alert
} from '@mui/material';

// Rule types
const RULE_TYPES = [
  { value: 'coRun', label: 'Co-Run Tasks', description: 'Tasks that must run together' },
  { value: 'slotRestriction', label: 'Slot Restriction', description: 'Minimum common slots for a group' },
  { value: 'loadLimit', label: 'Load Limit', description: 'Maximum slots per phase for a group' },
  { value: 'phaseWindow', label: 'Phase Window', description: 'Allowed phases for a specific task' },
  { value: 'patternMatch', label: 'Pattern Match', description: 'Regex-based rule with template' },
  { value: 'precedenceOverride', label: 'Precedence Override', description: 'Global vs specific rule priorities' }
];

export type Rule =
  | { type: 'coRun'; tasks: string[]; priority?: number }
  | { type: 'slotRestriction'; group: string; minCommonSlots: number; priority?: number }
  | { type: 'loadLimit'; group: string; maxSlotsPerPhase: number; priority?: number }
  | { type: 'phaseWindow'; task: string; allowedPhases: number[]; priority?: number }
  | { type: 'patternMatch'; regex: string; template: string; parameters: Record<string, any>; priority?: number }
  | { type: 'precedenceOverride'; globalRules: string[]; specificRules: string[]; priority?: number };

interface RuleBuilderProps {
  tasks: any[];
  workers: any[];
  clients: any[];
  onRulesChange: (rules: Rule[]) => void;
  onAddRuleFromNL?: (description: string) => Promise<void>;
  nlLoading?: boolean;
}

const RuleBuilder: React.FC<RuleBuilderProps> = ({ tasks, workers, clients, onRulesChange, onAddRuleFromNL, nlLoading }) => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [nlInput, setNlInput] = useState('');

  // Co-run rule state
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  // Slot restriction rule state
  const [selectedGroup, setSelectedGroup] = useState('');
  const [minSlots, setMinSlots] = useState<number>(1);

  // Load limit rule state
  const [maxSlotsPerPhase, setMaxSlotsPerPhase] = useState<number>(1);

  // Phase window rule state
  const [selectedTask, setSelectedTask] = useState('');
  const [allowedPhases, setAllowedPhases] = useState<number[]>([]);

  // Pattern match rule state
  const [regex, setRegex] = useState('');
  const [template, setTemplate] = useState('');
  const [parameters, setParameters] = useState('');

  // Precedence override rule state
  const [globalRules, setGlobalRules] = useState<string[]>([]);
  const [specificRules, setSpecificRules] = useState<string[]>([]);

  const getGroups = () => {
    const clientGroups = [...new Set(clients.map(c => c.GroupTag).filter(Boolean))];
    const workerGroups = [...new Set(workers.map(w => w.WorkerGroup).filter(Boolean))];
    return [...clientGroups, ...workerGroups];
  };

  const handleAddRule = () => {
    let newRule: Rule;

    switch (selectedType) {
      case 'coRun':
        if (selectedTasks.length < 2) {
          alert('Please select at least 2 tasks for co-run rule');
          return;
        }
        newRule = { type: 'coRun', tasks: selectedTasks };
        break;
      case 'slotRestriction':
        if (!selectedGroup || minSlots < 1) {
          alert('Please select a group and set minimum slots');
          return;
        }
        newRule = { type: 'slotRestriction', group: selectedGroup, minCommonSlots: minSlots };
        break;
      case 'loadLimit':
        if (!selectedGroup || maxSlotsPerPhase < 1) {
          alert('Please select a group and set maximum slots');
          return;
        }
        newRule = { type: 'loadLimit', group: selectedGroup, maxSlotsPerPhase };
        break;
      case 'phaseWindow':
        if (!selectedTask || allowedPhases.length === 0) {
          alert('Please select a task and allowed phases');
          return;
        }
        newRule = { type: 'phaseWindow', task: selectedTask, allowedPhases };
        break;
      case 'patternMatch':
        if (!regex || !template) {
          alert('Please provide regex pattern and template');
          return;
        }
        newRule = { 
          type: 'patternMatch', 
          regex, 
          template, 
          parameters: parameters ? JSON.parse(parameters) : {} 
        };
        break;
      case 'precedenceOverride':
        if (globalRules.length === 0 && specificRules.length === 0) {
          alert('Please specify at least one global or specific rule');
          return;
        }
        newRule = { type: 'precedenceOverride', globalRules, specificRules };
        break;
      default:
        alert('Please select a rule type');
        return;
    }

    const updatedRules = [...rules, newRule];
    setRules(updatedRules);
    onRulesChange(updatedRules);
    resetForm();
  };

  const handleDeleteRule = (idx: number) => {
    const updatedRules = rules.filter((_, i) => i !== idx);
    setRules(updatedRules);
    onRulesChange(updatedRules);
  };

  const resetForm = () => {
    setSelectedType('');
    setSelectedTasks([]);
    setSelectedGroup('');
    setMinSlots(1);
    setMaxSlotsPerPhase(1);
    setSelectedTask('');
    setAllowedPhases([]);
    setRegex('');
    setTemplate('');
    setParameters('');
    setGlobalRules([]);
    setSpecificRules([]);
  };

  const handleAddRuleFromNL = async () => {
    if (!nlInput.trim() || !onAddRuleFromNL) return;
    await onAddRuleFromNL(nlInput);
    setNlInput('');
  };

  const renderRuleForm = () => {
    switch (selectedType) {
      case 'coRun':
        return (
          <Box>
            <Typography variant="subtitle2" gutterBottom>Select tasks to run together:</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {tasks.map(task => (
                <Chip
                  key={task.TaskID}
                  label={task.TaskName}
                  onClick={() => setSelectedTasks(prev => 
                    prev.includes(task.TaskID) 
                      ? prev.filter(t => t !== task.TaskID)
                      : [...prev, task.TaskID]
                  )}
                  color={selectedTasks.includes(task.TaskID) ? 'primary' : 'default'}
                  variant={selectedTasks.includes(task.TaskID) ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
          </Box>
        );

      case 'slotRestriction':
        return (
          <Box>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Group</InputLabel>
              <Select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}>
                {getGroups().map(g => (
                  <MenuItem key={g} value={g}>{g}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Minimum Common Slots"
              type="number"
              value={minSlots}
              onChange={e => setMinSlots(Number(e.target.value))}
              inputProps={{ min: 1 }}
            />
          </Box>
        );

      case 'loadLimit':
        return (
          <Box>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Worker Group</InputLabel>
              <Select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}>
                {[...new Set(workers.map(w => w.WorkerGroup).filter(Boolean))].map(g => (
                  <MenuItem key={g} value={g}>{g}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Maximum Slots Per Phase"
              type="number"
              value={maxSlotsPerPhase}
              onChange={e => setMaxSlotsPerPhase(Number(e.target.value))}
              inputProps={{ min: 1 }}
            />
          </Box>
        );

      case 'phaseWindow':
        return (
          <Box>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Task</InputLabel>
              <Select value={selectedTask} onChange={e => setSelectedTask(e.target.value)}>
                {tasks.map(task => (
                  <MenuItem key={task.TaskID} value={task.TaskID}>{task.TaskName}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="subtitle2" gutterBottom>Allowed Phases:</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {[1, 2, 3, 4, 5, 6].map(phase => (
                <Chip
                  key={phase}
                  label={`Phase ${phase}`}
                  onClick={() => setAllowedPhases(prev => 
                    prev.includes(phase) 
                      ? prev.filter(p => p !== phase)
                      : [...prev, phase]
                  )}
                  color={allowedPhases.includes(phase) ? 'primary' : 'default'}
                  variant={allowedPhases.includes(phase) ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
          </Box>
        );

      case 'patternMatch':
        return (
          <Box>
            <TextField
              fullWidth
              label="Regex Pattern"
              value={regex}
              onChange={e => setRegex(e.target.value)}
              sx={{ mb: 2 }}
              placeholder="^T\d+$"
            />
            <TextField
              fullWidth
              label="Template"
              value={template}
              onChange={e => setTemplate(e.target.value)}
              sx={{ mb: 2 }}
              placeholder="coRun"
            />
            <TextField
              fullWidth
              label="Parameters (JSON)"
              value={parameters}
              onChange={e => setParameters(e.target.value)}
              placeholder='{"priority": 1}'
            />
          </Box>
        );

      case 'precedenceOverride':
        return (
          <Box>
            <Typography variant="subtitle2" gutterBottom>Global Rules (lower priority):</Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              value={globalRules.join('\n')}
              onChange={e => setGlobalRules(e.target.value.split('\n').filter(Boolean))}
              sx={{ mb: 2 }}
              placeholder="Enter rule IDs, one per line"
            />
            <Typography variant="subtitle2" gutterBottom>Specific Rules (higher priority):</Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              value={specificRules.join('\n')}
              onChange={e => setSpecificRules(e.target.value.split('\n').filter(Boolean))}
              placeholder="Enter rule IDs, one per line"
            />
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          🛠️ Business Rules Builder
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Define business rules that will guide the resource allocation process
        </Typography>

        {/* Natural Language Rule Input */}
        <Box sx={{ mb: 3, p: 2, backgroundColor: '#f8f9fa', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            🤖 Natural Language Rule Creation
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              placeholder="e.g., 'Tasks T001 and T002 must run together'"
              value={nlInput}
              onChange={e => setNlInput(e.target.value)}
              disabled={nlLoading}
            />
            <Button 
              variant="contained" 
              onClick={handleAddRuleFromNL}
              disabled={!nlInput.trim() || nlLoading}
            >
              {nlLoading ? 'Processing...' : 'Add Rule'}
            </Button>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Visual Rule Builder */}
        <Typography variant="subtitle1" gutterBottom>
          Visual Rule Builder
        </Typography>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Rule Type</InputLabel>
          <Select value={selectedType} onChange={e => setSelectedType(e.target.value)}>
            {RULE_TYPES.map(type => (
              <MenuItem key={type.value} value={type.value}>
                <Box>
                  <Typography variant="body2">{type.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{type.description}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedType && (
          <Box sx={{ mb: 2 }}>
            {renderRuleForm()}
            <Button 
              variant="contained" 
              onClick={handleAddRule}
              sx={{ mt: 2 }}
            >
              Add Rule
            </Button>
          </Box>
        )}

        {/* Existing Rules */}
        {rules.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Current Rules ({rules.length})
            </Typography>
            {rules.map((rule, idx) => (
              <Box 
                key={idx} 
                sx={{ 
                  p: 2, 
                  border: '1px solid #e0e0e0', 
                  borderRadius: 1, 
                  mb: 1,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Box>
                  <Typography variant="body2" fontWeight="bold">
                    {RULE_TYPES.find(t => t.value === rule.type)?.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {JSON.stringify(rule)}
                  </Typography>
                </Box>
                <IconButton onClick={() => handleDeleteRule(idx)} color="error" size="small">
                  🗑️
                </IconButton>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RuleBuilder; 