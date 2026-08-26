import { AppDataSource } from '@/shared/db/pg.data-source';
import { UserNotification } from '@/shared/models/entities';

export const NotificationRepository = AppDataSource.getRepository(UserNotification).extend({
    async list(user_id: string, opts: { limit: number; offset: number; unread_only: boolean }) {
        const qb = this.createQueryBuilder('n').where('n.user_id = :user_id', { user_id });
        if (opts.unread_only) qb.andWhere('n.is_read = false');
        return qb
            .orderBy('n.created_at', 'DESC')
            .offset(opts.offset)
            .limit(opts.limit)
            .getMany();
    },

    async unreadCount(user_id: string): Promise<number> {
        return this.count({ where: { user_id, is_read: false } });
    },

    async create(payload: Partial<UserNotification>) {
        const entity = this.create(payload);
        return this.save(entity as UserNotification);
    },

    async markRead(notification_id: string, user_id: string) {
        return this.createQueryBuilder()
            .update(UserNotification)
            .set({ is_read: true })
            .where('notification_id = :notification_id AND user_id = :user_id', { notification_id, user_id })
            .execute();
    },

    async markAllRead(user_id: string) {
        return this.createQueryBuilder()
            .update(UserNotification)
            .set({ is_read: true })
            .where('user_id = :user_id', { user_id })
            .execute();
    },

    async delete(notification_id: string, user_id: string) {
        return this.createQueryBuilder()
            .delete()
            .from(UserNotification)
            .where('notification_id = :notification_id AND user_id = :user_id', { notification_id, user_id })
            .execute();
    },
});
