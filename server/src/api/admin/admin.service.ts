import bcrypt from 'bcryptjs';
import { Admin } from '@/shared/models/entities';
import AdminRepository from '@/api/admin/admin.repository';
import AppError from '@/shared/exceptions/app-error';
import { HttpStatusCode } from '@/shared/types/enums/httpcode.types';

class AdminService {
    public static async getAdmin(loginCredentials: Partial<Pick<Admin, 'email' | 'username'>>): Promise<Admin> {
        const admin = loginCredentials.email
            ? await AdminRepository.getAdminByCredentials('email', loginCredentials.email)
            : await AdminRepository.getAdminByCredentials('username', loginCredentials.username!);

        if (!admin) {
            throw new AppError("Admin doesn't exist with current login details", HttpStatusCode.NOT_FOUND, 'getAdmin');
        }

        return admin;
    }

    public static async getAdminById(admin_id: string): Promise<Admin> {
        const admin = await AdminRepository.getAdminById(admin_id);

        if (!admin) {
            throw new AppError('Could not find authorized admin', HttpStatusCode.NOT_FOUND, 'getAdminById');
        }

        return admin;
    }

    public static async ensurePasswordMatching(admin: Admin, password: string): Promise<void> {
        const isPasswordMatching = await bcrypt.compare(password, admin.password);

        if (!isPasswordMatching) {
            throw new AppError('Admin exists, but invalid credentials', HttpStatusCode.NOT_FOUND, 'passwordMatch');
        }
    }
}

export default AdminService;
