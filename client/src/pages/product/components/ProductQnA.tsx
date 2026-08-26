import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/shared/hooks/useAuth.hook';
import { useApi } from '@/shared/hooks/useApi.hook';
import { useMessages } from '@/shared/hooks/useMessages.hook';
import type { ProductQuestion } from '@/shared/types/entities.types';

type ProductQnAProps = { productId: string };

export function ProductQnA({ productId }: ProductQnAProps) {
    const { auth } = useAuth();
    const { qnaApi } = useApi();
    const { displayMessage } = useMessages();
    const [questions, setQuestions] = useState<ProductQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [askOpen, setAskOpen] = useState(false);
    const [askBody, setAskBody] = useState('');
    const [answering, setAnswering] = useState<string | null>(null);
    const [answerBody, setAnswerBody] = useState('');

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const res = await qnaApi.listForProduct(productId, 30, 0);
            setQuestions(res.questions ?? []);
        } catch {
            /* silent */
        } finally {
            setLoading(false);
        }
    }, [productId, qnaApi]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const submitQuestion = async () => {
        if (!askBody.trim()) return;
        try {
            await qnaApi.askQuestion(productId, askBody.trim());
            setAskBody('');
            setAskOpen(false);
            displayMessage({ message: 'Question posted', type: 'success' });
            await refresh();
        } catch {
            displayMessage({ message: 'Could not post question', type: 'error' });
        }
    };

    const submitAnswer = async (questionId: string) => {
        if (!answerBody.trim()) return;
        try {
            await qnaApi.answerQuestion(questionId, answerBody.trim());
            setAnswering(null);
            setAnswerBody('');
            await refresh();
        } catch {
            displayMessage({ message: 'Could not post answer', type: 'error' });
        }
    };

    return (
        <section id="qna" className="mt-10 border-t border-primary-100 pt-8">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Questions &amp; Answers</h2>
                {auth?.user ? (
                    <button
                        onClick={() => setAskOpen((o) => !o)}
                        className="rounded-md bg-primary-500 px-3 py-1.5 text-sm font-semibold text-white"
                    >
                        {askOpen ? 'Cancel' : 'Ask a question'}
                    </button>
                ) : (
                    <p className="text-sm text-text-700">Log in to ask a question.</p>
                )}
            </div>

            {askOpen && (
                <div className="mt-3 flex flex-col gap-2 rounded-md border border-primary-200 bg-primary-50 p-3">
                    <textarea
                        value={askBody}
                        onChange={(e) => setAskBody(e.target.value)}
                        rows={3}
                        maxLength={500}
                        placeholder="Type your question…"
                        className="w-full resize-y rounded-md border border-primary-200 px-3 py-2 text-sm"
                    />
                    <button
                        onClick={submitQuestion}
                        disabled={askBody.trim().length < 5}
                        className="self-end rounded-md bg-primary-500 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        Post question
                    </button>
                </div>
            )}

            {loading ? (
                <p className="mt-4 text-sm text-text-700">Loading questions…</p>
            ) : questions.length === 0 ? (
                <p className="mt-4 rounded-md border border-dashed border-primary-200 bg-primary-50 p-4 text-sm">
                    No questions yet. Be the first to ask!
                </p>
            ) : (
                <ul className="mt-4 flex flex-col gap-4">
                    {questions.map((q) => (
                        <li key={q.question_id} className="rounded-md border border-primary-100 bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <p className="text-xs uppercase tracking-wide text-primary-500">
                                        Q · {q.author?.username ?? 'anon'} ·{' '}
                                        {new Date(q.created_at).toLocaleDateString()}
                                    </p>
                                    <p className="mt-1 font-semibold">{q.body}</p>
                                </div>
                                {auth?.user && (
                                    <button
                                        onClick={() =>
                                            setAnswering(answering === q.question_id ? null : q.question_id)
                                        }
                                        className="rounded-md border border-primary-300 px-2 py-1 text-xs font-medium hover:bg-primary-50"
                                    >
                                        {answering === q.question_id ? 'Cancel' : 'Answer'}
                                    </button>
                                )}
                            </div>

                            {q.answers && q.answers.length > 0 && (
                                <ul className="mt-3 flex flex-col gap-2 border-l-2 border-primary-100 pl-4">
                                    {q.answers.map((a) => (
                                        <li key={a.answer_id} className="text-sm">
                                            <p className="text-xs text-text-700">
                                                {a.is_staff ? (
                                                    <span className="mr-1 rounded bg-primary-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                                                        Staff
                                                    </span>
                                                ) : null}
                                                A · {a.author?.username ?? 'anon'} ·{' '}
                                                {new Date(a.created_at).toLocaleDateString()}
                                            </p>
                                            <p>{a.body}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {answering === q.question_id && (
                                <div className="mt-3 flex flex-col gap-2">
                                    <textarea
                                        value={answerBody}
                                        onChange={(e) => setAnswerBody(e.target.value)}
                                        rows={2}
                                        placeholder="Write your answer…"
                                        className="w-full resize-y rounded-md border border-primary-200 px-3 py-2 text-sm"
                                    />
                                    <button
                                        onClick={() => submitAnswer(q.question_id)}
                                        disabled={answerBody.trim().length < 2}
                                        className="self-end rounded-md bg-primary-500 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
                                    >
                                        Post answer
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
