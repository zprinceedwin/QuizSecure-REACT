// src/pages/teacher/QuestionManagementPage.jsx

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import './question.css';
import AddQuestionForm from './AddQuestionForm';

const QuestionManagementPage = () => {
  const { paperCode } = useParams();
  const [questions, setQuestions] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);

  const handleAddOrUpdateQuestion = (newQuestion) => {
    if (editingIndex !== null) {
      // Update mode
      const updated = [...questions];
      updated[editingIndex] = newQuestion;
      setQuestions(updated);
      setEditingIndex(null);
    } else {
      // Add mode
      setQuestions([...questions, newQuestion]);
    }
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
  };

  const handleDelete = (index) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this question?");
    if (confirmDelete) {
      const updated = [...questions];
      updated.splice(index, 1);
      setQuestions(updated);
      if (editingIndex === index) {
        setEditingIndex(null);
      }
    }
  };

  return (
    <div className="question-wrapper">
      <div className="question-header">
        <h2>Manage Questions for: {paperCode}</h2>
      </div>

      {/* 💡 Add/Edit Form */}
      <AddQuestionForm
        onSave={handleAddOrUpdateQuestion}
        question={editingIndex !== null ? questions[editingIndex] : null}
      />

      {/* 🧾 Questions Table */}
      {questions.length === 0 ? (
        <div className="empty-state">No questions added yet for this quiz.</div>
      ) : (
        <table className="question-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Question</th>
              <th>Type</th>
              <th>Points</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{q.text}</td>
                <td>{q.type}</td>
                <td>{q.points}</td>
                <td>
                  <button className="edit-btn" onClick={() => handleEdit(index)}>Edit</button>
                  <button className="delete-btn" onClick={() => handleDelete(index)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default QuestionManagementPage;
