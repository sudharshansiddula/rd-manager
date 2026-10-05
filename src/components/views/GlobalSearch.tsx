import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Phone, ArrowRight } from 'lucide-react';
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

  const results = query.length >= 2 
    ? members.filter(m => 
        m.name.toLowerCase().includes(query.toLowerCase()) || 
        m.memberNumber.toLowerCase().includes(query.toLowerCase()) ||
        (m.mobile && m.mobile.includes(query))
      ).slice(0, 5) // Limit to top 5 results for speed
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
      <div style={{ position: 'relative' }}>
        <Search size={18} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '10px' }} />
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
            padding: '10px 12px 10px 40px',
            border: '1px solid #e5e7eb',
            borderRadius: '20px',
            fontSize: '14px',
            outline: 'none',
            background: '#f9fafb',
            transition: 'all 0.3s'
          }}
          className="global-search-input"
        />
      </div>

      {isOpen && query.length >= 2 && (
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
          overflow: 'hidden'
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
                    <span style={{ fontSize: '11px', background: '#e0e7ff', color: '#4f46e5', padding: '2px 6px', borderRadius: '4px' }}>
                      #{member.memberNumber}
                    </span>
                  </div>
                  {member.mobile && (
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={12} /> {member.mobile}
                    </div>
                  )}
                </div>
                <ArrowRight size={16} color="#9ca3af" />
              </div>
            ))
          ) : (
            <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
};
