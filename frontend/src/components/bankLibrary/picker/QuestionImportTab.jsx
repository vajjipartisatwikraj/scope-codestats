import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Button } from '../../ui';
import { useAuth } from '../../../contexts/AuthContext';
import * as api from '../api/bankLibraryApi';
import { apiMessage } from '../model/bankLibrary';
import BankPicker from './BankPicker';
import './picker.css';

/**
 * QuestionImportTab: the "Import" tab of the cohort question form. Find a question by bank, topic
 * and question, press the button, and the form fills itself with it, ready to change before it is
 * saved. Nothing is saved here.
 *
 *   onImport(question)   called with the question exactly as the library keeps it
 */
export default function QuestionImportTab({ onImport }) {
  const { token } = useAuth();
  const [choice, setChoice] = useState(null);
  const [loading, setLoading] = useState(false);

  const use = async () => {
    if (!choice) return;
    setLoading(true);
    try {
      const question = await api.getQuestion(token, choice.bankId, choice.topicId, choice.questionId);
      onImport(question);
    } catch (error) {
      toast.error(apiMessage(error, 'Could not load that question'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="blp-tab">
      <p className="blp-tab__intro">Pick a bank, then a topic, then a question. It fills this form, and you can change it before you create it.</p>
      <BankPicker mode="question" onChange={setChoice} />
      <div className="blp-tab__actions">
        <Button type="button" variant="primary" onClick={use} loading={loading} disabled={!choice}>
          {choice ? `Use \u201c${choice.title}\u201d` : 'Use this question'}
        </Button>
      </div>
    </div>
  );
}
