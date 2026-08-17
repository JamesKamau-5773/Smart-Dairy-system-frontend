import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchMilkHistory } from '../../services/api'; // Adjust this path if your api.js is elsewhere

const AnimalMilkHistoryPage = () => {
  // IMPORTANT: The name inside the curly braces MUST match the parameter name
  // in your React Router route definition.
  // For example, if your route is defined as:
  // <Route path="/operations/animal/:animalIdentifier/milk-history" element={<AnimalMilkHistoryPage />} />
  // then you should use: const { animalIdentifier } = useParams();
  //
  // Based on your backend, `:cow_id_or_tag` is a good choice for consistency.
  const { cow_id_or_tag } = useParams();

  const [milkHistory, setMilkHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Safety check: If the parameter is undefined, don't make the API call.
    // This is likely the check that was silently aborting your request.
    if (!cow_id_or_tag) {
      console.warn('Animal identifier (cow_id_or_tag) is missing from URL parameters. Skipping API call.');
      setLoading(false);
      return;
    }

    const getMilkHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        // Pass the extracted identifier directly to your API service function.
        const data = await fetchMilkHistory(cow_id_or_tag);
        setMilkHistory(data);
      } catch (err) {
        console.error('Failed to fetch milk history:', err);
        setError('Failed to load milk history. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    getMilkHistory();
  }, [cow_id_or_tag]); // Re-run effect if the animal identifier changes

  if (loading) return <div className="text-center py-4">Loading milk history...</div>;
  if (error) return <div className="text-red-500 text-center py-4">Error: {error}</div>;
  if (!milkHistory || milkHistory.length === 0) return <div className="text-center py-4">No milk history found for {cow_id_or_tag}.</div>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Milk History for {cow_id_or_tag}</h2>
      {/* Example: Displaying data in a simple table */}
      <table className="min-w-full bg-white border border-gray-300">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b">Date</th>
            <th className="py-2 px-4 border-b">Amount (L)</th>
            <th className="py-2 px-4 border-b">Notes</th>
          </tr>
        </thead>
        <tbody>
          {milkHistory.map((record, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="py-2 px-4 border-b">{new Date(record.date).toLocaleDateString()}</td>
              <td className="py-2 px-4 border-b">{record.amount}</td>
              <td className="py-2 px-4 border-b">{record.notes || 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AnimalMilkHistoryPage;