import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Beaker, Tractor, Save, AlertCircle, XCircle } from 'lucide-react';
import RecipeBuilder from '../nutrition/RecipeBuilder';
import CreateBatchModal from '../../components/nutrition/CreateBatchModal';
import { nutritionApi, inventoryApi } from '../../lib/backendApi';
import { useTenant } from '../../hooks/useTenant';

// 1. CRITICAL FIX: Define defaults OUTSIDE the component.
// This ensures their memory reference never changes, preventing infinite loops in child components.
const DEFAULT_DAIRY_MEAL = [
  { id: 'maize', name: 'Maize Germ', percentage: 50, proteinContent: 9.5, pricePerKg: 32 },
  { id: 'bran', name: 'Wheat Bran', percentage: 30, proteinContent: 14.5, pricePerKg: 28 },
  { id: 'sunflower', name: 'Sunflower Cake', percentage: 20, proteinContent: 28.0, pricePerKg: 45 }
];

const DEFAULT_MAIN_MEAL = [
  { id: 'silage', name: 'Silage', percentage: 60, proteinContent: 8.0, pricePerKg: 5 },
  { id: 'dairy_meal', name: 'Dairy Meal (Formulated)', percentage: 30, proteinContent: 16.0, pricePerKg: 35 },
  { id: 'lucerne', name: 'Lucerne Hay', percentage: 10, proteinContent: 18.0, pricePerKg: 25 }
];

const DEFAULT_BATCH_SIZE_BY_TYPE = {
  dairy_meal: 500,
  main_meal: 2000,
};

function normalizeBatchSize(value, fallback = 0) {
  const parsedValue = Number(value);

  if (Number.isFinite(parsedValue) && parsedValue > 0) {
    return parsedValue;
  }

  return fallback;
}

function normalizeIngredientIdentifier(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }

  const numericValue = Number(trimmed);
  if (Number.isFinite(numericValue) && numericValue > 0) {
    return numericValue;
  }

  return trimmed;
}

function getRequestErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.message
    ?? error?.response?.data?.error
    ?? error?.message
    ?? fallbackMessage;
}

export function mapInventoryItemToRecipeIngredient(item = {}) {
  const numericItemId = Number(item.id ?? item.ingredient_id ?? item.ingredientId ?? item.item_id ?? item.itemId);
  const ingredientId = Number.isFinite(numericItemId) && numericItemId > 0 ? numericItemId : null;
  const rawPercentage = Number(
    item.inclusion_percentage
    ?? item.inclusionPercent
    ?? item.inclusionPercentage
    ?? item.default_share_percent
    ?? item.defaultSharePercent
    ?? item.default_percentage
    ?? item.defaultPercentage
    ?? item.percentage
    ?? 0
  );

  // Backend is the single source of truth for default/share percentages.
  // Frontend must never derive percentages from stock quantities.
  const percentage = Number.isFinite(rawPercentage) && rawPercentage > 0 ? rawPercentage : 0;

  return {
    id: String(item.id ?? item.sku ?? item.name), // Keep string ID for local React keys/display
    ingredientId,
    ingredient_id: ingredientId,
    inventory_item_id: ingredientId,
    name: item.name ?? item.sku ?? 'Unknown Ingredient',
    percentage,
    proteinContent: Number(item.protein_grams_per_kg ?? item.proteinContent ?? 0) / 10,
    pricePerKg: Number(item.cost_per_kg ?? item.costPerKg ?? 0),
    availableStock: Number(item.currentStock ?? item.current_qty ?? item.stock?.value ?? 0),
    stockUnit: item.unit ?? item.stock?.unit ?? 'kg',
  };
}

function mapSuggestedIngredient(item = {}, index = 0) {
  const parsedIngredientId = Number(
    item.ingredient_id
    ?? item.ingredientId
    ?? item.inventory_item_id
    ?? item.inventoryItemId
    ?? item.item_id
    ?? item.itemId
    ?? item.id
  );

  const rawPercentage = Number(
    item.adjusted_percentage
    ?? item.adjustedPercentage
    ?? item.percentage
    ?? item.inclusion_percentage
    ?? item.inclusionPercent
    ?? item.inclusionPercentage
    ?? item.share
    ?? item.share_percent
    ?? item.sharePercentage
    ?? item.recommended_percentage
    ?? item.recommendedPercentage
    ?? 0
  );

  const percentage = Number.isFinite(rawPercentage)
    ? Math.max(0, rawPercentage)
    : 0;

  const ingredientId = Number.isFinite(parsedIngredientId) && parsedIngredientId > 0
    ? parsedIngredientId
    : null;

  return {
    id: String( // Keep string ID for local React keys/display
      ingredientId
      ?? item.id
      ?? item.name
      ?? index
    ),
    ingredientId,
    ingredient_id: ingredientId,
    inventory_item_id: ingredientId,
    name: item.name ?? item.ingredient_name ?? 'Ingredient',
    percentage,
    proteinContent: Number(item.protein_grams_per_kg ?? item.proteinContent ?? item.protein_percentage ?? item.protein_percent ?? 0) / 10,
    pricePerKg: Number(item.cost_per_kg ?? item.pricePerKg ?? 0),
  };
}

function normalizeSuggestedMixResponse(data = {}) {
  return {
    herdTotalTargetLiters: Number(data.herd_total_target_liters ?? data.herdTotalTargetLiters ?? 0),
    suggestedProteinPercent: Number(
      data.suggested_protein_percent
      ?? data.target_protein_percent
      ?? data.targetProteinPercent
      ?? data.target_protein_percentage
      ?? data.targetProteinPercentage
      ?? 0
    ),
    batchSizeKg: Number(data.batch_size_kg ?? data.batchSizeKg ?? 0),
    suggestedIngredients: Array.isArray(data.suggested_ingredients)
      ? data.suggested_ingredients
      : Array.isArray(data.ingredients)
        ? data.ingredients
        : Array.isArray(data.formula)
          ? data.formula
          : [],
    message: data.message ?? '',
  };
}

export default function FeedFormulation() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tenantId, farmId } = useTenant();

  const routerState = location.state || {};
  const importedDraft = routerState.isImportedDraft ? routerState : null;
  const [activeTab, setActiveTab] = useState(importedDraft?.draftType || 'dairy_meal');

  const { data: savedRecipeIngredients = [], isLoading: isRecipeLoading } = useQuery({
    queryKey: ['mixer-ingredients', activeTab, tenantId, farmId],
    queryFn: () => nutritionApi.listMixerIngredients(activeTab),
    enabled: !!tenantId && !!farmId,
  });

  // Fetch all inventory items to ensure the mixer shows all available ingredients.
  const { data: allInventoryItems = [], isLoading: isInventoryLoading } = useQuery({
    queryKey: ['inventory-items', tenantId, farmId],
    queryFn: () => inventoryApi.listItems(),
    enabled: !!tenantId && !!farmId,
    staleTime: 1000 * 60 * 5, // Stale after 5 minutes
  });

  // State initialization
  const [recipe, setRecipe] = useState([]);
  const [batchSizeKg, setBatchSizeKg] = useState(
    DEFAULT_BATCH_SIZE_BY_TYPE[importedDraft?.draftType || 'dairy_meal'] ?? DEFAULT_BATCH_SIZE_BY_TYPE.dairy_meal
  );
  const [targetProtein, setTargetProtein] = useState(activeTab === 'dairy_meal' ? 16 : 14);
  const [proteinDiagnostics, setProteinDiagnostics] = useState(null);
  const [formulationPreview, setFormulationPreview] = useState(null);
  const [formulationError, setFormulationError] = useState('');
  const [suggestedMixMessage, setSuggestedMixMessage] = useState('');
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // Synchronize the tab if a new draft is loaded while the component is already open
  useEffect(() => {
    if (importedDraft?.draftType) {
      setActiveTab(importedDraft.draftType);
    }
  }, [importedDraft?.draftType]);

  useEffect(() => {
    setBatchSizeKg(DEFAULT_BATCH_SIZE_BY_TYPE[activeTab] ?? DEFAULT_BATCH_SIZE_BY_TYPE.dairy_meal);
  }, [activeTab]);

  const defaultRecipeName = activeTab === 'dairy_meal' ? 'Dairy Meal Mix' : 'Main Feed Mix';

  useEffect(() => {
    if (!Number.isFinite(Number(targetProtein)) || Number(targetProtein) <= 0) {
      setTargetProtein(activeTab === 'dairy_meal' ? 16 : 14);
    }
  }, [activeTab, targetProtein]);

  const inventoryBackedIngredients = useMemo(() => {
    // If we don't have the full inventory list yet, we can't build the recipe.
    if (!allInventoryItems || allInventoryItems.length === 0) {
      return [];
    }

    // Defensively extract the array if the GET endpoint returns a full recipe object
    const savedIngredientsArray = Array.isArray(savedRecipeIngredients)
      ? savedRecipeIngredients
      : (savedRecipeIngredients.ingredients || savedRecipeIngredients.adjusted_ingredients || []);

    // Map over all available 'Bulk Feed' inventory items.
    const combined = allInventoryItems
      // First, only include feed-related items. Exclude non-feed categories.
      .filter(item => {
        const category = String(item.category || '').toLowerCase();
        // Allow 'Bulk Feed' and any other potential feed categories like 'Supplements', but exclude non-feed items.
        return category !== 'medical vault' && category !== 'equipment';
      })
      // Second, filter based on the backend's policy for which mixer this item is allowed in.
      .filter(stockItem => {
        const allowed = stockItem.allowed_mixers || stockItem.recipe_types || "";
        // `activeTab` is either 'dairy_meal' or 'main_meal', matching the backend string.
        return allowed.includes(activeTab);
      })
      .map(inventoryItem => {
        // Find the stock item in the saved recipe using ingredient_id
        const savedItem = savedIngredientsArray.find(r =>
          r.ingredient_id === inventoryItem.id
        );

        // Since Method 1 (auto-save) uses 'percentage', we can read it directly.
        let percentage = 0;
        if (savedItem) {
          percentage = Number(savedItem.percentage ?? 0);
        } else {
          // If the item isn't in the saved recipe, default to 0.
          percentage = 0;
        }
        return mapInventoryItemToRecipeIngredient({ ...inventoryItem, percentage });
      });

    return combined;
  }, [allInventoryItems, savedRecipeIngredients, activeTab]);

  const fallbackDefaults = useMemo(
    () => (activeTab === 'dairy_meal' ? DEFAULT_DAIRY_MEAL : DEFAULT_MAIN_MEAL),
    [activeTab],
  );

  const initialIngredients = useMemo(() => {
    if (importedDraft && importedDraft.draftType === activeTab) {
      const draftData = importedDraft.draftFormula;
      if (Array.isArray(draftData) && draftData.length > 0) {
        return draftData;
      }
    }

    return inventoryBackedIngredients.length > 0 ? inventoryBackedIngredients : fallbackDefaults;
  }, [activeTab, fallbackDefaults, importedDraft, inventoryBackedIngredients]);

  const inventoryDefaultsSignature = useMemo(() => {
    if (!Array.isArray(inventoryBackedIngredients) || inventoryBackedIngredients.length === 0) {
      return 'empty';
    }

    return inventoryBackedIngredients
      .map((ingredient) => `${ingredient.id}:${Number(ingredient.percentage ?? 0)}`)
      .join('|');
  }, [inventoryBackedIngredients]);

  const recipeInitializationKey = useMemo(() => {
    const source = inventoryBackedIngredients.length > 0 ? 'inventory' : 'fallback';
    const draftMarker = importedDraft && importedDraft.draftType === activeTab ? 'draft' : 'standard';
    return `${activeTab}|${source}|${draftMarker}|${inventoryDefaultsSignature}`;
  }, [activeTab, importedDraft, inventoryBackedIngredients.length, inventoryDefaultsSignature]);

  const lastRecipeInitializationKeyRef = useRef('');

  useEffect(() => {
    if (lastRecipeInitializationKeyRef.current === recipeInitializationKey) {
      return;
    }

    setRecipe(initialIngredients);
    lastRecipeInitializationKeyRef.current = recipeInitializationKey;
  }, [initialIngredients, recipeInitializationKey]);

  const suggestedMixQuery = useQuery({
    queryKey: ['feed-formulation-suggested-mix', tenantId, farmId, routerState?.yieldTargetId, routerState?.targetLiters],
    queryFn: () => nutritionApi.suggestedMix({
      yield_target_id: routerState?.yieldTargetId ?? undefined,
      target_liters: routerState?.targetLiters ?? undefined,
    }),
    enabled: Boolean(tenantId && farmId && routerState?.fromMilkLab),
  });

  useEffect(() => {
    if (!suggestedMixQuery.data || !routerState?.fromMilkLab) {
      return;
    }

    const normalizedMix = normalizeSuggestedMixResponse(suggestedMixQuery.data);

    const suggestedTargetProtein = Number(
      normalizedMix.suggestedProteinPercent
    );
    if (Number.isFinite(suggestedTargetProtein) && suggestedTargetProtein > 0) {
      setTargetProtein(suggestedTargetProtein);
    }

    if (Number.isFinite(normalizedMix.batchSizeKg) && normalizedMix.batchSizeKg > 0) {
      setBatchSizeKg(normalizedMix.batchSizeKg);
      setSuggestedMixMessage(`${normalizedMix.batchSizeKg} kg suggested batch size loaded from Milk Lab.`);
    } else {
      setSuggestedMixMessage(normalizedMix.message || 'Suggested mix loaded from Milk Lab.');
    }

    const suggestedIngredients = normalizedMix.suggestedIngredients;

    if (Array.isArray(suggestedIngredients) && suggestedIngredients.length > 0) {
      const normalized = suggestedIngredients.map(mapSuggestedIngredient);
      setRecipe(normalized);
    }
  }, [routerState?.fromMilkLab, suggestedMixQuery.data]);

  const buildRecipeRequestPayload = (extraPayload = {}, options = {}) => {
    const allowZeroPercentages = Boolean(options.allowZeroPercentages);
    const normalizedBatchSize = normalizeBatchSize(batchSizeKg);
    const normalizedTargetProtein = Number(targetProtein);
    const fallbackTargetProtein = activeTab === 'main_meal' ? 14 : 16;
    const targetProteinPercent = Number.isFinite(normalizedTargetProtein) && normalizedTargetProtein > 0
      ? normalizedTargetProtein
      : fallbackTargetProtein;
    const normalizedIngredients = (Array.isArray(recipe) ? recipe : [])
      .map((ingredient) => {
        // The backend explicitly requires a numeric ingredient_id.
        // We will only include ingredients that have a valid numeric ID.
        // Placeholder ingredients with string IDs (like 'maize') will be filtered out here.
        const numericIngredientId = Number(ingredient.ingredientId ?? ingredient.ingredient_id ?? ingredient.inventory_item_id);
        const finalIngredientId = Number.isFinite(numericIngredientId) && numericIngredientId > 0 ? numericIngredientId : null;

        const parsedPercentage = Number(
          ingredient.percentage
          ?? ingredient.inclusion_percentage
          ?? ingredient.inclusionPercent
          ?? ingredient.inclusionPercentage
          ?? 0
        );

        const inclusionPercentage = Number.isFinite(parsedPercentage)
          ? Math.max(0, parsedPercentage)
          : 0;

        if (finalIngredientId === null || (!allowZeroPercentages && inclusionPercentage <= 0)) {
          return null;
        }

        return {
          ...ingredient,
          ingredient_id: finalIngredientId, // This is the key the backend expects
          ingredientId: finalIngredientId,
          inventory_item_id: finalIngredientId,
          inventoryItemId: finalIngredientId,
          inclusion_percentage: inclusionPercentage,
          inclusionPercentage,
          percentage: inclusionPercentage,
        };
      })
      .filter(Boolean);

    if (normalizedBatchSize <= 0) {
      throw new Error('Batch size is required and must be greater than 0 kg.');
    }

    if (normalizedIngredients.some(ing => ing.ingredient_id === null)) {
      throw new Error('All ingredients must have a valid numeric ID linked to inventory to be processed by the backend.');
    }

    if (normalizedIngredients.length === 0) {
      throw new Error(
        allowZeroPercentages
          ? 'Add at least one ingredient before auto-adjusting feed shares.'
          : 'Add at least one ingredient with a share greater than 0% before checking nutrition.'
      );
    }

    return {
      recipe_type: activeTab,
      ingredients: normalizedIngredients,
      target_protein_percent: targetProteinPercent,
      target_protein_percentage: targetProteinPercent,
      batch_size_kg: normalizedBatchSize,
      ...extraPayload,
    };
  };

  const hasEligibleIngredients = useMemo(() => {
    return (Array.isArray(recipe) ? recipe : []).some((ingredient) => {
      const normalizedIngredientId = normalizeIngredientIdentifier(
        ingredient.ingredient_id
        ?? ingredient.ingredientId
        ?? ingredient.inventory_item_id
        ?? ingredient.inventoryItemId
        ?? ingredient.item_id
        ?? ingredient.itemId
        ?? ingredient.id
      );

      return Boolean(normalizedIngredientId);
    });
  }, [recipe]);

  const hasValidIngredients = useMemo(() => {
    return (Array.isArray(recipe) ? recipe : []).some((ingredient) => {
      const normalizedIngredientId = normalizeIngredientIdentifier(
        ingredient.ingredient_id
        ?? ingredient.ingredientId
        ?? ingredient.inventory_item_id
        ?? ingredient.inventoryItemId
        ?? ingredient.item_id
        ?? ingredient.itemId
        ?? ingredient.id
      );
      const numericIngredientId = Number(ingredient.ingredientId ?? ingredient.ingredient_id ?? ingredient.inventory_item_id ?? ingredient.id);
      const hasNumericId = Number.isFinite(numericIngredientId) && numericIngredientId > 0;
      const parsedPercentage = Number(
        ingredient.percentage
        ?? ingredient.inclusion_percentage
        ?? ingredient.inclusionPercent
        ?? ingredient.inclusionPercentage
        ?? 0
      );

      return hasNumericId
        && Number.isFinite(parsedPercentage)
        && parsedPercentage > 0;
    });
  }, [recipe]);

  const ingredientEligibilityDiagnostics = useMemo(() => {
    const source = Array.isArray(recipe) ? recipe : [];
    const missingIdNames = source
      .filter((ingredient) => {
        const normalizedIngredientId = normalizeIngredientIdentifier(
          ingredient.ingredient_id
          ?? ingredient.ingredientId
          ?? ingredient.inventory_item_id
          ?? ingredient.inventoryItemId
          ?? ingredient.item_id
          ?? ingredient.itemId
          ?? ingredient.id
        );
        return !normalizedIngredientId;
      })
      .map((ingredient) => ingredient.name)
      .slice(0, 4);

    return {
      total: source.length,
      missingIds: missingIdNames,
    };
  }, [recipe]);

  const calculateNutritionMutation = useMutation({
    mutationFn: () => nutritionApi.calculateNutrition(buildRecipeRequestPayload()),
    onSuccess: (data) => {
      setProteinDiagnostics(data);
      setFormulationError('');
    },
    onError: (error) => {
      setFormulationError(getRequestErrorMessage(error, 'Could not calculate nutrition for this formula.'));
    },
  });

  const formulateMutation = useMutation({
    mutationFn: () => nutritionApi.formulateRecipe(
      buildRecipeRequestPayload(
        {
          target_liters: routerState?.targetLiters ?? undefined,
          yield_target_id: routerState?.yieldTargetId ?? undefined,
        },
        { allowZeroPercentages: true }
      )
    ),
    onSuccess: (data) => {
      const suggestedIngredients = data.optimized_ingredients
        ?? data.adjusted_ingredients
        ?? data.ingredients
        ?? data.suggested_ingredients
        ?? [];

      if (!Array.isArray(suggestedIngredients) || suggestedIngredients.length === 0) {
        setFormulationError('Formulation returned no adjusted ingredient shares.');
        return;
      }

      const normalizedIngredients = suggestedIngredients.map(mapSuggestedIngredient);
      const hasSolvedShares = normalizedIngredients.every((ingredient) => (
        ingredient.ingredientId !== null
        && Number.isFinite(ingredient.percentage)
        && ingredient.percentage >= 0
      )) && normalizedIngredients.some((ingredient) => ingredient.percentage > 0);

      if (!hasSolvedShares) {
        setFormulationError('Formulation returned invalid ingredient shares.');
        return;
      }

      // Commit the solved mix only after a successful, valid formulation response.
      setFormulationPreview(data);
      setFormulationError('');
      setRecipe(normalizedIngredients);
    },
    onError: (error) => {
      setFormulationError(getRequestErrorMessage(error, 'Could not formulate adjustments for this target.'));
    },
  });

  const saveRecipe = useMutation({
    mutationFn: async () => {
      // This reverts to the original logic. The component should build the payload,
      // and the API layer (via normalizeNutritionRequestPayload) is responsible for final normalization.
      const requestPayload = buildRecipeRequestPayload({
        recipe_type: activeTab,
        recipe_name: routerState?.draftName ?? defaultRecipeName,
        name: routerState?.draftName ?? defaultRecipeName,
        source: routerState?.fromMilkLab ? 'milk_lab_export' : 'manual',
        yield_target_id: routerState?.yieldTargetId ?? undefined,
      });

      // --- START: In-component Normalization for Robustness ---
      // To guarantee the payload is valid before it leaves the component,
      // we normalize the ingredient percentages to sum to 100.
      const ingredients = requestPayload.ingredients || [];
      const totalPercentage = ingredients.reduce((sum, ing) => sum + Number(ing.inclusion_percentage ?? 0), 0);
      const needsNormalization = Math.abs(totalPercentage - 100) > 0.01 && totalPercentage > 0;

      if (needsNormalization) {
        requestPayload.ingredients = ingredients.map(ing => {
          const normalizedShare = (Number(ing.inclusion_percentage ?? 0) / totalPercentage) * 100;
          // Round to 2 decimal places to avoid floating point issues
          const finalPercentage = Math.round(normalizedShare * 100) / 100;
          return {
            ...ing,
            percentage: finalPercentage,
            inclusion_percentage: finalPercentage,
          };
        });
      }
      // --- END: In-component Normalization ---

      // The /auto-save endpoint expects `adjusted_ingredients`, while other
      // nutrition endpoints expect `ingredients`. We must rename the key here
      // to match the API contract for this specific mutation.
      const finalPayload = {
        ...requestPayload,
        adjusted_ingredients: requestPayload.ingredients,
      };
      delete finalPayload.ingredients;

      return nutritionApi.autoSaveRecipe(finalPayload);
    },
    onSuccess: () => {
      // Clear the draft state from the URL so a refresh doesn't reload it
      if (importedDraft) {
        navigate(location.pathname, { replace: true, state: {} });
      }
      // Safe object syntax for React Query v4/v5 compatibility
      queryClient.invalidateQueries({ queryKey: ['active-feed-recipe', tenantId, farmId] });
      queryClient.invalidateQueries({ queryKey: ['feed-recipes', tenantId, farmId] });
      queryClient.invalidateQueries({ queryKey: ['feed-formulation-suggested-mix', tenantId, farmId] });
      queryClient.invalidateQueries({ queryKey: ['mixer-ingredients', 'dairy_meal', tenantId, farmId] });
      queryClient.invalidateQueries({ queryKey: ['mixer-ingredients', 'main_meal', tenantId, farmId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items', tenantId, farmId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock', tenantId, farmId] });
    },
    onError: (error) => {
      console.error("Failed to save recipe:", { error });
    }
  });

  const handleDiscardDraft = () => {
    // Clear router state to exit draft mode
    navigate(location.pathname, { replace: true, state: {} });
  };

  return (
    <div className="animate-reveal space-y-8 max-w-5xl mx-auto p-4 md:p-8">
      
      {/* Page Header */}
      <div className="border-b border-ink/10 pb-6">
        <h1 className="text-3xl font-black tracking-tight text-ink">Feed Mixing Planner</h1>
        <p className="mt-2 text-sm text-ink-muted max-w-2xl">
          Plan the right feed mix for your cows. Save your mix so the farm team can use it quickly during daily feeding.
        </p>
      </div>

      {/* ⚠️ DRAFT WARNING BANNER */}
      {importedDraft && (
        <div className="bg-warning/10 border border-warning/20 p-4 rounded-xl flex items-start gap-3 animate-fade-in">
          <AlertCircle className="text-warning-dark shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-bold text-warning-dark text-sm">Draft Mode Active</h4>
            <p className="text-sm font-medium text-ink/70 mt-1">
              You are editing an imported feed mix. These changes are in draft mode and will not affect feeding until you save this mix.
            </p>
          </div>
        </div>
      )}

      {routerState?.fromMilkLab && (
        <div className="bg-brand/5 border border-brand/20 p-4 rounded-xl flex items-start gap-3 animate-fade-in">
          <AlertCircle className="text-brand shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-bold text-brand text-sm">Imported From Milk Lab</h4>
            <p className="text-sm font-medium text-ink/70 mt-1">
              Protein goal was loaded from Milk Feeding Planner. You can adjust this mix, then save it for the next feeding batches.
            </p>
            {suggestedMixMessage && (
              <p className="text-xs font-semibold text-brand-dark mt-2">{suggestedMixMessage}</p>
            )}
          </div>
        </div>
      )}

      {/* Strategic Toggle Tabs */}
      <div className="flex p-1.5 bg-surface-raised border border-ink/5 rounded-lg max-w-md shadow-sm">
        <button
          onClick={() => setActiveTab('dairy_meal')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-md transition-all ${
            activeTab === 'dairy_meal' 
              ? 'bg-white text-brand shadow-sm border border-ink/5' 
              : 'text-ink-muted hover:text-ink-strong'
          }`}
        >
          <Beaker size={18} /> Dairy Meal Mix
        </button>
        <button
          onClick={() => setActiveTab('main_meal')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-md transition-all ${
            activeTab === 'main_meal' 
              ? 'bg-white text-brand shadow-sm border border-ink/5' 
              : 'text-ink-muted hover:text-ink-strong'
          }`}
        >
          <Tractor size={18} /> Main Feed Mix
        </button>
      </div>

      {/* The Formulation Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: The Interactive Builder */}
        <div className="lg:col-span-2">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* NOTE: RecipeBuilder must be refactored to be a controlled component.
                It should accept `ingredients` and `onIngredientsChange` props instead of `initialIngredients`. */}
            <RecipeBuilder 
              recipeType={activeTab}
              initialIngredients={initialIngredients}
              ingredients={recipe}
              initialBatchSize={batchSizeKg}
              onIngredientsChange={setRecipe}
              onBatchSizeChange={setBatchSizeKg}
              targetProtein={targetProtein}
              isLoading={isInventoryLoading || isRecipeLoading}
            />
          </div>
        </div>

        {/* Right Column: Strategic Actions & Context */}
        <div className="space-y-6">
          <div className="bg-surface p-6 border border-ink/5 rounded-card shadow-sm">
            <h4 className="text-sm font-black text-ink-strong mb-2">Save This Feed Mix</h4>
            <p className="text-xs text-ink-muted mb-6">
              Save these feed shares so this becomes your current farm mix.
            </p>

            <div className="mb-4 space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-wider text-ink-muted">Protein Goal (%)</label>
              <input
                type="number"
                min="1"
                max="40"
                step="0.1"
                value={targetProtein}
                onChange={(event) => setTargetProtein(event.target.value)}
                className="w-full rounded-lg border border-ink/20 bg-surface-raised px-3 py-2 text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 mb-4">
              <button
                onClick={() => calculateNutritionMutation.mutate()}
                disabled={calculateNutritionMutation.isPending || !hasValidIngredients}
                className="w-full bg-surface-raised hover:bg-ink/5 text-ink-strong px-4 py-2.5 rounded-button font-bold text-sm transition-colors disabled:opacity-70"
              >
                {calculateNutritionMutation.isPending ? 'Checking...' : 'Check Protein Level'}
              </button>
              <button
                onClick={() => formulateMutation.mutate()}
                disabled={formulateMutation.isPending || !hasEligibleIngredients}
                className="w-full bg-brand/10 hover:bg-brand/20 text-brand-dark px-4 py-2.5 rounded-button font-bold text-sm transition-colors disabled:opacity-70"
              >
                {formulateMutation.isPending ? 'Adjusting...' : 'Auto-Adjust Feed Shares'}
              </button>
            </div>

            {!hasEligibleIngredients && ingredientEligibilityDiagnostics.total > 0 && (
              <div className="mb-4 rounded-md border border-warning/20 bg-warning/10 p-3 text-xs text-warning-dark">
                Auto-adjust is disabled because one or more feed items are missing backend identifiers.
                {ingredientEligibilityDiagnostics.missingIds.length > 0 && (
                  <span className="ml-1">
                    Missing ID items: {ingredientEligibilityDiagnostics.missingIds.join(', ')}.
                  </span>
                )}
              </div>
            )}

            {proteinDiagnostics && (
              <div className="mb-4 rounded-md border border-ink/10 bg-surface-raised p-3 text-xs text-ink-muted">
                Current protein level: <span className="font-black text-ink">{Number(
                  proteinDiagnostics.average_protein_percent ??
                  proteinDiagnostics.current_protein_percentage ??
                  proteinDiagnostics.currentProteinPercentage ?? 0
                ).toFixed(1)}%</span>
              </div>
            )}

            {formulationPreview && (
              <div className="mb-4 rounded-md border border-brand/20 bg-brand/5 p-3 text-xs text-brand-dark">
                Suggested feed shares are ready. Review and save to make this your current mix.
              </div>
            )}

            {formulationError && (
              <div className="mb-4 rounded-md border border-danger/20 bg-danger/10 p-3 text-xs text-danger">
                {formulationError}
              </div>
            )}
            
            <div className="space-y-3">
              <button 
                onClick={() => saveRecipe.mutate()}
                disabled={saveRecipe.isPending || !hasValidIngredients}
                className="w-full bg-brand hover:bg-brand-dark text-white px-4 py-3 rounded-button font-bold text-sm transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <Save size={18} /> 
                {saveRecipe.isPending ? 'Saving...' : 'Save As Current Feed Mix'}
              </button>

              {importedDraft && (
                <button 
                  onClick={handleDiscardDraft}
                  className="w-full bg-surface-raised hover:bg-ink/5 text-ink-strong px-4 py-3 rounded-button font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle size={18} className="text-danger" /> Cancel Draft
                </button>
              )}

              <button
                onClick={() => setIsBatchModalOpen(true)}
                disabled={saveRecipe.isPending}
                className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-button font-bold text-sm transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
              >
                Create Batch From This Mix
              </button>
            </div>
          </div>

          <div className="bg-brand/5 p-6 border border-brand/20 rounded-card">
            <h4 className="text-sm font-black text-brand-dark mb-2">Farmer Tip</h4>
            <p className="text-xs text-brand-dark/80 leading-relaxed">
              When mixing feed, moisture around 45-50% helps cows eat more evenly and reduces feed left behind.
            </p>
          </div>
        </div>

      </div>

      <CreateBatchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        recipeType={activeTab}
        initialMixSize={batchSizeKg}
        ingredients={recipe}
      />
    </div>
  );
}
