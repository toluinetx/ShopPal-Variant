import { Request, Response, NextFunction, CookieOptions } from 'express';
import jwt from 'jsonwebtoken';

import { HttpStatusCode } from '@/shared/types/enums/httpcode.types';
import { JWTHelper } from '@/shared/utils/helpers';
import { Admin } from '@/shared/models/entities';
import AppError from '@/shared/exceptions/app-error';
import AdminService from './admin.service';

const ADMIN_REFRESH_COOKIE_NAME = process.env.ADMIN_COOKIE_REFRESH_TOKEN_NAME || 'adminRefreshToken';

class AdminController {
    public static async login(req: Request, res: Response, next: NextFunction) {
        const loginCredentials = req.body as Partial<Admin>;
        const admin = await AdminService.getAdmin(loginCredentials);
        await AdminService.ensurePasswordMatching(admin, loginCredentials?.password!);

        const accessToken = JWTHelper.signAccessToken({ ...admin, role: 'admin' });
        const refreshToken = JWTHelper.signRefreshToken({ ...admin, role: 'admin' });
        const cookieOptions = AdminController.getSecuredHTTPOnlyCookieOptions();
        res.cookie(ADMIN_REFRESH_COOKIE_NAME, refreshToken, cookieOptions);

        const { password, ...adminWithoutPassword } = admin;
        res.status(HttpStatusCode.OK).json({ accessToken: accessToken, admin: adminWithoutPassword });
    }

    public static async logout(req: Request, res: Response, next: NextFunction) {
        res.clearCookie(ADMIN_REFRESH_COOKIE_NAME);

        res.status(HttpStatusCode.OK).json({ message: 'Admin logged out successfully' });
    }

    public static async refreshToken(req: Request, res: Response, next: NextFunction) {
        try {
            const refreshToken = req.cookies?.[ADMIN_REFRESH_COOKIE_NAME];

            if (!refreshToken) {
                throw new AppError('No refresh token found', HttpStatusCode.NOT_ACCEPTABLE, 'admin-refresh-token');
            }

            const decodedData = JWTHelper.verifyToken(refreshToken) as jwt.JwtPayload;
            const admin = await AdminService.getAdminById(decodedData.user_id);
            const newAccessToken = JWTHelper.signAccessToken({ ...admin, role: 'admin' });

            const { password, ...adminWithoutPassword } = admin;
            res.status(HttpStatusCode.OK).json({ accessToken: newAccessToken, admin: adminWithoutPassword });
        } catch (error) {
            throw new AppError('No refresh token found', HttpStatusCode.NOT_ACCEPTABLE, 'admin-refresh-token');
        }
    }

    private static getSecuredHTTPOnlyCookieOptions(): CookieOptions {
        return {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: parseInt(process.env.COOKIE_REFRESH_TOKEN_AGE!),
        };
    }
}

export default AdminController;
