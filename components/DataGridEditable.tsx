import React from 'react';
import { DataGrid, GridColDef, GridRowsProp, GridCellParams } from '@mui/x-data-grid';

interface DataGridEditableProps {
  columns: GridColDef[];
  rows: GridRowsProp;
  onRowsChange: (rows: GridRowsProp) => void;
  errors?: { [rowId: string]: { [field: string]: string } };
}

const DataGridEditable: React.FC<DataGridEditableProps> = ({ columns, rows, onRowsChange, errors }) => {
  const getCellClassName = (params: GridCellParams) => {
    const rowErrors = errors?.[params.row.id];
    if (rowErrors && rowErrors[params.field]) {
      return 'error-cell';
    }
    return '';
  };

  const getCellTooltip = (params: GridCellParams) => {
    const rowErrors = errors?.[params.row.id];
    if (rowErrors && rowErrors[params.field]) {
      return rowErrors[params.field];
    }
    return '';
  };

  const enhancedColumns = columns.map(col => ({
    ...col,
    editable: true,
    cellClassName: getCellClassName,
    renderCell: (params: GridCellParams) => (
      <div 
        title={getCellTooltip(params)}
        style={{ 
          width: '100%', 
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {params.value}
      </div>
    )
  }));

  return (
    <div style={{ height: 400, width: '100%' }}>
      <style jsx>{`
        .error-cell {
          background-color: #ffebee !important;
          border: 2px solid #f44336 !important;
        }
        .error-cell:hover {
          background-color: #ffcdd2 !important;
        }
        .MuiDataGrid-root {
          overflow: visible !important;
        }
        .MuiDataGrid-virtualScroller {
          scrollbar-width: thin;
          scrollbar-color: #888 #f1f1f1;
        }
        .MuiDataGrid-virtualScroller::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .MuiDataGrid-virtualScroller::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        .MuiDataGrid-virtualScroller::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }
        .MuiDataGrid-virtualScroller::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
      <DataGrid
        rows={rows}
        columns={enhancedColumns}
        processRowUpdate={(updatedRow) => {
          const updatedRows = rows.map(row => 
            row.id === updatedRow.id ? { ...row, ...updatedRow } : row
          );
          onRowsChange(updatedRows);
          return updatedRow;
        }}
        disableSelectionOnClick
        density="compact"
        pageSize={10}
        rowsPerPageOptions={[5, 10, 25]}
        checkboxSelection
        disableColumnMenu
        autoHeight={false}
        scrollbarSize={20}
        sx={{
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid #e0e0e0',
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#f5f5f5',
            borderBottom: '2px solid #e0e0e0',
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: '#f8f9fa',
          },
          '& .MuiDataGrid-virtualScrollerContent': {
            minWidth: '100%',
          },
          '& .MuiDataGrid-virtualScrollerRenderZone': {
            minWidth: '100%',
          },
          '& .MuiDataGrid-root': {
            overflow: 'visible',
          },
        }}
      />
    </div>
  );
};

export default DataGridEditable; 