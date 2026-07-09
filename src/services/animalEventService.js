import { animalsApi, getApiErrorMessage } from '../lib/backendApi';

/**
 * Normalizes an event record from the API into a consistent shape for the UI.
 * @param {object} event - The raw event object from the API.
 * @returns {object} A normalized event object.
 */
function normalizeEvent(event) {
  return {
    id: event.id,
    eventType: event.event_type,
    date: event.event_date,
    details: event.details,
    notes: event.notes,
    createdAt: event.created_at,
  };
}

/**
 * Service for managing animal-related events.
 * This service encapsulates all API interactions for animal events,
 * adhering to the Single Responsibility Principle.
 */
export const animalEventService = {
  /**
   * Fetches a paginated list of events for a specific animal.
   * @param {string} animalId - The ID of the animal (e.g., the ear tag).
   * @param {object} params - Query parameters for pagination and filtering.
   * @param {number} params.page - The page number to fetch.
   * @param {number} params.per_page - The number of items per page.
   * @returns {Promise<object>} An object containing the list of events and pagination info.
   */
  async listForAnimal(animalId, { page = 1, per_page = 20 } = {}) {
    if (!animalId) {
      throw new Error('Animal ID is required to fetch events.');
    }
    try {
      const response = await animalsApi.listEvents(animalId, { page, per_page });

      if (!Array.isArray(response?.data)) {
        throw new Error('Invalid events response shape from backend.');
      }

      return {
        ...response,
        data: response.data.map(normalizeEvent),
      };
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to fetch animal events.'));
    }
  },
};

export default animalEventService;