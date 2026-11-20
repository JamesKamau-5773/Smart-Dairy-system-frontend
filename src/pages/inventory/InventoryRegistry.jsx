import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, MoreVertical } from 'lucide-react';
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
import { isQueuedOffline, offlineFailureMessage, queuedOfflineMessage } from '../../lib/offlinePolicy';
import { reportError } from '../../lib/telemetry';
import { canManageInventoryItems } from '../../lib/permissions';
import { useAuth } from '../../contexts/AuthContext';
import { useInventoryFilters } from '../../hooks/useInventoryFilters';
import FilterPanel from '../../components/data/FilterPanel';
import { Toolbar, ToolbarSearch, ToolbarSelect, ToolbarToggle } from '../../components/data/Toolbar';
import { useTenant } from '../../hooks/useTenant';
import { useInventoryItemActions } from '../../hooks/useInventoryItemActions';
import { feedCopy } from '../../i18n/feed';
import { tone } from '../../components/ui/tones';
import { CardSkeletons, ListLoadNotices, TableSkeletonRows } from '../../components/ui/ListLoadState';
import { getListLoadState, hasRowsToShow } from '../../lib/listLoadState';
import { shellCopy } from '../../i18n/shell';

const { item: itemCopy, restock: restockCopy, stockOut: stockOutCopy, stockCount: stockCountCopy } = feedCopy;

const TABLE_COLUMNS = 5;

/** "220 kg"; "—" when the backend sent no stock figure (never shown as 0). */
const isKnown = (value) => value !== null && value !== undefined && value !== '';

const formatStock = (stock) => (isKnown(stock?.value) ? `${stock.value} ${stock.unit || feedCopy.inventory.units}` : '—');

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
  LOW: { get label() { return feedCopy.inventory.stockStatus.LOW; }, tone: 'attention' },
  OK: { get label() { return feedCopy.inventory.stockStatus.OK; }, tone: 'neutral' },
};

function StockStatusChip({ status }) {
  if (!status) return null;
  const { label, tone: toneName } = STOCK_STATUS[status];
  return <span className={`inline-flex shrink-0 rounded-badge px-2 py-0.5 text-meta ${tone(toneName).chip}`}>{label}</span>;
}

export default function InventoryRegistry() {
  const queryClient = useQueryClient();
  const { tenantId, farmId } = useTenant();
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  // Search and category live in the address; "Show archived" in the page (useInventoryFilters).
  const filters = useInventoryFilters();
  const { q: searchTerm, category: categoryFilter } = filters.values;
  const { showArchived } = filters;
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
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
      toast.success(feedCopy.inventory.added(item?.name || feedCopy.inventory.item));
    },
    onError: (error) => showFailure(error, feedCopy.inventory.addFailed),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, payload }) => inventoryApi.updateItem(itemId, payload),
    onSuccess: async (item) => {
      await refreshInventory();
      toast.success(feedCopy.inventory.saved(item?.name || feedCopy.inventory.item));
    },
    onError: (error) => showFailure(error, feedCopy.inventory.saveFailed),
  });

  // Errors are shown inside the restock dialog, which stays open so nothing is retyped.
  const restockMutation = useMutation({
    mutationFn: ({ item, form }) => inventoryApi.createMovement(buildRestockMovement(item, form)),
    onSuccess: async (result) => {
      await refreshInventory();
      if (isQueuedOffline(result)) toast(queuedOfflineMessage());
      else toast.success(result?.ledgerEntryId ? restockCopy.recordedWithExpense : restockCopy.recorded);
    },
  });

  // Use / write-off: queued offline like a restock. Dialog shows errors.
  const stockOutMutation = useMutation({
    mutationFn: ({ item, form }) => inventoryApi.createMovement(buildStockOutMovement(item, form)),
    onSuccess: async (result, { item, form }) => {
      await refreshInventory();
      const unit = item.stock?.unit ?? item.unit ?? '';
      if (isQueuedOffline(result)) toast(queuedOfflineMessage());
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
      reportError(error, { where: 'InventoryRegistry.delete' });
      const offline = offlineFailureMessage(error, `${item.name} wasn’t deleted.`);
      if (offline) {
        setErrorMessage(offline);
        setShowError(true);
        return;
      }
      showFailure(error, feedCopy.inventory.deleteFailed(item.name));
    },
  });

  const handleDelete = async (item) => {
    const identifier = item.sku ? ` (${item.sku})` : '';
    const confirmed = await confirmation.confirm({
      title: feedCopy.inventory.deleteTitle(item.name),
      message: feedCopy.inventory.deleteMessage(`${item.name}${identifier}`),
      confirmText: feedCopy.inventory.deleteConfirm,
      cancelText: feedCopy.inventory.deleteKeep,
      type: 'danger',
      requireText: item.name,
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
      return canManageItems ? [{ key: 'restore', label: itemCopy.restore, onClick: () => itemActions.restore.mutate({ item }) }] : [];
    }
    return [
      { key: 'restock', label: feedCopy.inventory.restock, onClick: () => handleRestock(item) },
      { key: 'stock-out', label: stockOutCopy.action, onClick: () => setStockDialog({ kind: 'out', item }) },
      ...(canManageItems ? [{ key: 'stock-count', label: stockCountCopy.action, onClick: () => setStockDialog({ kind: 'count', item }) }] : []),
      { key: 'edit', label: feedCopy.inventory.edit, onClick: () => handleEdit(item) },
      ...(canManageItems ? [{ key: 'archive', label: itemCopy.archive, onClick: () => archiveItem(item) }] : []),
      { key: 'delete', label: feedCopy.inventory.delete, onClick: () => handleDelete(item), danger: true },
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
        <span className="mt-1 inline-flex rounded border border-ink/15 bg-ink/5 px-2 py-0.5 text-badge text-ink-muted">{itemCopy.archived}</span>
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
            title={feedCopy.inventory.updateFailed}
            message={errorMessage}
            onDismiss={() => setShowError(false)}
          />
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="mb-8 flex flex-col gap-4 rounded-card border border-brand-100 bg-brand-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div>
            <h1 className="text-page-title text-brand-900 m-0">{shellCopy.nav.items.inventory}</h1>
            <p className="text-body text-brand-700/80 mt-1">{feedCopy.inventory.subtitle}</p>
          </div>
        </div>
        <button
          onClick={() => setIsRegisterModalOpen(true)}
          type="button"
          className="flex w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-button bg-brand-800 px-5 py-2.5 text-control text-white transition-colors hover:bg-brand-900 sm:w-auto"
        >
          <Plus size={16} aria-hidden="true" /> {feedCopy.inventory.add}
        </button>
      </div>

      {itemsWithWarnings > 0 && (
        <div className="mb-6">
          <AlertBanner type="info" title={feedCopy.dataWarnings.summaryTitle(itemsWithWarnings)} message={feedCopy.dataWarnings.summaryMessage} />
        </div>
      )}

      <div className="mb-6">
        <FilterPanel title={feedCopy.inventory.filtersTitle} activeCount={filters.activeCount} onReset={filters.reset}>
          <Toolbar>
            <ToolbarSearch label={feedCopy.inventory.searchPlaceholder} value={searchTerm} onChange={filters.setSearch} placeholder={feedCopy.inventory.searchPlaceholder} />
            <ToolbarSelect
              label={feedCopy.inventory.category}
              value={categoryFilter}
              onChange={filters.setCategory}
              options={categories.map((cat) => [cat, cat === 'All' ? feedCopy.inventory.allCategories : feedCopy.inventory.categories[cat] ?? cat])}
            />
            <ToolbarToggle label={itemCopy.showArchived} checked={showArchived} onChange={filters.setShowArchived} />
          </Toolbar>
        </FilterPanel>
      </div>

      {/* STOCK TABLE */}
      <div className="min-w-0 overflow-hidden rounded-xl border border-ink/10 bg-white">
        <ListLoadNotices state={inventoryLoadState} label={feedCopy.inventory.listLabel} error={inventoryQuery.error} onRetry={inventoryQuery.refetch} />
        {inventoryLoadState === 'loading' && (
          <div aria-busy="true">
            <table className="hidden w-full border-collapse md:table"><tbody><TableSkeletonRows columns={TABLE_COLUMNS} /></tbody></table>
            <div className="divide-y divide-ink/10 md:hidden"><CardSkeletons /></div>
          </div>
        )}
        {!hasRowsToShow(inventoryLoadState) ? null : filteredInventoryData.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center text-body text-ink-muted">
            {(backendInventory || []).length === 0 ? (
              <>
                <p>{feedCopy.inventory.empty}</p>
                <button type="button" onClick={() => setIsRegisterModalOpen(true)} className="btn-command">{feedCopy.inventory.registerFirst}</button>
              </>
            ) : (
              <>
                <p>{feedCopy.inventory.noMatches}</p>
                <button type="button" onClick={filters.reset} className="text-control text-brand hover:underline">{feedCopy.inventory.clearFilters}</button>
              </>
            )}
          </div>
        ) : (
        <>
        <table className="hidden w-full min-w-[680px] border-collapse text-left md:table">
          <thead className="bg-brand-800 text-label text-white">
            <tr>
              <th className="px-6 py-4">{feedCopy.inventory.columns.item}</th>
              <th className="px-6 py-4">{feedCopy.inventory.columns.category}</th>
              <th className="px-6 py-4">{feedCopy.inventory.columns.stock}</th>
              <th className="px-6 py-4">{feedCopy.inventory.columns.status}</th>
              <th className="px-6 py-4 text-right">{feedCopy.inventory.columns.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {filteredInventoryData.map((item) => (
              <tr key={item.id ?? item.sku} className={`transition-colors hover:bg-brand-50 ${isArchived(item) ? 'opacity-70' : ''}`}>
                <td className="px-6 py-4">
                  <div className="text-body-strong text-ink">{item.name}</div>
                  {item.sku && <div className="text-meta text-ink-muted tabular-nums">{item.sku}</div>}
                  {renderItemDetails(item)}
                </td>
                <td className="px-6 py-4 text-meta text-ink-muted">{feedCopy.inventory.categories[item.category] ?? item.category}</td>
                <td className="px-6 py-4 text-meta text-ink tabular-nums">
                  {formatStock(item.stock)}
                </td>
                <td className="px-6 py-4">
                  <StockStatusChip status={getItemStatus(item)} />
                </td>
                <td className="px-6 py-4 text-right">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-button border border-ink/15 text-ink-muted hover:border-brand-400 hover:text-brand-700" aria-label={feedCopy.inventory.actionsFor(item.name)}>
                        <MoreVertical size={16} aria-hidden="true" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-52 p-1.5">
                      {getRowActions(item).map(({ key, label, onClick, danger }) => (
                        <button key={key} type="button" onClick={onClick} className={`flex w-full items-center rounded-md px-3 py-2 text-left text-control ${danger ? 'text-danger hover:bg-ink-100' : 'text-ink-900 hover:bg-brand-50'}`}>{label}</button>
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
                  <div className="min-w-0"><h2 className="break-words text-section-title text-ink">{item.name}</h2>{item.sku && <p className="mt-1 break-all text-meta text-ink-muted tabular-nums">{item.sku}</p>}{renderItemDetails(item)}</div>
                  <StockStatusChip status={status} />
                </div>
                <dl className="grid grid-cols-2 gap-3 border-t border-ink/10 pt-3 text-meta">
                  <div className="min-w-0"><dt className="text-ink-muted">{feedCopy.inventory.category}</dt><dd className="mt-1 break-words text-body-strong text-ink">{feedCopy.inventory.categories[item.category] ?? item.category}</dd></div>
                  <div className="min-w-0"><dt className="text-ink-muted">{feedCopy.inventory.currentStock}</dt><dd className="mt-1 break-words text-body-strong tabular-nums text-brand">{formatStock(item.stock)}</dd></div>
                </dl>
                <div className="flex flex-wrap justify-end gap-2 border-t border-ink/10 pt-3">
                  {getRowActions(item).map(({ key, label, onClick, danger }) => (
                    <button key={key} type="button" onClick={onClick} className={`min-h-10 rounded-button border border-brand/20 px-3 py-2 text-control ${danger ? 'text-danger' : 'text-brand'}`}>{label}</button>
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
