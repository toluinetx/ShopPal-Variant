import { Request, Response } from 'express';
import { HttpStatusCode } from '@/shared/types/enums/httpcode.types';
import { QnaService } from './qna.service';
import { NotificationService } from '@/api/notifications-inbox/notifications-inbox.service';
import { NotificationType } from '@/shared/models/entities';

export class QnaController {
    static async list(req: Request, res: Response) {
        const limit = Number((req.query as any).limit ?? 20);
        const offset = Number((req.query as any).offset ?? 0);
        const questions = await QnaService.list(req.params.product_id, limit, offset);
        res.status(HttpStatusCode.OK).json({ questions });
    }

    static async ask(req: Request, res: Response) {
        const user_id = req.jwtDecodedPayload!.user_id;
        const question = await QnaService.ask(req.params.product_id, user_id, req.body.body);
        res.status(HttpStatusCode.CREATED).json({ question });
    }

    static async answer(req: Request, res: Response) {
        const user_id = req.jwtDecodedPayload!.user_id;
        const is_staff = req.jwtDecodedPayload?.role === 'admin';
        const { answer, question } = await QnaService.answer(
            req.params.question_id,
            user_id,
            req.body.body,
            is_staff
        );

        // Deep chain: dispatch an in-app notification to the question author.
        if (question.user_id !== user_id) {
            await NotificationService.createForUser({
                user_id: question.user_id,
                type: NotificationType.QUESTION_ANSWERED,
                title: 'Your question has an answer',
                body: 'Someone answered your product question. Tap to read.',
                metadata: JSON.stringify({
                    product_id: question.product_id,
                    question_id: question.question_id,
                }),
                action_url: `/product/${question.product_id}#qna`,
            });
        }

        res.status(HttpStatusCode.CREATED).json({ answer });
    }

    static async deleteQuestion(req: Request, res: Response) {
        const user_id = req.jwtDecodedPayload!.user_id;
        await QnaService.deleteQuestion(req.params.question_id, user_id);
        res.status(HttpStatusCode.NO_CONTENT).send();
    }
}
