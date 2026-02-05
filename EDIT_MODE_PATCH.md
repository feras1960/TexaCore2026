# Manual Changes Required for Edit Mode

## 1. Update NewJournalEntrySheet.tsx (Lines 219-246)

Replace the four JournalEntryForm components with these versions that include edit props:

```typescript
            <JournalEntryForm
              isActive={activeTab === 'journal'}
              onDirtyChange={setJournalDirty}
              onSave={handleClose}
              onCancel={handleClose}
              onVoucherNoChange={setCurrentVoucherNo}
              editMode={editMode}
              entryId={entryId}
              onUpdate={onUpdate}
            />
            <JournalEntryForm
              isActive={activeTab === 'cash'}
              onDirtyChange={setCashDirty}
              onSave={handleClose}
              onCancel={handleClose}
              onVoucherNoChange={setCurrentVoucherNo}
              editMode={editMode}
              entryId={entryId}
              onUpdate={onUpdate}
            />
            <JournalEntryForm
              isActive={activeTab === 'receipt'}
              onDirtyChange={setReceiptDirty}
              onSave={handleClose}
              onCancel={handleClose}
              onVoucherNoChange={setCurrentVoucherNo}
              editMode={editMode}
              entryId={entryId}
              onUpdate={onUpdate}
            />
            <JournalEntryForm
              isActive={activeTab === 'payment'}
              onDirtyChange={setPaymentDirty}
              onSave={handleClose}
              onCancel={handleClose}
              onVoucherNoChange={setCurrentVoucherNo}
              editMode={editMode}
              entryId={entryId}
              onUpdate={onUpdate}
            />
```

## 2. Update JournalEntries.tsx handleViewDetails (Lines 436-473)

Replace the entire `handleViewDetails` function with:

```typescript
  const handleViewDetails = (entry: any) => {
    // Open entry in edit mode
    setEditEntryId(entry.id);
    setIsEditMode(true);
    setIsNewEntryOpen(true);
  };
```

## 3. Update JournalEntries.tsx NewJournalEntrySheet component (around line 950)

Find the `<NewJournalEntrySheet` component and add edit props:

```typescript
      <NewJournalEntrySheet
        open={isNewEntryOpen}
        onOpenChange={(open) => {
          setIsNewEntryOpen(open);
          if (!open) {
            setIsEditMode(false);
            setEditEntryId(null);
          }
        }}
        defaultTab={defaultTab}
        editMode={isEditMode}
        entryId={editEntryId}
        onUpdate={() => {
          // Refresh entries list after update
          window.location.reload(); // Simple refresh for now
        }}
      />
```

## 4. Update handleRefresh callback

Add a refresh function:

```typescript
  const handleRefresh = () => {
    // Trigger re-fetch of entries
    setEntries([]);
    // The useEffect will automatically refetch
  };
```

Then use this in onUpdate:

```typescript
        onUpdate={handleRefresh}
```
