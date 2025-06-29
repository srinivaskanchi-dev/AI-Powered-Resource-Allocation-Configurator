import React, { useState } from 'react';
import FileUploader from '../components/FileUploader';
import DataGridEditable from '../components/DataGridEditable';
import NaturalLanguageSearch from '../components/NaturalLanguageSearch';
import AICorrectionPanel from '../components/AICorrectionPanel';
import AIRuleRecommendations from '../components/AIRuleRecommendations';
import { GridColDef, GridRowsProp } from '@mui/x-data-grid';
import { validateAllData, ValidationResult } from '../utils/validationUtils';
import RuleBuilder, { Rule } from '../components/RuleBuilder';
import PrioritizationSliders, { Weights } from '../components/PrioritizationSliders';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { Card, CardContent, Typography, Button, Box, Stack, Container, Divider } from '@mui/material';

const entityColumns: Record<string, GridColDef[]> = {
  clients: [
    { field: 'ClientID', headerName: 'Client ID', width: 120 },
    { field: 'ClientName', headerName: 'Client Name', width: 180 },
    { field: 'PriorityLevel', headerName: 'Priority Level', width: 130 },
    { field: 'RequestedTaskIDs', headerName: 'Requested Task IDs', width: 200 },
    { field: 'GroupTag', headerName: 'Group Tag', width: 150 },
    { field: 'AttributesJSON', headerName: 'Attributes JSON', width: 300 },
  ],
  workers: [
    { field: 'WorkerID', headerName: 'Worker ID', width: 120 },
    { field: 'WorkerName', headerName: 'Worker Name', width: 150 },
    { field: 'Skills', headerName: 'Skills', width: 200 },
    { field: 'AvailableSlots', headerName: 'Available Slots', width: 150 },
    { field: 'MaxLoadPerPhase', headerName: 'Max Load Per Phase', width: 150 },
    { field: 'WorkerGroup', headerName: 'Worker Group', width: 150 },
    { field: 'QualificationLevel', headerName: 'Qualification Level', width: 150 },
  ],
  tasks: [
    { field: 'TaskID', headerName: 'Task ID', width: 120 },
    { field: 'TaskName', headerName: 'Task Name', width: 200 },
    { field: 'Category', headerName: 'Category', width: 150 },
    { field: 'Duration', headerName: 'Duration', width: 130 },
    { field: 'RequiredSkills', headerName: 'Required Skills', width: 200 },
    { field: 'PreferredPhases', headerName: 'Preferred Phases', width: 150 },
    { field: 'MaxConcurrent', headerName: 'Max Concurrent', width: 130 },
  ],
};

function addRowIds(rows: any[], idField: string): GridRowsProp {
  return rows.map((row) => ({ ...row, id: row[idField] || Math.random().toString(36).slice(2) }));
}

const defaultWeights: Weights = {
  priority: 5,
  fulfillment: 5,
  fairness: 5,
  cost: 5,
  duration: 5,
  quality: 5,
  efficiency: 5,
};

const HomePage: React.FC = () => {
  const [clients, setClients] = useState<GridRowsProp>([]);
  const [workers, setWorkers] = useState<GridRowsProp>([]);
  const [tasks, setTasks] = useState<GridRowsProp>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filtered, setFiltered] = useState<{ clients: GridRowsProp; workers: GridRowsProp; tasks: GridRowsProp } | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [nlLoading, setNlLoading] = useState(false);
  const [weights, setWeights] = useState<Weights>(defaultWeights);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'error' | 'warning' | 'info' | 'success' }>({
    open: false,
    message: '',
    severity: 'error',
  });

  const handleDataParsed = (data: any[], fileType: 'clients' | 'workers' | 'tasks') => {
    if (fileType === 'clients') setClients(addRowIds(data, 'ClientID'));
    if (fileType === 'workers') setWorkers(addRowIds(data, 'WorkerID'));
    if (fileType === 'tasks') setTasks(addRowIds(data, 'TaskID'));
  };

  React.useEffect(() => {
    setValidation(validateAllData({
      clients: [...clients],
      workers: [...workers],
      tasks: [...tasks],
      rules: [...rules],
    }));
  }, [clients, workers, tasks, rules]);

  const handleSearch = async (query: string) => {
    setSearchLoading(true);
    try {
      const res = await fetch('/api/nl-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          clients,
          workers,
          tasks,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setFiltered({
          clients: addRowIds(data.clients, 'ClientID'),
          workers: addRowIds(data.workers, 'WorkerID'),
          tasks: addRowIds(data.tasks, 'TaskID'),
        });
      } else {
        // fallback: simple string match
        const filterRows = (rows: GridRowsProp) =>
          rows.filter(row => Object.values(row).some(val => String(val).toLowerCase().includes(query.toLowerCase())));
        setFiltered({
          clients: filterRows(clients),
          workers: filterRows(workers),
          tasks: filterRows(tasks),
        });
      }
    } catch (e) {
      // fallback: simple string match
      const filterRows = (rows: GridRowsProp) =>
        rows.filter(row => Object.values(row).some(val => String(val).toLowerCase().includes(query.toLowerCase())));
      setFiltered({
        clients: filterRows(clients),
        workers: filterRows(workers),
        tasks: filterRows(tasks),
      });
    }
    setSearchLoading(false);
  };

  const handleClearSearch = () => setFiltered(null);

  const showClients = filtered ? filtered.clients : clients;
  const showWorkers = filtered ? filtered.workers : workers;
  const showTasks = filtered ? filtered.tasks : tasks;

  const handleExportRules = () => {
    const exportObj = {
      rules,
      weights,
      metadata: {
        exportedAt: new Date().toISOString(),
        totalClients: clients.length,
        totalWorkers: workers.length,
        totalTasks: tasks.length,
        validationStatus: validation?.summary?.length === 0 ? 'clean' : 'has_errors',
      },
    };
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rules.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportData = () => {
    // Export cleaned CSV files
    const exportCSV = (data: GridRowsProp, filename: string) => {
      if (data.length === 0) return;
      
      const headers = Object.keys(data[0]).filter(key => key !== 'id');
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    };

    exportCSV(clients, 'clients_cleaned.csv');
    exportCSV(workers, 'workers_cleaned.csv');
    exportCSV(tasks, 'tasks_cleaned.csv');
    
    setSnackbar({ 
      open: true, 
      message: 'Data exported successfully! Check your downloads folder.', 
      severity: 'success' 
    });
  };

  const handleAddRule = (rule: any) => {
    setRules(prev => [...prev, rule]);
  };

  const handleAddRuleFromNL = async (description: string) => {
    setNlLoading(true);
    try {
      const res = await fetch('/api/nl-rule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          clients: [...clients],
          workers: [...workers],
          tasks: [...tasks],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.rule) {
          setRules(prev => [...prev, data.rule]);
        }
      } else {
        setSnackbar({ open: true, message: 'Could not parse rule from AI response.', severity: 'error' });
      }
    } catch (e) {
      setSnackbar({ open: true, message: 'Error calling AI for rule.', severity: 'error' });
    }
    setNlLoading(false);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom>Data Alchemist: Resource-Allocation Configurator</Typography>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} mb={2}>
            <FileUploader label="Upload Clients" fileType="clients" onDataParsed={handleDataParsed} />
            <FileUploader label="Upload Workers" fileType="workers" onDataParsed={handleDataParsed} />
            <FileUploader label="Upload Tasks" fileType="tasks" onDataParsed={handleDataParsed} />
          </Stack>
        </CardContent>
      </Card>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <NaturalLanguageSearch onSearch={handleSearch} loading={searchLoading} />
          {filtered && (
            <Button variant="outlined" color="secondary" onClick={handleClearSearch} sx={{ mb: 2 }}>Clear Search</Button>
          )}
        </CardContent>
      </Card>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <RuleBuilder
            tasks={[...tasks]}
            workers={[...workers]}
            clients={[...clients]}
            onRulesChange={setRules}
            onAddRuleFromNL={handleAddRuleFromNL}
            nlLoading={nlLoading}
          />
        </CardContent>
      </Card>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <PrioritizationSliders weights={weights} onChange={setWeights} />
        </CardContent>
      </Card>

      {/* AI-Powered Features */}
      <AICorrectionPanel
        validation={validation}
        clients={clients}
        workers={workers}
        tasks={tasks}
        onClientsChange={setClients}
        onWorkersChange={setWorkers}
        onTasksChange={setTasks}
      />

      <AIRuleRecommendations
        clients={clients}
        workers={workers}
        tasks={tasks}
        existingRules={rules}
        onAddRule={handleAddRule}
      />

      {/* Export Section */}
      <Card sx={{ mb: 3, background: '#f8f9fa' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📤 Export Cleaned Data & Rules
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Export your validated and cleaned data along with business rules for the next stage.
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleExportData}
              disabled={clients.length === 0 && workers.length === 0 && tasks.length === 0}
            >
              Export Data as CSV
            </Button>
            <Button 
              variant="contained" 
              color="secondary" 
              onClick={handleExportRules}
              disabled={rules.length === 0}
            >
              Export Rules as JSON
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Data Grids */}
      {showClients.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>Clients</Typography>
            <DataGridEditable
              columns={entityColumns.clients}
              rows={showClients}
              onRowsChange={setClients}
              errors={validation?.errors.clients}
            />
          </CardContent>
        </Card>
      )}
      {showWorkers.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>Workers</Typography>
            <DataGridEditable
              columns={entityColumns.workers}
              rows={showWorkers}
              onRowsChange={setWorkers}
              errors={validation?.errors.workers}
            />
          </CardContent>
        </Card>
      )}
      {showTasks.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>Tasks</Typography>
            <DataGridEditable
              columns={entityColumns.tasks}
              rows={showTasks}
              onRowsChange={setTasks}
              errors={validation?.errors.tasks}
            />
          </CardContent>
        </Card>
      )}

      {/* Enhanced Validation Summary */}
      {validation && (validation.summary.length > 0 || validation.suggestions.length > 0) && (
        <Card sx={{ mb: 3, background: '#fffbe6', border: '1px solid #ffe58f' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Validation Summary</Typography>
            {validation.summary.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="error" gutterBottom>
                  Issues Found ({validation.summary.length}):
                </Typography>
                <ul>
                  {validation.summary.map((msg, i) => <li key={i}>{msg}</li>)}
                </ul>
              </Box>
            )}
            {validation.suggestions.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Suggestions ({validation.suggestions.length}):
                </Typography>
                <ul>
                  {validation.suggestions.map((msg, i) => <li key={i}>{msg}</li>)}
                </ul>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default HomePage;
