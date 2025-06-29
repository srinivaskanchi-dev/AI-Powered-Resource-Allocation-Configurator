import React, { useState } from 'react';

interface NaturalLanguageSearchProps {
  onSearch: (query: string) => void;
  loading?: boolean;
}

const NaturalLanguageSearch: React.FC<NaturalLanguageSearchProps> = ({ onSearch, loading }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search with natural language..."
        style={{ flex: 1, padding: 8, fontSize: 16 }}
        disabled={loading}
      />
      <button type="submit" disabled={loading || !query.trim()} style={{ padding: '8px 16px', fontSize: 16 }}>
        {loading ? 'Searching...' : 'Search'}
      </button>
    </form>
  );
};

export default NaturalLanguageSearch; 