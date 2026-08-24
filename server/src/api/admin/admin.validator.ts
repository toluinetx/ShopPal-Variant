import { Schema } from 'express-validator';

export const loginByUsernameSchema: Schema = {
    username: {
        in: ['body'],
        notEmpty: {
            errorMessage: 'Username is required!',
        },
        isString: true,
        trim: true,
        toLowerCase: true,
    },
    password: {
        in: ['body'],
        notEmpty: {
            errorMessage: 'Password is required!',
        },
        isString: true,
        trim: true,
    },
};

export const loginByEmailSchema: Schema = {
    email: {
        in: ['body'],
        notEmpty: {
            errorMessage: 'Email is required!',
        },
        isEmail: {
            errorMessage: 'Invalid email!',
        },
        isString: true,
        trim: true,
        toLowerCase: true,
    },
    password: {
        in: ['body'],
        notEmpty: {
            errorMessage: 'Password is required!',
        },
        isString: true,
        trim: true,
    },
};
