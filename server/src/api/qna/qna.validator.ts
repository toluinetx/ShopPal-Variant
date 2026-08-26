import { Schema } from 'express-validator';

export const listQuestionsSchema: Schema = {
    product_id: { in: ['params'], notEmpty: true, isUUID: true },
    limit: { in: ['query'], optional: true, isInt: { options: { min: 1, max: 100 } }, toInt: true },
    offset: { in: ['query'], optional: true, isInt: { options: { min: 0 } }, toInt: true },
};

export const askQuestionSchema: Schema = {
    product_id: { in: ['params'], notEmpty: true, isUUID: true },
    body: {
        in: ['body'],
        notEmpty: { errorMessage: 'body is required' },
        isLength: { options: { min: 5, max: 500 } },
    },
};

export const answerQuestionSchema: Schema = {
    question_id: { in: ['params'], notEmpty: true, isUUID: true },
    body: {
        in: ['body'],
        notEmpty: { errorMessage: 'body is required' },
        isLength: { options: { min: 2, max: 1000 } },
    },
};

export const deleteQuestionSchema: Schema = {
    question_id: { in: ['params'], notEmpty: true, isUUID: true },
};
