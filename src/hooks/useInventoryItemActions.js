import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { inventoryApi } from '../lib/backendApi';
import { getFeedErrorMessage } from '../lib/feedErrors';
import { feedCopy } from '../i18n/feed';
import { useTenant } from './useTenant';

/**
 * Owner actions on an inventory item that change what the mixers can use:
 * archive, restore, and applying a server-computed data fix. One place for
 * their cache refreshes, so the stock list and the mixers never disagree.
 */
export function useInventoryItemActions() {
  const queryClient = useQueryClient();
  const { tenantId, farmId } = useTenant();

  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['inventory-items', tenantId, farmId] }),
    queryClient.invalidateQueries({ queryKey: ['inventory-stock', tenantId, farmId] }),
    queryClient.invalidateQueries({ queryKey: ['mixer-ingredients'] }),
  ]);

  const action = (request, successMessage, errorFallback) => ({
    mutationFn: request,
    onSuccess: async (item, variables) => {
      await refresh();
      toast.success(successMessage(variables.item?.name ?? item?.name ?? ''));
    },
    onError: (error) => toast.error(getFeedErrorMessage(error, errorFallback)),
  });

  const archive = useMutation(action(({ item }) => inventoryApi.archiveItem(item.id), feedCopy.item.archivedToast, feedCopy.errors.archive));
  const restore = useMutation(action(({ item }) => inventoryApi.restoreItem(item.id), feedCopy.item.restoredToast, feedCopy.errors.restore));
  const applyDataFix = useMutation(action(
    ({ item, code }) => inventoryApi.applyDataFix(item.id, code),
    feedCopy.dataWarnings.fixed,
    feedCopy.errors.dataFix,
  ));

  return { archive, restore, applyDataFix };
}
