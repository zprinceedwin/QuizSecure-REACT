// src/pages/teacher/AddQuestionForm.jsx

import React, { useEffect, useState } from 'react';
import './addquestion.css';
import { toast } from 'react-toastify';

const AddQuestionForm = ({ onSave, question }) => {
  const [questionType, setQuestionType] = useState('multiple-choice');
  const [questionText, setQuestionText] = useState('');
  const [choices, setChoices] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [fillInAnswer, setFillInAnswer] = useState('');
  const [trueFalseAnswer, setTrueFalseAnswer] = useState('true');
  const [points, setPoints] = useState(1);
  const [showPreview, setShowPreview] = useState(false);

  // Load existing question (Edit mode)
  useEffect(() => {
    if (question) {
      setQuestionType(question.type || 'multiple-choice');
      setQuestionText(question.text || '');
      setChoices(question.choices || ['', '', '', '']);
      setCorrectAnswer(question.correctAnswer ?? null);
      setFillInAnswer(question.correctAnswer || '');
      setTrueFalseAnswer(question.correctAnswer || 'true');
      setCaseSensitive(question.caseSensitive || false);
      setPoints(question.points || 1);
    }
  }, [question]);

  const handleAddChoice = () => {
    if (choices.length < 6) {
      setChoices([...choices, '']);
    }
  };

  const handleRemoveChoice = (index) => {
    const newChoices = [...choices];
    newChoices.splice(index, 1);
    setChoices(newChoices);
    if (correctAnswer === index) {
      setCorrectAnswer(null);
    }
  };

  const handleChoiceChange = (index, value) => {
    const newChoices = [...choices];
    newChoices[index] = value;
    setChoices(newChoices);
  };

  const handleSave = () => {
    // 🧠 Validations
    if (!questionText.trim()) {
      toast.error("⚠️ Question text is required.");
      return;
    }

    if (questionType === 'multiple-choice') {
      if (choices.length < 2) {
        toast.error("⚠️ At least 2 choices are required.");
        return;
      }
      if (correctAnswer === null || !choices[correctAnswer]?.trim()) {
        toast.error("⚠️ You must select a valid correct answer.");
        return;
      }
    }

    if (questionType === 'fill-in-the-blank' && !fillInAnswer.trim()) {
      toast.error("⚠️ Please provide the correct answer for Fill in the Blanks.");
      return;
    }

    if (questionType === 'true-false' && !trueFalseAnswer) {
      toast.error("⚠️ Please select True or False.");
      return;
    }

    // ✅ Final payload
    const payload = {
      type: questionType,
      text: questionText.trim(),
      points,
      correctAnswer:
        questionType === 'fill-in-the-blank'
          ? fillInAnswer.trim()
          : questionType === 'true-false'
          ? trueFalseAnswer
          : correctAnswer,
      caseSensitive: questionType === 'fill-in-the-blank' ? caseSensitive : undefined,
      choices: questionType === 'multiple-choice' ? choices : undefined,
    };

    if (onSave) onSave(payload);

    toast.success("✅ Question saved!");

    // Reset
    setQuestionType('multiple-choice');
    setQuestionText('');
    setChoices(['', '', '', '']);
    setCorrectAnswer(null);
    setCaseSensitive(false);
    setFillInAnswer('');
    setTrueFalseAnswer('true');
    setPoints(1);
    setShowPreview(false);
  };

  return (
    <div className="question-form-wrapper">
      <h3>{question ? "Edit Question" : "Add New Question"}</h3>

      <div className="form-group">
        <label>Question Type</label>
        <select value={questionType} onChange={(e) => setQuestionType(e.target.value)}>
          <option value="multiple-choice">Multiple Choice</option>
          <option value="true-false">True or False</option>
          <option value="fill-in-the-blank">Fill in the Blanks</option>
        </select>
      </div>

      <div className="form-group">
        <label>Question Text</label>
        <textarea
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="Enter your question"
        />
      </div>

      {questionType === 'multiple-choice' && (
        <div className="form-group">
          <label>Choices</label>
          {choices.map((choice, index) => (
            <div className="choice-row" key={index}>
              <input
                type="text"
                value={choice}
                onChange={(e) => handleChoiceChange(index, e.target.value)}
                placeholder={`Choice ${index + 1}`}
              />
              <button
                onClick={() => setCorrectAnswer(index)}
                className={`mark-btn ${correctAnswer === index ? 'active' : ''}`}
              >
                ✔
              </button>
              {choices.length > 2 && (
                <button onClick={() => handleRemoveChoice(index)} className="delete-btn">✖</button>
              )}
            </div>
          ))}
          {choices.length < 6 && (
            <button onClick={handleAddChoice} className="add-choice-btn">+ Add Choice</button>
          )}
        </div>
      )}

      {questionType === 'true-false' && (
        <div className="form-group">
          <label>Correct Answer</label>
          <select value={trueFalseAnswer} onChange={(e) => setTrueFalseAnswer(e.target.value)}>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </div>
      )}

      {questionType === 'fill-in-the-blank' && (
        <>
          <div className="form-group">
            <label>Correct Answer</label>
            <input
              type="text"
              value={fillInAnswer}
              onChange={(e) => setFillInAnswer(e.target.value)}
              placeholder="Expected answer"
            />
          </div>
          <div className="form-group checkbox-group">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={() => setCaseSensitive(!caseSensitive)}
            />
            <label>Case Sensitive</label>
          </div>
        </>
      )}

      <div className="form-group">
        <label>Points (1–5)</label>
        <input
          type="number"
          min={1}
          max={5}
          value={points}
          onChange={(e) => setPoints(parseInt(e.target.value))}
        />
      </div>

      <div className="form-actions">
        <button onClick={() => setShowPreview(!showPreview)}>Preview</button>
        <button className="save-btn" onClick={handleSave}>
          {question ? "Update Question" : "Save Question"}
        </button>
      </div>

      {showPreview && (
        <div className="preview-box">
          <h4>Preview</h4>
          <p>{questionText}</p>
          {questionType === 'multiple-choice' && (
            <ul>
              {choices.map((c, i) => (
                <li key={i}>{c} {correctAnswer === i ? '(Correct)' : ''}</li>
              ))}
            </ul>
          )}
          {questionType === 'true-false' && <p>Correct Answer: {trueFalseAnswer}</p>}
          {questionType === 'fill-in-the-blank' && (
            <p>
              Correct Answer: {fillInAnswer} {caseSensitive ? '(Case Sensitive)' : ''}
            </p>
          )}
          <p>Points: {points}</p>
        </div>
      )}
    </div>
  );
};

export default AddQuestionForm;
