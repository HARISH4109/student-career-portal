// @vitest-environment jsdom
import type { StartTestResponseDto } from '@career-portal/shared-types';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TestTakingPage } from './TestTakingPage';

const mocks = vi.hoisted(() => ({
  start: vi.fn<(id: string, options: { onSuccess: (data: StartTestResponseDto) => void }) => void>(),
  autosave: vi.fn(),
  submit: vi.fn(),
  startError: false,
}));

vi.mock('../api/preparation-api', () => ({
  useStartTest: () => ({
    mutate: mocks.start, isPending: false, isError: mocks.startError,
    error: new Error('This test is closed'),
  }),
  useAutosaveAnswer: () => ({ mutate: mocks.autosave }),
  useSubmitTest: () => ({ mutate: mocks.submit, isPending: false, isError: false }),
}));

const now = new Date('2026-10-14T10:00:00Z');
const response: StartTestResponseDto = {
  attemptId: 'attempt-1', attemptToken: 'token', testId: 'test-1', title: 'Assessment',
  durationMinutes: 1, startedAt: now.toISOString(), sections: [],
  questions: [{
    id: 'question-1', sectionId: null, questionText: 'Choose the correct answer',
    options: ['First option', 'Second option'], marks: 1, orderIndex: 0,
    difficulty: 'easy', topic: null,
  }],
};

function renderAssessment(): void {
  render(
    <StrictMode>
      <MemoryRouter initialEntries={['/tests/test-1']}>
        <Routes><Route path="/tests/:id" element={<TestTakingPage />} /></Routes>
      </MemoryRouter>
    </StrictMode>,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.clearAllMocks();
  mocks.startError = false;
  mocks.start.mockImplementation((_id, options) => { options.onSuccess(response); });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Assessment failures and timer', () => {
  it('shows the start error instead of an endless loading screen', () => {
    mocks.startError = true;
    mocks.start.mockImplementation(() => {});
    renderAssessment();
    expect(screen.getByText('Unable to Start Test')).toBeTruthy();
    expect(screen.getByText('This test is closed')).toBeTruthy();
    expect(screen.queryByText('Initializing Assessment Session...')).toBeNull();
  });

  it('submits an already expired resumed attempt once', () => {
    mocks.start.mockImplementation((_id, options) => {
      options.onSuccess({ ...response, startedAt: new Date(now.getTime() - 120_000).toISOString() });
    });
    renderAssessment();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(mocks.submit).toHaveBeenCalledTimes(1);
  });

  it('uses the deadline after a background pause and submits the latest answer once', () => {
    renderAssessment();
    fireEvent.click(screen.getByText('Second option'));
    vi.setSystemTime(new Date(now.getTime() + 60_000));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(mocks.submit).toHaveBeenCalledTimes(1);
    expect(mocks.submit).toHaveBeenCalledWith({
      attemptId: 'attempt-1',
      data: {
        answers: [{ questionId: 'question-1', selectedIndex: 1, timeSpentSeconds: 0 }],
        timeSpentSeconds: 61,
      },
    }, expect.objectContaining({ onSuccess: expect.any(Function) as unknown, onSettled: expect.any(Function) as unknown }));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(mocks.submit).toHaveBeenCalledTimes(1);
  });

  it('prevents repeated manual submission while a request is in flight', () => {
    renderAssessment();
    fireEvent.click(screen.getByRole('button', { name: 'Submit Test' }));
    const submit = screen.getByRole('button', { name: 'Submit Now' });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(mocks.submit).toHaveBeenCalledTimes(1);
  });
});
