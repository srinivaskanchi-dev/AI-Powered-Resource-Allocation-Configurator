import React from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface FileUploaderProps {
  label: string;
  onDataParsed: (data: any[], fileType: 'clients' | 'workers' | 'tasks') => void;
  fileType: 'clients' | 'workers' | 'tasks';
}

const FileUploader: React.FC<FileUploaderProps> = ({ label, onDataParsed, fileType }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          onDataParsed(results.data, fileType);
        },
      });
    } else if (fileName.endsWith('.xlsx')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        onDataParsed(jsonData, fileType);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('Unsupported file type. Please upload a CSV or XLSX file.');
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontWeight: 'bold' }}>{label}: </label>
      <input type="file" accept=".csv,.xlsx" onChange={handleFileChange} />
    </div>
  );
};

export default FileUploader; 