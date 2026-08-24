import { AppDataSource } from '@/shared/db/pg.data-source';
import { Admin } from '@/shared/models/entities';
import type { Nullable } from '@/shared/types/utils.types';

type AdminRepositoryType = {
    getAdminByCredentials: <TCredential extends keyof Pick<Admin, 'email' | 'username'>>(
        credential: TCredential,
        value: Admin[TCredential]
    ) => Promise<Nullable<Admin>>;
    getAdminById: (admin_id: string) => Promise<Nullable<Admin>>;
};

const AdminRepository: AdminRepositoryType = AppDataSource.getRepository(Admin).extend({
    getAdminByCredentials<TCredential extends keyof Pick<Admin, 'email' | 'username'>>(
        credential: TCredential,
        value: Admin[TCredential]
    ) {
        return AppDataSource.createQueryBuilder()
            .select('admin')
            .from(Admin, 'admin')
            .where(`admin.${credential} = :value`, { value: value })
            .getOne();
    },
    getAdminById: (admin_id: string) => {
        return AppDataSource.createQueryBuilder()
            .select('admin')
            .from(Admin, 'admin')
            .where('admin.user_id = :admin_id', { admin_id: admin_id })
            .getOne();
    },
});

export default AdminRepository;
