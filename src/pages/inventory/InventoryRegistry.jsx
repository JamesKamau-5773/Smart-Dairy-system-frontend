import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Search, Plus, Filter, Edit2, Package, Trash2, ChevronDown, MoreVertical, Archive, ArchiveRestore, MinusCircle, ClipboardCheck } from 'lucide-react';
import AlertBanner from '../../components/ui/AlertBanner';
import Confirmation, { useConfirmation } from '../../components/ui/Confirmation';
import RegisterResourceModal from '../../components/inventory/RegisterResourceModal';
import StandardDeliveryModal from '../../components/inventory/StandardDeliveryModal';
import EditResourceModal from '../../components/inventory/EditResourceModal';
import StockOutModal from '../../components/inventory/StockOutModal';
import StockCountModal from '../../components/inventory/StockCountModal';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import DataWarningList from '../../components/inventory/DataWarningList';
import { inventoryApi } from '../../lib/backendApi';
import { getApiErrorBody, getApiErrorCode } from '../../lib/apiErrors';
import { getFeedErrorMessage } from '../../lib/feedErrors';
import { getDataWarnings, isArchived } from '../../lib/inventoryItemRules';
import { buildRestockMovement } from '../../lib/restockForm';
import { buildStockOutMovement, isWriteOff } from '../../lib/stockChangeForm';
import { isQueuedOffline, QUEUED_OFFLINE_MESSAGE } from '../../lib/offlinePolicy';
import { canManageInventoryItems } from '../../lib/permissions';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../hooks/useTenant';
import { useInventoryItemActions } from '../../hooks/useInventoryItemActions';
import { feedCopy } from '../../i18n/feed.en';
import { tone } from '../../components/ui/tones';
import { CardSkeletons, ListLoadNotices, TableSkeletonRows } from '../../components/ui/ListLoadState';
import { getListLoadState, hasRowsToShow } from '../../lib/listLoadState';

const { item: itemCopy, restock: restockCopy, stockOut: stockOutCopy, stockCount: stockCountCopy } = feedCopy;

const TABLE_COLUMNS = 5;

/** "220 kg"; "—" when the backend sent no stock figure (never shown as 0). */
const isKnown = (value) => value !== null && value !== undefined && value !== '';

const formatStock = (stock) => (isKnown(stock?.value) ? `${stock.value} ${stock.unit || 'units'}` : '—');

/**
 * 'LOW' | 'OK' from the backend's flag; null (no chip) when the status can't be known.
 * TODO(BR-003): the item list should carry `is_low_stock`; drop the comparison then.
 */
const getItemStatus = (item) => {
  if (typeof item.is_low_stock === 'boolean') return item.is_low_stock ? 'LOW' : 'OK';
  if (!isKnown(item.stock?.value) || !isKnown(item.reorderLevel)) return null;
  return Number(item.stock.value) <= Number(item.reorderLevel) ? 'LOW' : 'OK';
};

const STOCK_STATUS = {
  LOW: { label: 'Low – reorder', tone: 'attention' },
  OK: { label: 'In stock', tone: 'neutral' },
};

function StockStatusChip({ status }) {
  if (!status) return null;
  const { label, tone: toneName } = STOCK_STATUS[status];
  return <span className={`inline-flex shrink-0 rounded-badge px-2 py-0.5 text-xs font-semibold ${tone(toneName).chip}`}>{label}</span>;
}

export default function InventoryRegistry() {
  const queryClient = useQueryClient();
  const { tenantId, farmId } = useTenant();
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  // The category filter lives in the address, so Feeding → Ingredients can open it
  // pre-filtered and the back button, reloads and shared links keep it.
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFilter = searchParams.get('category') || 'All';
  const setCategoryFilter = (category) => setSearchParams((current) => {
    const next = new URLSearchParams(current);
    if (category === 'All') next.delete('category');
    else next.set('category', category);
    return next;
  }, { replace: true });
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  // { kind: 'out' | 'count', item } while a stock change dialog is open.
  const [stockDialog, setStockDialog] = useState(null);
  const confirmation = useConfirmation();
  const { currentUser } = useAuth();
  const canManageItems = canManageInventoryItems(currentUser);
  const itemActions = useInventoryItemActions();

  // The archived flag is part of the key, so both lists are cached and the
  // shared ['inventory-items', tenant, farm] prefix still invalidates them together.
  const inventoryQuery = useQuery({
    queryKey: ['inventory-items', tenantId, farmId, { includeArchived: showArchived }],
    queryFn: () => inventoryApi.listItems({ includeArchived: showArchived }),
    enabled: !!tenantId && !!farmId,
  });
  const backendInventory = inventoryQuery.data;
  const inventoryLoadState = getListLoadState(inventoryQuery);

  const showFailure = (error, fallback) => {
    setErrorMessage(getFeedErrorMessage(error, fallback));
    setShowError(true);
  };

  // Every change goes through the server and then a refetch; the list is small,
  // and it keeps archived/warning state exactly as the backend computed it.
  const refreshInventory = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['inventory-items', tenantId, farmId] }),
    queryClient.invalidateQueries({ queryKey: ['inventory-stock', tenantId, farmId] }),
    queryClient.invalidateQueries({ queryKey: ['inventory-movements', tenantId, farmId] }),
  ]);

  const createItemMutation = useMutation({
    mutationFn: (payload) => inventoryApi.createItem(payload),
    onSuccess: async (item) => {
      await refreshInventory();
      toast.success(`${item?.name || 'Item'} added.`);
    },
    onError: (error) => showFailure(error, 'Failed to add inventory item. Please try again.'),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, payload }) => inventoryApi.updateItem(itemId, payload),
    onSuccess: async (item) => {
      await refreshInventory();
      toast.success(`${item?.name || 'Item'} saved.`);
    },
    onError: (error) => showFailure(error, 'Failed to save inventory item. Please try again.'),
  });

  // Errors are shown inside the restock dialog, which stays open so nothing is retyped.
  const restockMutation = useMutation({
    mutationFn: ({ item, form }) => inventoryApi.createMovement(buildRestockMovement(item, form)),
    onSuccess: async (result) => {
      await refreshInventory();
      if (isQueuedOffline(result)) toast(QUEUED_OFFLINE_MESSAGE);
      else toast.success(result?.ledgerEntryId ? restockCopy.recordedWithExpense : restockCopy.recorded);
    },
  });

  // Use / write-off: queued offline like a restock. Dialog shows errors.
  const stockOutMutation = useMutation({
    mutationFn: ({ item, form }) => inventoryApi.createMovement(buildStockOutMovement(item, form)),
    onSuccess: async (result, { item, form }) => {
      await refreshInventory();
      const unit = item.stock?.unit ?? item.unit ?? '';
      if (isQueuedOffline(result)) toast(QUEUED_OFFLINE_MESSAGE);
      else if (isWriteOff(form.reason)) toast.success(stockOutCopy.recordedWriteOff(Number(form.quantity), unit, item.name));
      else toast.success(stockOutCopy.recorded(Number(form.quantity), unit, item.name));
    },
  });

  // Stock count: online only (offlinePolicy); the server records the difference.
  const stockCountMutation = useMutation({
    mutationFn: ({ item, counted }) => inventoryApi.countStock(item.id, counted),
    onSuccess: async (result, { item }) => {
      await refreshInventory();
      const unit = item.stock?.unit ?? item.unit ?? '';
      toast.success(result?.status === 'matched'
        ? stockCountCopy.matched(item.name)
        : stockCountCopy.reconciled(item.name, result?.new_balance ?? '', unit));
    },
  });

  const archiveItem = async (item) => {
    const confirmed = await confirmation.confirm({
      title: itemCopy.archiveTitle,
      message: itemCopy.archiveMessage(item.name),
      confirmText: itemCopy.archive,
      type: 'warning',
    });
    if (confirmed) itemActions.archive.mutate({ item });
  };

  const deleteItemMutation = useMutation({
    mutationFn: ({ item }) => inventoryApi.deleteItem(item.id || item.sku),
    onSuccess: async (data, { item }) => {
      await refreshInventory();
      toast.success(`${item.name} deleted.`);
    },
    onError: async (error, { item }) => {
      // Items with history can't be deleted; archiving keeps the history and hides the item.
      // The backend may leave out `can_archive`; only an explicit false rules archiving out.
      if (getApiErrorCode(error) === 'ITEM_IN_USE' && getApiErrorBody(error).can_archive !== false && canManageItems) {
        const archiveInstead = await confirmation.confirm({
          title: itemCopy.inUseTitle,
          message: feedCopy.errors.codes.ITEM_IN_USE,
          confirmText: itemCopy.archiveInstead,
          type: 'warning',
        });
        if (archiveInstead) itemActions.archive.mutate({ item });
        return;
      }
      showFailure(error, 'Failed to delete inventory item.');
    },
  });

  const handleDelete = async (item) => {
    const identifier = item.sku || item.id;
    const confirmed = await confirmation.confirm({
      title: 'Delete Inventory Item',
      message: `Are you sure you want to delete item ${item.name} (${identifier})? This action cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (confirmed) {
      deleteItemMutation.mutate({ item });
    }
  };

  // The modal has already validated the form (inventoryItemRules).
  const handleRegisterResource = (newResourceData) => {
    createItemMutation.mutate({
      name: newResourceData.name,
      sku: newResourceData.sku,
      category: newResourceData.category,
      unit: newResourceData.unit,
      currentStock: Number.parseFloat(newResourceData.currentStock) || 0,
      reorderLevel: Number.parseFloat(newResourceData.reorderLevel) || 0,
      protein_grams_per_kg: Number(newResourceData.proteinGramsPerKg ?? 0),
      energy_mj_per_kg: Number(newResourceData.energyMjPerKg ?? 0),
      fiber_grams_per_kg: Number(newResourceData.fiberGramsPerKg ?? 0),
      cost_per_kg: Number(newResourceData.costPerKg ?? 0),
    });
  };

  const categories = useMemo(() => {
    const allCategories = backendInventory?.map(item => item.category) || [];
    // Return a unique list of categories, with "All" at the beginning
    // Keep the filter from the address selectable even before an item of that category exists.
    return ['All', ...new Set([...allCategories, ...(categoryFilter === 'All' ? [] : [categoryFilter])])];
  }, [backendInventory, categoryFilter]);

  const handleRestock = (item) => {
    setSelectedItem(item);
    setIsRestockModalOpen(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  // The modal has already validated the form; stock is never part of an update.
  const handleSaveEdit = (updatedItem) => {
    updateItemMutation.mutate({
      itemId: updatedItem.id || updatedItem.sku,
      payload: updatedItem,
    });
  };

  // Restock function to update stock quantity in state
  const handleConfirmRestock = (itemToRestock, form) => {
    return restockMutation.mutateAsync({ item: itemToRestock, form });
  };

  // One action list for the desktop menu and the phone buttons.
  const getRowActions = (item) => {
    if (isArchived(item)) {
      return canManageItems ? [{ key: 'restore', label: itemCopy.restore, Icon: ArchiveRestore, onClick: () => itemActions.restore.mutate({ item }) }] : [];
    }
    return [
      { key: 'restock', label: 'Restock', Icon: Plus, onClick: () => handleRestock(item) },
      { key: 'stock-out', label: stockOutCopy.action, Icon: MinusCircle, onClick: () => setStockDialog({ kind: 'out', item }) },
      ...(canManageItems ? [{ key: 'stock-count', label: stockCountCopy.action, Icon: ClipboardCheck, onClick: () => setStockDialog({ kind: 'count', item }) }] : []),
      { key: 'edit', label: 'Edit', Icon: Edit2, onClick: () => handleEdit(item) },
      ...(canManageItems ? [{ key: 'archive', label: itemCopy.archive, Icon: Archive, onClick: () => archiveItem(item) }] : []),
      { key: 'delete', label: 'Delete', Icon: Trash2, onClick: () => handleDelete(item), danger: true },
    ];
  };

  const pendingFixFor = (item) => (
    itemActions.applyDataFix.isPending && itemActions.applyDataFix.variables?.item?.id === item.id
      ? itemActions.applyDataFix.variables.code
      : null
  );

  const renderItemDetails = (item) => (
    <>
      {isArchived(item) && (
        <span className="mt-1 inline-flex rounded border border-ink/15 bg-ink/5 px-2 py-0.5 text-[10px] font-bold text-ink-muted">{itemCopy.archived}</span>
      )}
      {getDataWarnings(item).length > 0 && (
        <div className="mt-2">
          <DataWarningList
            warnings={getDataWarnings(item)}
            onApplyFix={canManageItems ? (code) => itemActions.applyDataFix.mutate({ item, code }) : undefined}
            pendingCode={pendingFixFor(item)}
          />
        </div>
      )}
    </>
  );

  const itemsWithWarnings = (backendInventory ?? []).filter((item) => !isArchived(item) && getDataWarnings(item).length > 0).length;

  // Filter data based on search term
  const filteredInventoryData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return (backendInventory || []).filter(item => {
      const matchesSearch = term ?
        item.name.toLowerCase().includes(term) ||
        String(item.sku ?? '').toLowerCase().includes(term) :
        true;

      const matchesCategory = categoryFilter === 'All' ? true : item.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [backendInventory, searchTerm, categoryFilter]);

  return (
    <div className="animate-reveal p-8">
      <Confirmation {...confirmation} />
      {showError && (
        <div className="mb-6">
          <AlertBanner
            type="danger"
            title="Inventory update failed"
            message={errorMessage}
            onDismiss={() => setShowError(false)}
          />
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex justify-between items-center mb-8 rounded-card border border-brand-100 bg-brand-50 p-5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white text-brand-700 rounded-lg border border-brand-100"><Package size={20} /></div>
          <div>
            <h2 className="font-sans font-bold text-2xl tracking-tight text-brand-900 m-0">Stock Registry</h2>
            <p className="text-sm text-brand-700/80 mt-1">Manage stock levels, new receipts, and resource definitions.</p>
          </div>
        </div>
        <button
          onClick={() => setIsRegisterModalOpen(true)}
          className="flex items-center gap-2 rounded-button bg-brand-800 px-5 py-2.5 text-sm font-semibold text-white  transition-colors hover:bg-brand-900"
        >
          <Plus size={16} /> Add to Feedstore
        </button>
      </div>

      {itemsWithWarnings > 0 && (
        <div className="mb-6">
          <AlertBanner type="info" title={feedCopy.dataWarnings.summaryTitle(itemsWithWarnings)} message={feedCopy.dataWarnings.summaryMessage} />
        </div>
      )}

      {/* SEARCH AND FILTER */}
      <div className="mb-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:gap-4">
        <div className="relative min-w-0 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand" />
            <input
                placeholder="Search items by name or SKU..."
                className="w-full rounded-lg border border-ink/20 py-3 pl-10 pr-4 text-xs font-bold outline-none focus:border-brand/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="relative w-full sm:w-auto sm:min-w-48">
            <Filter size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand" />
            <select
                className="w-full appearance-none rounded-lg border border-ink/20 bg-surface py-3 pl-10 pr-10 text-xs font-black uppercase text-ink hover:bg-brand-50 focus:border-brand/50 focus:outline-none cursor-pointer"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
            >
                {categories.map(cat => (
                    <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
                ))}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
        </div>
        <label className="flex min-h-11 items-center gap-2 text-xs font-bold text-ink">
          <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} className="h-4 w-4 accent-brand" />
          {itemCopy.showArchived}
        </label>
      </div>

      {/* STOCK TABLE */}
      <div className="min-w-0 overflow-hidden rounded-xl border border-ink/10 bg-white">
        <ListLoadNotices state={inventoryLoadState} label="stock items" error={inventoryQuery.error} onRetry={inventoryQuery.refetch} />
        {inventoryLoadState === 'loading' && (
          <div aria-busy="true">
            <table className="hidden w-full border-collapse md:table"><tbody><TableSkeletonRows columns={TABLE_COLUMNS} /></tbody></table>
            <div className="divide-y divide-ink/10 md:hidden"><CardSkeletons /></div>
          </div>
        )}
        {!hasRowsToShow(inventoryLoadState) ? null : filteredInventoryData.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center text-sm text-ink-muted">
            {(backendInventory || []).length === 0 ? (
              <>
                <p>No inventory items yet. Register your feed, medicines and supplies to track stock.</p>
                <button type="button" onClick={() => setIsRegisterModalOpen(true)} className="btn-command">Register your first item</button>
              </>
            ) : (
              <>
                <p>No items match your search or category.</p>
                <button type="button" onClick={() => { setSearchTerm(''); setCategoryFilter('All'); }} className="text-xs font-bold text-brand hover:underline">Clear filters</button>
              </>
            )}
          </div>
        ) : (
        <>
        <table className="hidden w-full min-w-[680px] border-collapse text-left md:table">
          <thead className="bg-brand-800 text-[10px] uppercase font-bold text-white">
            <tr>
              <th className="px-6 py-4">Item Details</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Current Stock</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {filteredInventoryData.map((item) => (
              <tr key={item.id ?? item.sku} className={`transition-colors hover:bg-brand-50 ${isArchived(item) ? 'opacity-70' : ''}`}>
                <td className="px-6 py-4">
                  <div className="font-black text-sm text-ink">{item.name}</div>
                  {item.sku && <div className="text-[11px] font-bold text-ink-muted font-mono">{item.sku}</div>}
                  {renderItemDetails(item)}
                </td>
                <td className="px-6 py-4 text-xs font-semibold text-ink-muted">{item.category}</td>
                <td className="px-6 py-4 text-xs font-black text-ink font-mono">
                  {formatStock(item.stock)}
                </td>
                <td className="px-6 py-4">
                  <StockStatusChip status={getItemStatus(item)} />
                </td>
                <td className="px-6 py-4 text-right">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-button border border-ink/15 text-ink-muted hover:border-brand-400 hover:text-brand-700" aria-label={`Actions for ${item.name}`}>
                        <MoreVertical size={16} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-52 p-1.5">
                      {getRowActions(item).map(({ key, label, Icon, onClick, danger }) => (
                        <button key={key} type="button" onClick={onClick} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${danger ? 'text-danger hover:bg-ink-100' : 'text-ink-900 hover:bg-brand-50'}`}><Icon size={14} /> {label}</button>
                      ))}
                    </PopoverContent>
                  </Popover>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="divide-y divide-ink/10 md:hidden">
          {filteredInventoryData.map((item) => {
            const status = getItemStatus(item);
            return (
              <article key={item.id ?? item.sku} className={`min-w-0 space-y-3 p-4 ${isArchived(item) ? 'opacity-70' : ''}`}>
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0"><h3 className="break-words font-bold text-ink">{item.name}</h3>{item.sku && <p className="mt-1 break-all font-mono text-xs text-ink-muted">{item.sku}</p>}{renderItemDetails(item)}</div>
                  <StockStatusChip status={status} />
                </div>
                <dl className="grid grid-cols-2 gap-3 border-t border-ink/10 pt-3 text-xs">
                  <div className="min-w-0"><dt className="text-ink-muted">Category</dt><dd className="mt-1 break-words font-semibold text-ink">{item.category}</dd></div>
                  <div className="min-w-0"><dt className="text-ink-muted">Current stock</dt><dd className="mt-1 break-words font-mono font-bold tabular-nums text-brand">{formatStock(item.stock)}</dd></div>
                </dl>
                <div className="flex flex-wrap justify-end gap-2 border-t border-ink/10 pt-3">
                  {getRowActions(item).map(({ key, label, onClick, danger }) => (
                    <button key={key} type="button" onClick={onClick} className={`min-h-10 rounded-button border border-brand/20 px-3 py-2 text-xs font-semibold ${danger ? 'text-danger' : 'text-brand'}`}>{label}</button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
        </>
        )}
      </div>

      {/* MODALS SECTION */}
      {isRegisterModalOpen && (
        <RegisterResourceModal
          isOpen
          onClose={() => setIsRegisterModalOpen(false)}
          onRegister={handleRegisterResource}
        />
      )}

      {isRestockModalOpen && (
      <StandardDeliveryModal
        key={selectedItem?.id ?? 'general'}
        isOpen
        onClose={() => setIsRestockModalOpen(false)}
        item={selectedItem}
        onRestock={handleConfirmRestock}
        tenantId={tenantId}
        farmId={farmId}
      />
      )}

      {stockDialog?.kind === 'out' && (
        <StockOutModal
          item={stockDialog.item}
          onClose={() => setStockDialog(null)}
          onSubmit={(item, form) => stockOutMutation.mutateAsync({ item, form })}
        />
      )}

      {stockDialog?.kind === 'count' && (
        <StockCountModal
          item={stockDialog.item}
          onClose={() => setStockDialog(null)}
          onSubmit={(item, counted) => stockCountMutation.mutateAsync({ item, counted })}
        />
      )}

      {isEditModalOpen && (
        <EditResourceModal
          isOpen
          onClose={() => setIsEditModalOpen(false)}
          item={selectedItem}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}
