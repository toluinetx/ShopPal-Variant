// REQUEST ->> HEADER ->> Authorization
// Same as authorization.middleware, but additionally requires the JWT to carry `role: 'admin'`.
// Used to gate admin-only mutations (e.g. product price/stock updates) so a regular
// shopper's access token can never be used to call them.
import jwt, { JwtPayload } from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { HttpStatusCode } from '@/shared/types/enums/httpcode.types';

import { JWTHelper } from '@/shared/utils/helpers';

const adminAuthorizationMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try
    {
        const accessToken = req.headers.authorization?.split(' ')[1];

        if (!accessToken) {
            res.status(HttpStatusCode.UNAUTHORIZED).json({error: 'Unauthorized'});
            return;
        }

       const decodedData = JWTHelper.verifyToken(accessToken) as JwtPayload;

       if (decodedData.role !== 'admin') {
            res.status(HttpStatusCode.FORBIDDEN).json({error: 'Forbidden'});
            return;
       }

       req.jwtDecodedPayload = {user_id: decodedData.user_id, email: decodedData.email, username: decodedData.username, role: 'admin'};

       next();
    }
    catch (error)
    {
        res.status(HttpStatusCode.UNAUTHORIZED).json({error: 'Unauthorized'});
    }
}

export default adminAuthorizationMiddleware;
