import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Phone, ArrowRight, X } from 'lucide-react';
import { StorageService, storageEvents } from '../../engine/storage';
import type { Member } from '../../types';
import { useI18n } from '../../locales/i18n';

export const GlobalSearch = () => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = () => setMembers(StorageService.getMembers());
    load();
    storageEvents.addEventListener('db_updated', load);
    return () => storageEvents.removeEventListener('db_updated', load);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const trimmedQuery = query.trim().toLowerCase();
  const results = trimmedQuery.length >= 1 
    ? members.filter(m => 
        m.name.toLowerCase().includes(trimmedQuery) || 
        m.memberNumber.toLowerCase().includes(trimmedQuery) ||
        (m.mobile && m.mobile.toLowerCase().includes(trimmedQuery))
      ).sort((a, b) => {
        const aExact = a.memberNumber.toLowerCase() === trimmedQuery;
        const bExact = b.memberNumber.toLowerCase() === trimmedQuery;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        const aStarts = a.memberNumber.toLowerCase().startsWith(trimmedQuery);
        const bStarts = b.memberNumber.toLowerCase().startsWith(trimmedQuery);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
      }).slice(0, 8)
    : [];

  const handleSelect = (member: Member) => {
    setIsOpen(false);
    setQuery('');
    
    // Dispatch custom event to navigate to members view and open member profile
    window.dispatchEvent(new CustomEvent('app-navigate', { 
      detail: { view: 'members', memberId: member.id } 
    }));
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '300px', marginLeft: 'auto' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search size={18} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          type="text"
          placeholder={t('searchHint') || "Global search..."}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          style={{
            width: '100%',
            padding: '10px 36px 10px 38px',
            border: '1px solid #e5e7eb',
            borderRadius: '20px',
            fontSize: `calc(14px * var(--text-scale, 1))`,
            outline: 'none',
            background: '#f9fafb',
            transition: 'all 0.3s'
          }}
          className="global-search-input"
        />
        {query && (
          <X 
            size={16} 
            color="#9ca3af" 
            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
          />
        )}
      </div>

      {isOpen && trimmedQuery.length >= 1 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          marginTop: '8px',
          left: 0,
          right: 0,
          background: '#fff',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
          zIndex: 1000,
          overflow: 'hidden',
          maxHeight: '360px',
          overflowY: 'auto'
        }}>
          {results.length > 0 ? (
            results.map(member => (
              <div 
                key={member.id}
                onClick={() => handleSelect(member)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #f3f4f6',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'background 0.2s'
                }}
                className="global-search-result"
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={14} color="#6366f1" /> {member.name} 
                    <span style={{ fontSize: `calc(11px * var(--text-scale, 1))`, background: '#e0e7ff', color: '#4f46e5', padding: '2px 6px', borderRadius: '4px' }}>
                      #{member.memberNumber}
                    </span>
                  </div>
                  {member.mobile && (
                    <div style={{ fontSize: `calc(12px * var(--text-scale, 1))`, color: '#6b7280', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={12} /> {member.mobile}
                    </div>
                  )}
                </div>
                <ArrowRight size={16} color="#9ca3af" />
              </div>
            ))
          ) : (
            <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280', fontSize: `calc(14px * var(--text-scale, 1))` }}>
              {t('noData') || "No results found"}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

