type Entity = 'clients' | 'workers' | 'tasks';

export interface ValidationResult {
  errors: {
    [entity in Entity]: {
      [rowId: string]: { [field: string]: string };
    };
  };
  summary: string[];
  suggestions: string[];
}

interface ValidateAllDataArgs {
  clients: any[];
  workers: any[];
  tasks: any[];
  rules?: any[];
}

const requiredColumns: Record<Entity, string[]> = {
  clients: ['ClientID', 'ClientName', 'PriorityLevel', 'RequestedTaskIDs', 'GroupTag', 'AttributesJSON'],
  workers: ['WorkerID', 'WorkerName', 'Skills', 'AvailableSlots', 'MaxLoadPerPhase', 'WorkerGroup', 'QualificationLevel'],
  tasks: ['TaskID', 'TaskName', 'Category', 'Duration', 'RequiredSkills', 'PreferredPhases', 'MaxConcurrent'],
};

export function validateAllData({ clients, workers, tasks, rules = [] }: ValidateAllDataArgs): ValidationResult {
  const errors: ValidationResult['errors'] = {
    clients: {},
    workers: {},
    tasks: {},
  };
  const summary: string[] = [];
  const suggestions: string[] = [];

  function checkMissingColumns(entity: Entity, rows: any[]) {
    if (rows.length === 0) return;
    const required = requiredColumns[entity];
    const actual = Object.keys(rows[0]);
    const missing = required.filter(col => !actual.includes(col));
    if (missing.length > 0) {
      summary.push(`${entity}: Missing required columns: ${missing.join(', ')}`);
      rows.forEach((row, idx) => {
        errors[entity][row.id || idx] = errors[entity][row.id || idx] || {};
        missing.forEach(col => {
          errors[entity][row.id || idx][col] = 'Required column missing';
        });
      });
    }
  }

  function checkDuplicateIds(entity: Entity, rows: any[], idField: string) {
    const ids = new Map<string, number[]>();
    rows.forEach((row, idx) => {
      const id = row[idField];
      if (id) {
        if (!ids.has(id)) ids.set(id, []);
        ids.get(id)!.push(idx);
      }
    });
    ids.forEach((indices, id) => {
      if (indices.length > 1) {
        summary.push(`${entity}: Duplicate ${idField} '${id}' found in rows ${indices.map(i => i + 1).join(', ')}`);
        indices.forEach(idx => {
          errors[entity][rows[idx].id || idx] = errors[entity][rows[idx].id || idx] || {};
          errors[entity][rows[idx].id || idx][idField] = `Duplicate ${idField}: ${id}`;
        });
      }
    });
  }

  function checkMalformedLists(entity: Entity, rows: any[], field: string, numeric = false) {
    rows.forEach((row, idx) => {
      const value = row[field];
      if (!value) return;
      
      let list: string[] = [];
      try {
        if (typeof value === 'string' && value.trim().startsWith('[')) {
          list = JSON.parse(value);
        } else {
          list = value.split(',').map((s: string) => s.trim());
        }
      } catch {
        errors[entity][row.id || idx] = errors[entity][row.id || idx] || {};
        errors[entity][row.id || idx][field] = `Invalid list format`;
        summary.push(`${entity}: Row ${idx + 1} has malformed list in ${field}`);
        return;
      }
      
      if (numeric) {
        const invalidItems = list.filter((item: string) => !/^\d+$/.test(item));
        if (invalidItems.length > 0) {
          errors[entity][row.id || idx] = errors[entity][row.id || idx] || {};
          errors[entity][row.id || idx][field] = `Non-numeric values: ${invalidItems.join(', ')}`;
          summary.push(`${entity}: Row ${idx + 1} has non-numeric values in ${field}: ${invalidItems.join(', ')}`);
        }
      }
    });
  }

  function checkOutOfRange(entity: Entity, rows: any[], field: string, min: number, max: number) {
    rows.forEach((row, idx) => {
      const value = row[field];
      if (value === undefined || value === null || value === '') return;
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < min || numValue > max) {
        errors[entity][row.id || idx] = errors[entity][row.id || idx] || {};
        errors[entity][row.id || idx][field] = `Value must be between ${min} and ${max}`;
        summary.push(`${entity}: Row ${idx + 1} ${field} value ${value} is out of range [${min}, ${max}]`);
      }
    });
  }

  function checkJSONFormat(entity: Entity, rows: any[], field: string) {
    rows.forEach((row, idx) => {
      const value = row[field];
      if (!value) return;
      
      try {
        JSON.parse(value);
      } catch {
        errors[entity][row.id || idx] = errors[entity][row.id || idx] || {};
        errors[entity][row.id || idx][field] = 'Invalid JSON format';
        summary.push(`${entity}: Row ${idx + 1} has invalid JSON in ${field}`);
      }
    });
  }

  function checkCircularCoRuns(rules: any[]) {
    const coRunRules = rules.filter(r => r.type === 'coRun');
    const graph: Record<string, string[]> = {};
    
    coRunRules.forEach(rule => {
      rule.tasks.forEach((task: string) => {
        if (!graph[task]) graph[task] = [];
        rule.tasks.forEach((otherTask: string) => {
          if (task !== otherTask && !graph[task].includes(otherTask)) {
            graph[task].push(otherTask);
          }
        });
      });
    });

    const visited = new Set<string>();
    const recStack = new Set<string>();

    function hasCycle(task: string): boolean {
      if (recStack.has(task)) return true;
      if (visited.has(task)) return false;
      
      visited.add(task);
      recStack.add(task);
      
      for (const neighbor of graph[task] || []) {
        if (hasCycle(neighbor)) return true;
      }
      
      recStack.delete(task);
      return false;
    }

    for (const task of Object.keys(graph)) {
      if (!visited.has(task) && hasCycle(task)) {
        summary.push(`Circular co-run dependency detected involving task ${task}`);
        suggestions.push('Review co-run rules to eliminate circular dependencies');
        break;
      }
    }
  }

  function checkPhaseSlotSaturation() {
    const phaseSlots: Record<number, { total: number; used: number }> = {};
    
    // Calculate total available slots per phase
    workers.forEach(worker => {
      let slots: number[] = [];
      try {
        slots = typeof worker.AvailableSlots === 'string' && worker.AvailableSlots.trim().startsWith('[')
          ? JSON.parse(worker.AvailableSlots)
          : worker.AvailableSlots.split(',').map((s: string) => parseInt(s.trim()));
      } catch {
        return;
      }
      
      slots.forEach(phase => {
        if (!phaseSlots[phase]) phaseSlots[phase] = { total: 0, used: 0 };
        phaseSlots[phase].total += worker.MaxLoadPerPhase || 1;
      });
    });

    // Calculate used slots per phase
    tasks.forEach(task => {
      let phases: number[] = [];
      try {
        phases = typeof task.PreferredPhases === 'string' && task.PreferredPhases.trim().startsWith('[')
          ? JSON.parse(task.PreferredPhases)
          : task.PreferredPhases.split(',').map((s: string) => parseInt(s.trim()));
      } catch {
        return;
      }
      
      phases.forEach(phase => {
        if (phaseSlots[phase]) {
          phaseSlots[phase].used += task.Duration || 1;
        }
      });
    });

    Object.entries(phaseSlots).forEach(([phase, slots]) => {
      if (slots.used > slots.total) {
        summary.push(`Phase ${phase} is oversaturated: ${slots.used} slots needed, ${slots.total} available`);
        suggestions.push(`Consider reducing task durations or adding more workers for phase ${phase}`);
      }
    });
  }

  function checkOverloadedWorkers() {
    workers.forEach((worker, idx) => {
      let availableSlots: number[] = [];
      try {
        availableSlots = typeof worker.AvailableSlots === 'string' && worker.AvailableSlots.trim().startsWith('[')
          ? JSON.parse(worker.AvailableSlots)
          : worker.AvailableSlots.split(',').map((s: string) => parseInt(s.trim()));
      } catch {
        return;
      }
      
      if (availableSlots.length < (worker.MaxLoadPerPhase || 1)) {
        errors.workers[worker.id || idx] = errors.workers[worker.id || idx] || {};
        errors.workers[worker.id || idx]['MaxLoadPerPhase'] = `Max load (${worker.MaxLoadPerPhase}) exceeds available slots (${availableSlots.length})`;
        summary.push(`workers: Row ${idx + 1} worker is overloaded`);
      }
    });
  }

  function checkMaxConcurrencyFeasibility() {
    tasks.forEach((task, idx) => {
      const requiredSkills = task.RequiredSkills;
      if (!requiredSkills) return;
      
      let skills: string[] = [];
      try {
        skills = typeof requiredSkills === 'string' && requiredSkills.trim().startsWith('[')
          ? JSON.parse(requiredSkills)
          : requiredSkills.split(',').map((s: string) => s.trim());
      } catch {
        return;
      }
      
      const qualifiedWorkers = workers.filter(worker => {
        let workerSkills: string[] = [];
        try {
          workerSkills = typeof worker.Skills === 'string' && worker.Skills.trim().startsWith('[')
            ? JSON.parse(worker.Skills)
            : worker.Skills.split(',').map((s: string) => s.trim());
        } catch {
          return false;
        }
        return skills.some(skill => workerSkills.includes(skill));
      });
      
      if (qualifiedWorkers.length < (task.MaxConcurrent || 1)) {
        errors.tasks[task.id || idx] = errors.tasks[task.id || idx] || {};
        errors.tasks[task.id || idx]['MaxConcurrent'] = `Max concurrent (${task.MaxConcurrent}) exceeds qualified workers (${qualifiedWorkers.length})`;
        summary.push(`tasks: Row ${idx + 1} max concurrency not feasible`);
      }
    });
  }

  // --- Core validations ---
  checkMissingColumns('clients', clients);
  checkDuplicateIds('clients', clients, 'ClientID');
  checkOutOfRange('clients', clients, 'PriorityLevel', 1, 5);
  checkMalformedLists('clients', clients, 'RequestedTaskIDs');
  checkJSONFormat('clients', clients, 'AttributesJSON');

  checkMissingColumns('workers', workers);
  checkDuplicateIds('workers', workers, 'WorkerID');
  checkMalformedLists('workers', workers, 'Skills');
  checkMalformedLists('workers', workers, 'AvailableSlots', true);
  checkOutOfRange('workers', workers, 'MaxLoadPerPhase', 1, 10);
  checkOverloadedWorkers();

  checkMissingColumns('tasks', tasks);
  checkDuplicateIds('tasks', tasks, 'TaskID');
  checkMalformedLists('tasks', tasks, 'RequiredSkills');
  checkMalformedLists('tasks', tasks, 'PreferredPhases', true);
  checkOutOfRange('tasks', tasks, 'Duration', 1, 100);
  checkOutOfRange('tasks', tasks, 'MaxConcurrent', 1, 10);
  checkMaxConcurrencyFeasibility();

  // --- Cross-entity validations ---
  // 1. RequestedTaskIDs in clients must exist in tasks
  const taskIds = new Set(tasks.map((t) => t.TaskID));
  clients.forEach((client, idx) => {
    const requestedTasks = client.RequestedTaskIDs;
    if (requestedTasks) {
      let taskList: string[] = [];
      try {
        taskList = typeof requestedTasks === 'string' && requestedTasks.trim().startsWith('[')
          ? JSON.parse(requestedTasks)
          : requestedTasks.split(',');
      } catch {
        // Already handled by malformed list check
      }
      taskList.forEach((taskId: string) => {
        if (taskId && !taskIds.has(taskId.trim())) {
          errors.clients[client.id || idx] = errors.clients[client.id || idx] || {};
          errors.clients[client.id || idx]['RequestedTaskIDs'] = `Unknown task ID: ${taskId}`;
          summary.push(`clients: Row ${idx + 1} requests unknown task '${taskId}'`);
        }
      });
    }
  });

  // 2. Skill coverage: every RequiredSkill in tasks must be present in at least one worker's Skills
  const allWorkerSkills = new Set(
    workers.flatMap((w) => {
      const s = w.Skills;
      if (!s) return [];
      try {
        return typeof s === 'string' && s.trim().startsWith('[')
          ? JSON.parse(s)
          : s.split(',');
      } catch {
        return [];
      }
    }).map((skill: string) => skill.trim())
  );
  tasks.forEach((task, idx) => {
    const reqSkills = task.RequiredSkills;
    if (reqSkills) {
      let skills: string[] = [];
      try {
        skills = typeof reqSkills === 'string' && reqSkills.trim().startsWith('[')
          ? JSON.parse(reqSkills)
          : reqSkills.split(',');
      } catch {
        // Already handled by malformed list check
      }
      skills.forEach((skill: string) => {
        if (skill && !allWorkerSkills.has(skill.trim())) {
          errors.tasks[task.id || idx] = errors.tasks[task.id || idx] || {};
          errors.tasks[task.id || idx]['RequiredSkills'] =
            (errors.tasks[task.id || idx]['RequiredSkills'] || '') + ` No worker with skill: ${skill}`;
          summary.push(`tasks: Row ${idx + 1} requires skill '${skill}' not found in any worker`);
        }
      });
    }
  });

  // --- Advanced validations ---
  checkCircularCoRuns(rules);
  checkPhaseSlotSaturation();

  return { errors, summary, suggestions };
} 