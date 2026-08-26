import AppError from '@/shared/exceptions/app-error';
import { HttpStatusCode } from '@/shared/types/enums/httpcode.types';
import { QnaRepository } from './qna.repository';
import { emitEvent } from '@/shared/utils/notifier';

export class QnaService {
    static async list(product_id: string, limit: number, offset: number) {
        return QnaRepository.listForProduct(product_id, limit, offset);
    }

    static async ask(product_id: string, user_id: string, body: string) {
        const created = await QnaRepository.ask({ product_id, user_id, body });
        emitEvent({
            type: 'qna.question_asked',
            payload: { question_id: created.question_id, product_id, user_id },
        });
        return created;
    }

    static async answer(question_id: string, user_id: string, body: string, is_staff: boolean) {
        const question = await QnaRepository.findQuestionById(question_id);
        if (!question) throw new AppError('Question not found', HttpStatusCode.NOT_FOUND, 'answer');

        const answer = await QnaRepository.answer({ question_id, user_id, body, is_staff });
        emitEvent({
            type: 'qna.question_answered',
            payload: {
                question_id,
                product_id: question.product_id,
                question_user_id: question.user_id,
                answered_by: user_id,
            },
        });
        return { answer, question };
    }

    static async deleteQuestion(question_id: string, user_id: string) {
        const result = await QnaRepository.deleteQuestion(question_id, user_id);
        if (result.affected === 0) {
            throw new AppError('Question not found or not yours', HttpStatusCode.NOT_FOUND, 'delete-question');
        }
    }
}
