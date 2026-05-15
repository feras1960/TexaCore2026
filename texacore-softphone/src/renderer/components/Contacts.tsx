import React, { useState } from 'react';
import { useContacts } from '../hooks/useContacts';

export default function Contacts({ onCall }: { onCall: (number: string) => void }) {
  const { contacts, loading } = useContacts();
  const [search, setSearch] = useState('');

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search) || c.mobile.includes(search)
  );

  return (
    <div className="contacts-container">
      <div className="contacts-search">
        <input 
          type="text" 
          placeholder="ابحث عن اسم أو رقم..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          dir="rtl"
        />
        <span className="search-icon">🔍</span>
      </div>

      <div className="contacts-list">
        {loading ? (
          <div className="loading-state">جاري تحميل جهات الاتصال...</div>
        ) : filteredContacts.length === 0 ? (
          <div className="empty-state">{search ? 'لا توجد نتائج' : 'لا توجد جهات اتصال'}</div>
        ) : (
          filteredContacts.map(contact => (
            <div key={contact.id} className="contact-item" onClick={() => onCall(contact.mobile || contact.phone)}>
              <div className="contact-avatar">
                {contact.name.charAt(0)}
              </div>
              <div className="contact-details">
                <div className="contact-name">{contact.name} <span className="contact-type">{contact.type}</span></div>
                <div className="contact-phones">
                  {contact.mobile && <span className="contact-phone" dir="ltr">📱 {contact.mobile}</span>}
                  {contact.phone && <span className="contact-phone" dir="ltr">📞 {contact.phone}</span>}
                </div>
              </div>
              <div className="contact-call-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
