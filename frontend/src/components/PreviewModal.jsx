import React from "react";
import PropTypes from "prop-types";

/**
 * Modal that shows a preview of the parsed Excel rows before they are imported.
 * Expects `previewData` to be an object like:
 *   { questions: [{title, complexity, type, options, correct_answers, max_score, tags}], count: number }
 *
 * The parent component should control `show` and `onClose`.
 */
export default function PreviewModal({ show, previewData, onClose, onConfirm }) {
    if (!show) return null;

    const { questions = [], count = 0 } = previewData || {};

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div
                className="bg-white rounded-lg shadow-xl w-11/12 max-w-4xl max-h-[80vh] overflow-y-auto p-6"
                style={{ fontFamily: "Roboto, sans-serif" }}
            >
                <h2 className="text-2xl font-bold mb-4">Preview {count} Question(s)</h2>

                {/* Table header */}
                <table className="w-full table-auto border-collapse">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="border p-2 text-left">Title</th>
                            <th className="border p-2 text-left">Complexity</th>
                            <th className="border p-2 text-left">Type</th>
                            <th className="border p-2 text-left">Options</th>
                            <th className="border p-2 text-left">Correct Answers</th>
                            <th className="border p-2 text-left">Max Score</th>
                            <th className="border p-2 text-left">Tags</th>
                        </tr>
                    </thead>
                    <tbody>
                        {questions.map((q, idx) => (
                            <tr key={idx} className={idx % 2 ? "bg-gray-50" : ""}>
                                <td className="border p-2">{q.title}</td>
                                <td className="border p-2">{q.complexity}</td>
                                <td className="border p-2">{q.type}</td>
                                <td className="border p-2">
                                    {Array.isArray(q.options) ? q.options.join(", ") : q.options}
                                </td>
                                <td className="border p-2">
                                    {Array.isArray(q.correct_answers)
                                        ? q.correct_answers.join(", ")
                                        : q.correct_answers}
                                </td>
                                <td className="border p-2">{q.max_score}</td>
                                <td className="border p-2">
                                    {Array.isArray(q.tags) ? q.tags.join(", ") : q.tags}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Action buttons */}
                <div className="flex justify-end mt-6 space-x-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition"
                    >
                        Import Now
                    </button>
                </div>
            </div>
        </div>
    );
}

PreviewModal.propTypes = {
    show: PropTypes.bool.isRequired,
    previewData: PropTypes.object,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
};
