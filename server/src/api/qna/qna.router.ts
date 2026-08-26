import { Router } from 'express';
import { checkSchema } from 'express-validator';
import { authorizationMiddleware, validationMiddleware, tryCatchMiddleware } from '@/middlewares';
import { QnaController } from './qna.controller';
import {
    listQuestionsSchema,
    askQuestionSchema,
    answerQuestionSchema,
    deleteQuestionSchema,
} from './qna.validator';

const router = Router();

router.get(
    '/:product_id',
    checkSchema(listQuestionsSchema),
    validationMiddleware,
    tryCatchMiddleware(QnaController.list)
);

router.post(
    '/:product_id',
    authorizationMiddleware,
    checkSchema(askQuestionSchema),
    validationMiddleware,
    tryCatchMiddleware(QnaController.ask)
);

router.post(
    '/answer/:question_id',
    authorizationMiddleware,
    checkSchema(answerQuestionSchema),
    validationMiddleware,
    tryCatchMiddleware(QnaController.answer)
);

router.delete(
    '/:question_id',
    authorizationMiddleware,
    checkSchema(deleteQuestionSchema),
    validationMiddleware,
    tryCatchMiddleware(QnaController.deleteQuestion)
);

export default router;
